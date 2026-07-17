const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const REMINDER_TYPES = ["breakfast", "lunch", "dinner", "water", "exercise", "weight"];
const DEFAULT_TIMES = {
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "18:30",
  water: "10:00",
  exercise: "19:00",
  weight: "07:30"
};

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    const errMsg = String(error.errMsg || error.message || "");
    if (error.errCode === COLLECTION_NOT_EXIST_CODE || errMsg.indexOf("collection not exists") >= 0 || errMsg.indexOf("DATABASE_COLLECTION_NOT_EXIST") >= 0) {
      await db.createCollection(name);
      return;
    }
    throw error;
  }
}

function templateConfig() {
  try {
    const parsed = JSON.parse(process.env.REMINDER_TEMPLATE_CONFIG || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function chinaClock(date = new Date()) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${shifted.getUTCDate()}`.padStart(2, "0");
  const hour = `${shifted.getUTCHours()}`.padStart(2, "0");
  const minute = `${shifted.getUTCMinutes()}`.padStart(2, "0");
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function publicTemplate(type, config) {
  const item = config[type] || {};
  return {
    template_id: item.template_id || "",
    template_available: Boolean(item.template_id),
    long_term: item.long_term === true
  };
}

function publicSetting(item, config) {
  return Object.assign({
    reminder_type: item.reminder_type,
    enabled: item.enabled === true,
    reminder_time: item.reminder_time,
    authorization_status: item.authorization_status || "not_requested"
  }, publicTemplate(item.reminder_type, config));
}

async function getSettings(openid) {
  await ensureCollection("reminder_settings");
  const result = await db.collection("reminder_settings").where({ openid, deleted_at: null }).limit(20).get();
  const config = templateConfig();
  const map = {};
  result.data.forEach((item) => {
    map[item.reminder_type] = item;
  });
  return ok(REMINDER_TYPES.map((type) => publicSetting(Object.assign({
    reminder_type: type,
    enabled: false,
    reminder_time: DEFAULT_TIMES[type],
    authorization_status: "not_requested"
  }, map[type] || {}), config)));
}

async function saveSetting(event, openid) {
  await ensureCollection("users");
  await ensureCollection("reminder_settings");
  const type = event.reminder_type;
  const time = event.reminder_time;
  if (!REMINDER_TYPES.includes(type)) return fail("VALIDATION_ERROR", "提醒类型无效");
  if (!validTime(time)) return fail("VALIDATION_ERROR", "提醒时间格式无效");

  const users = await db.collection("users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const user = users.data[0];
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const existingResult = await db.collection("reminder_settings").where({ openid, reminder_type: type }).limit(1).get();
  const existing = existingResult.data[0] || null;
  const config = templateConfig();
  const itemConfig = config[type] || {};
  let requestedStatus = (existing && existing.authorization_status) || "not_requested";
  const enabled = event.enabled === true;
  if (event.subscription_accepted === true) requestedStatus = itemConfig.long_term ? "long_term" : "accept";

  if (enabled && !itemConfig.template_id) return fail("TEMPLATE_NOT_CONFIGURED", "该提醒的订阅消息模板尚未配置");
  if (enabled && requestedStatus !== "accept" && requestedStatus !== "long_term") {
    return fail("SUBSCRIBE_REQUIRED", "请先授权该提醒的订阅消息");
  }

  const now = new Date();
  const data = {
    user_id: user._id,
    openid,
    reminder_type: type,
    reminder_time: time,
    enabled,
    authorization_status: requestedStatus,
    template_id: itemConfig.template_id || "",
    updated_at: now,
    deleted_at: null
  };
  if (enabled && (!existing || existing.authorization_status !== data.authorization_status)) {
    data.authorized_at = now;
  }

  if (existing) {
    await db.collection("reminder_settings").doc(existing._id).update({ data });
    return ok(publicSetting(Object.assign({}, existing, data), config));
  }
  data.created_at = now;
  const result = await db.collection("reminder_settings").add({ data });
  return ok(publicSetting(Object.assign({ _id: result._id }, data), config));
}

function renderValue(value, setting, type) {
  return String(value || "")
    .replace(/\{\{time\}\}/g, setting.reminder_time)
    .replace(/\{\{type\}\}/g, type);
}

function messageData(itemConfig, setting) {
  const source = itemConfig.data || {};
  const result = {};
  Object.keys(source).forEach((key) => {
    result[key] = { value: renderValue(source[key], setting, setting.reminder_type) };
  });
  return result;
}

async function dispatchDue() {
  await ensureCollection("reminder_settings");
  await ensureCollection("users");
  const clock = chinaClock();
  const config = templateConfig();
  let sent = 0;
  let failed = 0;
  let checked = 0;

  for (let page = 0; page < 20; page += 1) {
    const result = await db.collection("reminder_settings")
      .where({ reminder_time: clock.time, deleted_at: null })
      .orderBy("_id", "asc")
      .skip(page * 1000)
      .limit(1000)
      .get();
    checked += result.data.length;
    for (let i = 0; i < result.data.length; i += 1) {
      const setting = result.data[i];
      const itemConfig = config[setting.reminder_type] || {};
      if (!setting.enabled || !itemConfig.template_id || setting.last_sent_date === clock.date) continue;
      try {
        const users = await db.collection("users").where({ openid: setting.openid, status: "active", deleted_at: null }).limit(1).get();
        if (!users.data.length) {
          await db.collection("reminder_settings").doc(setting._id).update({ data: { enabled: false, updated_at: new Date() } });
          continue;
        }
        let claimed = false;
        const attemptToken = crypto.randomBytes(16).toString("hex");
        await db.runTransaction(async (transaction) => {
          claimed = false;
          const reference = transaction.collection("reminder_settings").doc(setting._id);
          const currentResult = await reference.get();
          const current = currentResult.data;
          if (!current || !current.enabled || current.deleted_at || current.reminder_time !== clock.time) return;
          if (current.last_attempt_date === clock.date) {
            claimed = current.last_attempt_token === attemptToken;
            return;
          }
          await reference.update({ data: { last_attempt_date: clock.date, last_attempt_token: attemptToken, last_attempt_at: new Date(), updated_at: new Date() } });
          claimed = true;
        });
        if (!claimed) continue;
        await cloud.openapi.subscribeMessage.send({
          touser: setting.openid,
          page: itemConfig.page || "pages/home/index",
          templateId: itemConfig.template_id,
          miniprogramState: itemConfig.miniprogram_state || "formal",
          lang: "zh_CN",
          data: messageData(itemConfig, setting)
        });
        const update = { last_sent_date: clock.date, last_sent_at: new Date(), updated_at: new Date() };
        if (itemConfig.long_term !== true) {
          update.enabled = false;
          update.authorization_status = "consumed";
        }
        await db.collection("reminder_settings").doc(setting._id).update({ data: update });
        sent += 1;
      } catch (error) {
        failed += 1;
        await db.collection("reminder_settings").doc(setting._id).update({
          data: {
            last_error: String(error.errMsg || error.message || "发送失败").slice(0, 200),
            last_error_at: new Date(),
            updated_at: new Date()
          }
        });
      }
    }
    if (result.data.length < 1000) break;
  }
  return ok({ checked, sent, failed, date: clock.date, time: clock.time });
}

exports.main = async (event) => {
  const timerEvent = event && (event.Type === "Timer" || event.TriggerName === "reminder-dispatch");
  try {
    if (timerEvent) return await dispatchDue();
    const openid = cloud.getWXContext().OPENID;
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    const action = event.action || "get";
    if (action === "get") return await getSettings(openid);
    if (action === "save") return await saveSetting(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

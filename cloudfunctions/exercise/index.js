const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const TYPES = ["力量训练", "跑步", "快走", "骑行", "游泳", "跳绳", "瑜伽", "HIIT", "其他"];
const INTENSITIES = ["low", "medium", "high"];
const FACTORS = { low: 4, medium: 7, high: 10 };

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

async function ensureCollections() {
  await ensureCollection("users");
  await ensureCollection("exercise_records");
  await ensureCollection("checkin_records");
}

function formatDate(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

async function getUser(openid) {
  const result = await db.collection("users").where({ openid, deleted_at: null, status: "active" }).limit(1).get();
  return result.data[0] || null;
}

function validate(record) {
  const duration = Number(record.duration_min);
  const calories = record.calorie_burned === "" || record.calorie_burned === undefined ? null : Number(record.calorie_burned);
  if (!record.record_date) return "请选择日期";
  if (!TYPES.includes(record.exercise_type)) return "请选择运动类型";
  if (!record.exercise_name || !String(record.exercise_name).trim()) return "请填写运动名称";
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1440) return "运动时长必须大于 0 且不超过 1440 分钟";
  if (!INTENSITIES.includes(record.intensity)) return "请选择运动强度";
  if (calories !== null && (!Number.isFinite(calories) || calories < 0 || calories > 5000)) return "消耗热量需在 0-5000 kcal 之间";
  return "";
}

function estimateCalories(record) {
  const duration = Number(record.duration_min);
  if (record.calorie_burned !== "" && record.calorie_burned !== undefined && Number.isFinite(Number(record.calorie_burned))) {
    return round1(Number(record.calorie_burned));
  }
  return round1(duration * FACTORS[record.intensity]);
}

async function completeCheckin(user, openid, date) {
  const now = new Date();
  const existing = await db.collection("checkin_records").where({ openid, checkin_date: date, type: "exercise", deleted_at: null }).limit(1).get();
  const data = {
    user_id: user._id,
    openid,
    checkin_date: date,
    type: "exercise",
    status: "done",
    items: ["exercise"],
    updated_at: now,
    deleted_at: null
  };
  if (existing.data[0]) {
    await db.collection("checkin_records").doc(existing.data[0]._id).update({ data });
    return;
  }
  await db.collection("checkin_records").add({ data: Object.assign({}, data, { created_at: now }) });
}

async function list(event, openid) {
  const date = event.record_date || formatDate();
  const result = await db.collection("exercise_records").where({ openid, record_date: date, deleted_at: null }).orderBy("created_at", "asc").limit(100).get();
  return ok(result.data);
}

async function upsert(event, openid) {
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const record = event.record || {};
  const message = validate(record);
  if (message) return fail("VALIDATION_ERROR", message);

  const now = new Date();
  const data = {
    user_id: user._id,
    openid,
    record_date: record.record_date,
    exercise_type: record.exercise_type,
    exercise_name: String(record.exercise_name).trim(),
    duration_min: round1(Number(record.duration_min)),
    intensity: record.intensity,
    calorie_burned: estimateCalories(record),
    note: record.note || "",
    updated_at: now,
    deleted_at: null
  };

  if (record._id) {
    const existing = await db.collection("exercise_records").doc(record._id).get();
    if (existing.data.openid !== openid) return fail("FORBIDDEN", "无权编辑该记录");
    await db.collection("exercise_records").doc(record._id).update({ data });
    await completeCheckin(user, openid, data.record_date);
    return ok(Object.assign({}, existing.data, data));
  }

  const addData = Object.assign({}, data, { created_at: now });
  const addResult = await db.collection("exercise_records").add({ data: addData });
  await completeCheckin(user, openid, data.record_date);
  return ok(Object.assign({ _id: addResult._id }, addData));
}

async function remove(event, openid) {
  if (!event.record_id) return fail("VALIDATION_ERROR", "缺少记录 ID");
  const existing = await db.collection("exercise_records").doc(event.record_id).get();
  if (existing.data.openid !== openid) return fail("FORBIDDEN", "无权删除该记录");
  await db.collection("exercise_records").doc(event.record_id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
  return ok({ removed: true });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "list";
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "list") return await list(event, openid);
    if (action === "upsert") return await upsert(event, openid);
    if (action === "remove") return await remove(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

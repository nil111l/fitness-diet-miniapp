const cloud = require("wx-server-sdk");
const { weeklySummary, monthlySummary, evaluateDietInsights } = require("./lib");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

function businessError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.isBusinessError = true;
  return error;
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    const message = String(error.errMsg || error.message || "");
    if (error.errCode === COLLECTION_NOT_EXIST_CODE || message.includes("collection not exists") || message.includes("DATABASE_COLLECTION_NOT_EXIST")) {
      await db.createCollection(name);
      return;
    }
    throw error;
  }
}

async function ensureCollections() {
  const names = ["fitness_goals", "health_profiles", "diet_records", "exercise_records", "body_records", "checkin_records"];
  for (let index = 0; index < names.length; index += 1) await ensureCollection(names[index]);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function validMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ""));
}

async function requireUser(openid) {
  const result = await db.collection("users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const user = result.data[0] || null;
  if (!user) throw businessError("LOGIN_REQUIRED", "请先登录，或确认账号状态正常");
  return user;
}

async function queryAll(collection, where) {
  const records = [];
  const pageSize = 100;
  for (let page = 0; page < 100; page += 1) {
    const result = await db.collection(collection).where(where).skip(page * pageSize).limit(pageSize).get();
    records.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return records;
}

async function activeGoal(openid) {
  const result = await db.collection("fitness_goals").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const goal = result.data[0] || null;
  if (!goal) return null;
  return {
    goal_type: goal.goal_type,
    target_weight_kg: Number(goal.target_weight_kg || 0),
    daily_calorie_target: Number(goal.daily_calorie_target || 0),
    macro_targets: {
      protein_g: Number(goal.macro_targets && goal.macro_targets.protein_g || 0),
      carb_g: Number(goal.macro_targets && goal.macro_targets.carb_g || 0),
      fat_g: Number(goal.macro_targets && goal.macro_targets.fat_g || 0)
    }
  };
}

async function sourceData(openid) {
  const results = await Promise.all([
    queryAll("diet_records", { openid, deleted_at: null }),
    queryAll("exercise_records", { openid, deleted_at: null }),
    queryAll("body_records", { openid, deleted_at: null }),
    queryAll("checkin_records", { openid, deleted_at: null }),
    activeGoal(openid)
  ]);
  return { dietRecords: results[0], exerciseRecords: results[1], bodyRecords: results[2], checkinRecords: results[3], goal: results[4] };
}

async function weekly(openid) {
  const today = formatDate();
  const data = await sourceData(openid);
  return ok(weeklySummary(Object.assign({ today }, data)));
}

async function monthly(event, openid) {
  const currentMonth = formatDate().slice(0, 7);
  const month = validMonth(event.month) ? event.month : currentMonth;
  if (month > currentMonth) throw businessError("VALIDATION_ERROR", "暂不支持查看未来月份");
  const data = await sourceData(openid);
  return ok(monthlySummary(Object.assign({ month }, data)));
}

async function dietInsights(openid) {
  const today = formatDate();
  const results = await Promise.all([
    queryAll("diet_records", { openid, deleted_at: null }),
    activeGoal(openid)
  ]);
  const evaluated = evaluateDietInsights({ today, dietRecords: results[0], goal: results[1] });
  return ok(Object.assign({ today, disclaimer: "内容仅用于日常健康管理参考，不替代医疗建议。" }, evaluated));
}

async function targetProgress(openid) {
  const today = formatDate();
  const data = await sourceData(openid);
  const summary = weeklySummary(Object.assign({ today }, data));
  const profileResult = await db.collection("health_profiles").where({ openid, deleted_at: null }).limit(1).get();
  const bodyRecords = data.bodyRecords.slice().sort((left, right) => String(right.record_date || "").localeCompare(String(left.record_date || "")));
  const profile = profileResult.data[0] || {};
  const currentWeight = bodyRecords.length ? Number(bodyRecords[0].weight_kg || 0) : Number(profile.current_weight_kg || 0);
  const targetWeight = Number(data.goal && data.goal.target_weight_kg || 0);
  return ok({
    has_goal: Boolean(data.goal),
    goal: data.goal,
    current_weight_kg: currentWeight,
    target_weight_kg: targetWeight,
    weight_difference_kg: currentWeight && targetWeight ? Math.round((targetWeight - currentWeight) * 10) / 10 : null,
    week: {
      average_calorie: summary.average_calorie,
      diet_record_days: summary.diet_record_days,
      training_count: summary.training_count,
      exercise_record_days: summary.exercise_record_days
    }
  });
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const action = String(event.action || "weekly");
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await requireUser(openid);
    await ensureCollections();
    if (action === "weekly") return await weekly(openid);
    if (action === "monthly") return await monthly(event, openid);
    if (action === "dietInsights") return await dietInsights(openid);
    if (action === "targetProgress") return await targetProgress(openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    if (error.isBusinessError) return fail(error.code, error.message);
    console.error("insights function failed", error);
    return fail("INTERNAL_ERROR", "服务暂时不可用，请稍后重试");
  }
};

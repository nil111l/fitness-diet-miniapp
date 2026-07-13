const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

const GOAL_TYPES = ["lose_weight", "gain_muscle", "maintain"];
const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
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

async function ensureBaseCollections() {
  await ensureCollection("users");
  await ensureCollection("health_profiles");
  await ensureCollection("fitness_goals");
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

async function getUser(openid) {
  const result = await db.collection("users").where({
    openid,
    deleted_at: null,
    status: "active"
  }).limit(1).get();
  return result.data[0] || null;
}

async function getProfile(openid) {
  const result = await db.collection("health_profiles").where({
    openid,
    deleted_at: null
  }).limit(1).get();
  return result.data[0] || null;
}

async function getGoal(openid) {
  const result = await db.collection("fitness_goals").where({
    openid,
    deleted_at: null,
    status: "active"
  }).limit(1).get();
  return result.data[0] || null;
}

function calculateTargets(profile, goal) {
  const weight = Number(profile.current_weight_kg);
  const height = Number(profile.height_cm);
  const age = Number(profile.age);
  const genderOffset = profile.gender === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const tdee = bmr * ACTIVITY_FACTORS[profile.activity_level];

  let dailyCalories = tdee;
  if (goal.goal_type === "lose_weight") {
    dailyCalories = tdee - 400;
  }
  if (goal.goal_type === "gain_muscle") {
    dailyCalories = tdee + 300;
  }

  const minimumCalories = profile.gender === "female" ? 1200 : 1500;
  dailyCalories = Math.max(Math.round(dailyCalories), minimumCalories);

  const proteinCalories = dailyCalories * 0.25;
  const fatCalories = dailyCalories * 0.25;
  const carbCalories = dailyCalories - proteinCalories - fatCalories;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    daily_calorie_target: dailyCalories,
    macro_targets: {
      protein_g: Math.round(proteinCalories / 4),
      fat_g: Math.round(fatCalories / 9),
      carb_g: Math.round(carbCalories / 4)
    }
  };
}

function validateGoal(goal) {
  if (!goal.goal_type || !goal.target_weight_kg) {
    return "请完整填写目标";
  }

  if (!GOAL_TYPES.includes(goal.goal_type)) {
    return "健身目标参数错误";
  }

  const targetWeight = toNumber(goal.target_weight_kg);
  if (targetWeight === null || targetWeight < 30 || targetWeight > 250) {
    return "目标体重需在 30-250 kg 之间";
  }

  return "";
}

async function upsertGoal(event, openid) {
  const user = await getUser(openid);
  if (!user) {
    return fail("LOGIN_REQUIRED", "请先登录");
  }

  const profile = await getProfile(openid);
  if (!profile) {
    return fail("PROFILE_REQUIRED", "请先填写健康档案");
  }

  const goal = event.goal || {};
  const validationMessage = validateGoal(goal);
  if (validationMessage) {
    return fail("VALIDATION_ERROR", validationMessage);
  }

  const now = new Date();
  const targetWeight = toNumber(goal.target_weight_kg);
  const calculation = calculateTargets(profile, goal);
  const data = Object.assign({
    user_id: user._id,
    openid,
    goal_type: goal.goal_type,
    target_weight_kg: targetWeight,
    status: "active",
    start_date: now
  }, calculation);

  const existing = await getGoal(openid);

  if (existing) {
    await db.collection("fitness_goals").doc(existing._id).update({
      data: Object.assign({}, data, {
        updated_at: now
      })
    });
    return ok(Object.assign({}, existing, data, { updated_at: now }));
  }

  const addData = Object.assign({}, data, {
    created_at: now,
    updated_at: now,
    deleted_at: null
  });
  const addResult = await db.collection("fitness_goals").add({
    data: addData
  });

  return ok(Object.assign({ _id: addResult._id }, addData));
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "get";

  try {
    if (!openid) {
      return fail("LOGIN_REQUIRED", "无法识别微信身份");
    }

    await ensureBaseCollections();

    if (action === "get") {
      return ok(await getGoal(openid));
    }

    if (action === "upsert") {
      return await upsertGoal(event, openid);
    }

    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

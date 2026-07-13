const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

const GENDERS = ["male", "female"];
const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active"];
const GOAL_TYPES = ["lose_weight", "gain_muscle", "maintain"];

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

function getAgeFromBirthMonth(birthMonth) {
  if (!/^\d{4}-\d{2}$/.test(birthMonth || "")) {
    return null;
  }

  const [year, month] = birthMonth.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) {
    age -= 1;
  }
  return age;
}

function validateProfile(profile) {
  const requiredFields = ["gender", "birth_month", "height_cm", "current_weight_kg", "target_weight_kg", "activity_level", "goal_type"];
  const missingField = requiredFields.find((field) => profile[field] === undefined || profile[field] === null || profile[field] === "");

  if (missingField) {
    return "请完整填写必填项";
  }

  if (!GENDERS.includes(profile.gender)) {
    return "性别参数错误";
  }

  if (!ACTIVITY_LEVELS.includes(profile.activity_level)) {
    return "活动水平参数错误";
  }

  if (!GOAL_TYPES.includes(profile.goal_type)) {
    return "健身目标参数错误";
  }

  const age = getAgeFromBirthMonth(profile.birth_month);
  if (age === null || age < 10 || age > 80) {
    return "年龄需在 10-80 岁之间";
  }

  const height = toNumber(profile.height_cm);
  const currentWeight = toNumber(profile.current_weight_kg);
  const targetWeight = toNumber(profile.target_weight_kg);
  const waterTarget = profile.water_target_ml === "" || profile.water_target_ml === undefined ? null : toNumber(profile.water_target_ml);

  if (height === null || height < 100 || height > 230) {
    return "身高需在 100-230 cm 之间";
  }

  if (currentWeight === null || currentWeight < 30 || currentWeight > 250) {
    return "当前体重需在 30-250 kg 之间";
  }

  if (targetWeight === null || targetWeight < 30 || targetWeight > 250) {
    return "目标体重需在 30-250 kg 之间";
  }

  if (waterTarget !== null && (waterTarget < 500 || waterTarget > 6000)) {
    return "饮水目标需在 500-6000 ml 之间";
  }

  return "";
}

async function getUser(openid) {
  const result = await db.collection("users").where({
    openid,
    deleted_at: null,
    status: "active"
  }).limit(1).get();
  return result.data[0] || null;
}

function normalizeProfile(profile, user, openid) {
  return {
    user_id: user._id,
    openid,
    gender: profile.gender,
    birth_month: profile.birth_month,
    age: getAgeFromBirthMonth(profile.birth_month),
    height_cm: toNumber(profile.height_cm),
    current_weight_kg: toNumber(profile.current_weight_kg),
    target_weight_kg: toNumber(profile.target_weight_kg),
    activity_level: profile.activity_level,
    goal_type: profile.goal_type,
    diet_preference: profile.diet_preference || "",
    allergies: profile.allergies || "",
    water_target_ml: profile.water_target_ml === "" || profile.water_target_ml === undefined ? null : toNumber(profile.water_target_ml)
  };
}

async function getProfile(openid) {
  const result = await db.collection("health_profiles").where({
    openid,
    deleted_at: null
  }).limit(1).get();
  return result.data[0] || null;
}

async function upsertProfile(event, openid) {
  const user = await getUser(openid);
  if (!user) {
    return fail("LOGIN_REQUIRED", "请先登录");
  }

  const profile = event.profile || {};
  const validationMessage = validateProfile(profile);
  if (validationMessage) {
    return fail("VALIDATION_ERROR", validationMessage);
  }

  const now = new Date();
  const data = normalizeProfile(profile, user, openid);
  const existing = await getProfile(openid);

  if (existing) {
    await db.collection("health_profiles").doc(existing._id).update({
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
  const addResult = await db.collection("health_profiles").add({
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
      return ok(await getProfile(openid));
    }

    if (action === "upsert") {
      return await upsertProfile(event, openid);
    }

    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

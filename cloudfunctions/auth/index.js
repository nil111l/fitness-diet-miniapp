const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

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
  await ensureCollection("diet_records");
  await ensureCollection("exercise_records");
  await ensureCollection("body_records");
  await ensureCollection("checkin_records");
  await ensureCollection("foods");
  await ensureCollection("favorite_foods");
  await ensureCollection("diet_templates");
  await ensureCollection("reminder_settings");
}

async function getActiveRecord(collection, openid) {
  const result = await db.collection(collection).where({
    openid,
    deleted_at: null
  }).limit(1).get();
  return result.data[0] || null;
}

async function login(event) {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return fail("LOGIN_REQUIRED", "无法识别微信身份");
  }

  await ensureBaseCollections();

  const now = new Date();
  const userInfo = event.userInfo || {};
  const users = await db.collection("users").where({
    openid,
    deleted_at: null
  }).limit(20).get();

  const disabledUser = users.data.find((item) => item.status === "disabled");
  if (disabledUser) {
    return fail("ACCOUNT_DISABLED", "账号已被禁用，请联系管理员");
  }

  let user = users.data.find((item) => item.status === "active");

  if (!user) {
    const addResult = await db.collection("users").add({
      data: {
        openid,
        nick_name: userInfo.nickName || "",
        avatar_url: userInfo.avatarUrl || "",
        gender: userInfo.gender || "",
        status: "active",
        last_login_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    });

    user = {
      _id: addResult._id,
      openid,
      nick_name: userInfo.nickName || "",
      avatar_url: userInfo.avatarUrl || "",
      gender: userInfo.gender || "",
      status: "active"
    };
  } else {
    user.nick_name = userInfo.nickName || user.nick_name || "";
    user.avatar_url = userInfo.avatarUrl || user.avatar_url || "";
    user.gender = userInfo.gender || user.gender || "";
    await db.collection("users").doc(user._id).update({
      data: {
        nick_name: user.nick_name,
        avatar_url: user.avatar_url,
        gender: user.gender,
        last_login_at: now,
        updated_at: now
      }
    });
  }

  const profile = await getActiveRecord("health_profiles", openid);
  const goal = await getActiveRecord("fitness_goals", openid);

  return ok({
    user,
    profile,
    goal
  });
}

async function markUserDataDeleted(collection, openid, extraData = {}) {
  const now = new Date();
  const result = await db.collection(collection).where({
    openid,
    deleted_at: null
  }).limit(100).get();

  for (let i = 0; i < result.data.length; i += 1) {
    await db.collection(collection).doc(result.data[i]._id).update({
      data: Object.assign({
        deleted_at: now,
        updated_at: now
      }, extraData)
    });
  }
}

async function cancelAccount(event) {
  if (event.confirm !== true) {
    return fail("CONFIRM_REQUIRED", "请确认注销账号");
  }

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return fail("LOGIN_REQUIRED", "无法识别微信身份");
  }

  await ensureBaseCollections();
  const now = new Date();
  const users = await db.collection("users").where({
    openid,
    deleted_at: null
  }).limit(1).get();
  const user = users.data[0];
  if (!user) {
    return fail("NOT_FOUND", "账号不存在");
  }

  await db.collection("users").doc(user._id).update({
    data: {
      nick_name: "已注销用户",
      avatar_url: "",
      status: "cancelled",
      cancelled_at: now,
      updated_at: now
    }
  });

  await markUserDataDeleted("health_profiles", openid, { anonymized: true });
  await markUserDataDeleted("fitness_goals", openid, { anonymized: true });
  await markUserDataDeleted("diet_records", openid, { anonymized: true });
  await markUserDataDeleted("exercise_records", openid, { anonymized: true });
  await markUserDataDeleted("body_records", openid, { anonymized: true });
  await markUserDataDeleted("checkin_records", openid, { anonymized: true });
  await markUserDataDeleted("foods", openid, { status: "deleted", anonymized: true });
  await markUserDataDeleted("favorite_foods", openid, { anonymized: true });
  await markUserDataDeleted("diet_templates", openid, { anonymized: true });
  await markUserDataDeleted("reminder_settings", openid, { anonymized: true });

  return ok({ status: "cancelled" });
}

exports.main = async (event) => {
  const action = event.action || "login";

  try {
    if (action === "login") {
      return await login(event);
    }
    if (action === "cancelAccount") {
      return await cancelAccount(event);
    }

    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

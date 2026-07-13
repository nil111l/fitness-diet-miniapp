const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const TYPES = ["功能异常", "食物数据错误", "运动记录问题", "产品建议", "其他"];

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
  await ensureCollection("feedbacks");
}

async function getActiveUser(openid) {
  const result = await db.collection("users").where({
    openid,
    deleted_at: null,
    status: "active"
  }).limit(1).get();
  return result.data[0] || null;
}

async function submit(event, openid) {
  const user = await getActiveUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");

  const feedbackType = TYPES.indexOf(event.feedback_type) >= 0 ? event.feedback_type : "其他";
  const content = String(event.content || "").trim();
  const contact = String(event.contact || "").trim();
  const images = Array.isArray(event.images) ? event.images.slice(0, 3) : [];
  if (!content) return fail("VALIDATION_ERROR", "请填写反馈内容");
  if (content.length > 500) return fail("VALIDATION_ERROR", "反馈内容不能超过 500 字");

  const now = new Date();
  const data = {
    user_id: user._id,
    openid,
    feedback_type: feedbackType,
    content,
    images,
    contact,
    status: "pending",
    admin_reply: "",
    created_at: now,
    updated_at: now,
    processed_at: null,
    deleted_at: null
  };
  const result = await db.collection("feedbacks").add({ data });
  return ok(Object.assign({ _id: result._id }, data));
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "submit";

  try {
    await ensureCollections();
    if (action === "submit") return await submit(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

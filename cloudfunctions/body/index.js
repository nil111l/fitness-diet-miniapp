const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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

async function ensureCollections() {
  await ensureCollection("users");
  await ensureCollection("body_records");
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
  const weight = Number(record.weight_kg);
  const bodyFat = record.body_fat_rate === "" || record.body_fat_rate === undefined ? null : Number(record.body_fat_rate);
  if (!record.record_date) return "请选择日期";
  if (!Number.isFinite(weight) || weight < 30 || weight > 250) return "体重需在 30-250 kg 之间";
  if (bodyFat !== null && (!Number.isFinite(bodyFat) || bodyFat < 1 || bodyFat > 80)) return "体脂率需在 1-80% 之间";
  return "";
}

async function completeCheckin(user, openid, date) {
  const now = new Date();
  const existing = await db.collection("checkin_records").where({ openid, checkin_date: date, type: "weight", deleted_at: null }).limit(1).get();
  const data = {
    user_id: user._id,
    openid,
    checkin_date: date,
    type: "weight",
    status: "done",
    items: ["weight"],
    updated_at: now,
    deleted_at: null
  };
  if (existing.data[0]) {
    await db.collection("checkin_records").doc(existing.data[0]._id).update({ data });
    return;
  }
  await db.collection("checkin_records").add({ data: Object.assign({}, data, { created_at: now }) });
}

async function get(event, openid) {
  const date = event.record_date || formatDate();
  const result = await db.collection("body_records").where({ openid, record_date: date, deleted_at: null }).limit(1).get();
  return ok(result.data[0] || null);
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
    weight_kg: round1(Number(record.weight_kg)),
    body_fat_rate: record.body_fat_rate === "" || record.body_fat_rate === undefined ? null : round1(Number(record.body_fat_rate)),
    note: record.note || "",
    updated_at: now,
    deleted_at: null
  };
  const existing = await db.collection("body_records").where({ openid, record_date: data.record_date, deleted_at: null }).limit(1).get();
  if (existing.data[0]) {
    await db.collection("body_records").doc(existing.data[0]._id).update({ data });
    await completeCheckin(user, openid, data.record_date);
    return ok(Object.assign({}, existing.data[0], data));
  }
  const addData = Object.assign({}, data, { created_at: now });
  const addResult = await db.collection("body_records").add({ data: addData });
  await completeCheckin(user, openid, data.record_date);
  return ok(Object.assign({ _id: addResult._id }, addData));
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "get";
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "get") return await get(event, openid);
    if (action === "upsert") return await upsert(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

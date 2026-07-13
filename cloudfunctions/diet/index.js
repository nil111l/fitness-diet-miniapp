const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const MEALS = ["breakfast", "lunch", "dinner", "snack"];

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
  await ensureCollection("foods");
  await ensureCollection("diet_records");
  await ensureCollection("checkin_records");
}

async function getUser(openid) {
  const result = await db.collection("users").where({ openid, deleted_at: null, status: "active" }).limit(1).get();
  return result.data[0] || null;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function todayString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function yesterdayString() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function validateRecord(record) {
  const weight = Number(record.amount_g);
  if (!record.food_id) return "请选择食物";
  if (!MEALS.includes(record.meal_type)) return "请选择餐次";
  if (!Number.isFinite(weight) || weight <= 0 || weight > 5000) return "重量需在 0-5000g 之间";
  if (Math.round(weight * 10) !== weight * 10) return "重量最多支持一位小数";
  return "";
}

async function getFood(foodId, openid) {
  const result = await db.collection("foods").doc(foodId).get();
  const food = result.data;
  if (food.source === "custom" && food.openid !== openid) {
    throw new Error("无权访问该食物");
  }
  return food;
}

function buildRecordData(record, food, user, openid) {
  const amount = Number(record.amount_g);
  return {
    user_id: user._id,
    openid,
    record_date: record.record_date || todayString(),
    meal_type: record.meal_type,
    food_id: food._id,
    food_name: food.name,
    food_source: food.source,
    amount_g: round1(amount),
    calorie: round1(Number(food.calorie_per_100g) * amount / 100),
    protein: round1(Number(food.protein_per_100g) * amount / 100),
    carb: round1(Number(food.carb_per_100g) * amount / 100),
    fat: round1(Number(food.fat_per_100g) * amount / 100),
    calorie_per_100g: Number(food.calorie_per_100g),
    protein_per_100g: Number(food.protein_per_100g),
    carb_per_100g: Number(food.carb_per_100g),
    fat_per_100g: Number(food.fat_per_100g),
    note: record.note || ""
  };
}

async function completeDietCheckin(user, openid, date) {
  const now = new Date();
  const existing = await db.collection("checkin_records").where({ openid, checkin_date: date, type: "diet", deleted_at: null }).limit(1).get();
  const data = {
    user_id: user._id,
    openid,
    checkin_date: date,
    type: "diet",
    status: "done",
    items: ["diet"],
    updated_at: now,
    deleted_at: null
  };
  if (existing.data[0]) {
    await db.collection("checkin_records").doc(existing.data[0]._id).update({ data });
    return;
  }
  await db.collection("checkin_records").add({ data: Object.assign({}, data, { created_at: now }) });
}

async function upsertRecord(event, openid) {
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const record = event.record || {};
  const validationMessage = validateRecord(record);
  if (validationMessage) return fail("VALIDATION_ERROR", validationMessage);
  const food = await getFood(record.food_id, openid);
  const now = new Date();
  const data = Object.assign(buildRecordData(record, food, user, openid), { updated_at: now, deleted_at: null });

  if (record._id) {
    const existing = await db.collection("diet_records").doc(record._id).get();
    if (existing.data.openid !== openid) return fail("FORBIDDEN", "无权编辑该记录");
    await db.collection("diet_records").doc(record._id).update({ data });
    await completeDietCheckin(user, openid, data.record_date);
    return ok(Object.assign({}, existing.data, data));
  }

  const addData = Object.assign({}, data, { created_at: now });
  const addResult = await db.collection("diet_records").add({ data: addData });
  await completeDietCheckin(user, openid, data.record_date);
  return ok(Object.assign({ _id: addResult._id }, addData));
}

async function listRecords(event, openid) {
  const date = event.record_date || todayString();
  const result = await db.collection("diet_records").where({ openid, record_date: date, deleted_at: null }).orderBy("created_at", "asc").limit(100).get();
  return ok(result.data);
}

async function removeRecord(event, openid) {
  if (!event.record_id) return fail("VALIDATION_ERROR", "缺少记录 ID");
  const existing = await db.collection("diet_records").doc(event.record_id).get();
  if (existing.data.openid !== openid) return fail("FORBIDDEN", "无权删除该记录");
  await db.collection("diet_records").doc(event.record_id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
  return ok({ removed: true });
}

async function copyYesterday(event, openid) {
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const fromDate = event.from_date || yesterdayString();
  const toDate = event.to_date || todayString();
  const records = await db.collection("diet_records").where({ openid, record_date: fromDate, deleted_at: null }).limit(100).get();
  const now = new Date();
  const copied = [];
  for (let i = 0; i < records.data.length; i += 1) {
    const item = records.data[i];
    const data = {
      user_id: user._id,
      openid,
      record_date: toDate,
      meal_type: item.meal_type,
      food_id: item.food_id,
      food_name: item.food_name,
      food_source: item.food_source,
      amount_g: item.amount_g,
      calorie: item.calorie,
      protein: item.protein,
      carb: item.carb,
      fat: item.fat,
      calorie_per_100g: item.calorie_per_100g,
      protein_per_100g: item.protein_per_100g,
      carb_per_100g: item.carb_per_100g,
      fat_per_100g: item.fat_per_100g,
      note: item.note || "",
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    const addResult = await db.collection("diet_records").add({ data });
    copied.push(Object.assign({ _id: addResult._id }, data));
  }
  if (copied.length) await completeDietCheckin(user, openid, toDate);
  return ok({ count: copied.length, records: copied });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "list";

  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "list") return await listRecords(event, openid);
    if (action === "upsert") return await upsertRecord(event, openid);
    if (action === "remove") return await removeRecord(event, openid);
    if (action === "copyYesterday") return await copyYesterday(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

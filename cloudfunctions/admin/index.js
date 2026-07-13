const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
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
  const names = ["admin_users", "users", "food_categories", "foods", "feedbacks", "diet_records", "exercise_records", "body_records"];
  for (let i = 0; i < names.length; i += 1) {
    await ensureCollection(names[i]);
  }
}

async function getAdmin(openid) {
  const result = await db.collection("admin_users").where({
    openid,
    status: "active",
    deleted_at: null
  }).limit(1).get();
  return result.data[0] || null;
}

async function login(openid) {
  const admin = await getAdmin(openid);
  if (!admin) return fail("FORBIDDEN", "当前微信身份不是管理员");

  await db.collection("admin_users").doc(admin._id).update({
    data: { last_login_at: new Date(), updated_at: new Date() }
  });

  return ok({ admin });
}

async function assertAdmin(openid) {
  const admin = await getAdmin(openid);
  if (!admin) {
    const error = new Error("当前微信身份不是管理员");
    error.code = "FORBIDDEN";
    throw error;
  }
  return admin;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function todayString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function overview(openid) {
  await assertAdmin(openid);
  const range = todayRange();
  const today = todayString();
  const totalUsers = await db.collection("users").where({ deleted_at: null }).count();
  const newUsers = await db.collection("users").where({ created_at: _.gte(range.start).and(_.lt(range.end)), deleted_at: null }).count();
  const dietRecords = await db.collection("diet_records").where({ record_date: today, deleted_at: null }).count();
  const exerciseRecords = await db.collection("exercise_records").where({ record_date: today, deleted_at: null }).count();
  const bodyRecords = await db.collection("body_records").where({ record_date: today, deleted_at: null }).count();
  const pendingFeedbacks = await db.collection("feedbacks").where({ status: "pending", deleted_at: null }).count();
  return ok({
    total_users: totalUsers.total,
    today_new_users: newUsers.total,
    today_diet_records: dietRecords.total,
    today_exercise_records: exerciseRecords.total,
    today_body_records: bodyRecords.total,
    pending_feedbacks: pendingFeedbacks.total
  });
}

async function listUsers(event, openid) {
  await assertAdmin(openid);
  const keyword = String(event.keyword || "").trim();
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.page_size) || 20, 1), 50);
  const result = await db.collection("users").where({ deleted_at: null }).orderBy("created_at", "desc").limit(100).get();
  const users = result.data
    .filter((item) => !keyword || String(item.nick_name || "").indexOf(keyword) >= 0 || String(item._id || "").indexOf(keyword) >= 0)
    .slice((page - 1) * pageSize, page * pageSize)
    .map((item) => ({
      _id: item._id,
      nick_name: item.nick_name || "未命名用户",
      avatar_url: item.avatar_url || "",
      status: item.status || "active",
      created_at: item.created_at,
      last_login_at: item.last_login_at
    }));
  return ok(users);
}

async function updateUserStatus(event, openid) {
  await assertAdmin(openid);
  const userId = event.user_id;
  const status = event.status;
  if (!userId || ["active", "disabled"].indexOf(status) < 0) return fail("VALIDATION_ERROR", "用户状态不正确");
  await db.collection("users").doc(userId).update({ data: { status, updated_at: new Date() } });
  return ok({ user_id: userId, status });
}

async function listCategories(openid) {
  await assertAdmin(openid);
  const result = await db.collection("food_categories").where({ deleted_at: null }).orderBy("sort_order", "asc").limit(100).get();
  return ok(result.data);
}

async function saveCategory(event, openid) {
  await assertAdmin(openid);
  const category = event.category || {};
  const name = String(category.name || "").trim();
  if (!name) return fail("VALIDATION_ERROR", "请填写分类名称");
  const now = new Date();
  const data = {
    name,
    sort_order: Number(category.sort_order || 0),
    status: category.status || "active",
    updated_at: now
  };
  if (category._id) {
    await db.collection("food_categories").doc(category._id).update({ data });
    return ok(Object.assign({ _id: category._id }, data));
  }
  const result = await db.collection("food_categories").add({ data: Object.assign(data, { created_at: now, deleted_at: null }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function deleteCategory(event, openid) {
  await assertAdmin(openid);
  if (!event.category_id) return fail("VALIDATION_ERROR", "缺少分类 ID");
  await db.collection("food_categories").doc(event.category_id).update({ data: { deleted_at: new Date(), status: "deleted" } });
  return ok({ category_id: event.category_id });
}

async function listFoods(event, openid) {
  await assertAdmin(openid);
  const keyword = String(event.keyword || "").trim();
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.page_size) || 20, 1), 50);
  const result = await db.collection("foods").where({ deleted_at: null }).orderBy("updated_at", "desc").limit(100).get();
  const foods = result.data
    .filter((item) => !keyword || String(item.name || "").indexOf(keyword) >= 0)
    .slice((page - 1) * pageSize, page * pageSize);
  return ok(foods);
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

async function saveFood(event, openid) {
  await assertAdmin(openid);
  const food = event.food || {};
  const name = String(food.name || "").trim();
  if (!name) return fail("VALIDATION_ERROR", "请填写食材名称");
  const now = new Date();
  const data = {
    name,
    category_id: food.category_id || "",
    source: "system",
    user_id: "",
    openid: "",
    calorie_per_100g: toNumber(food.calorie_per_100g),
    protein_per_100g: toNumber(food.protein_per_100g),
    carb_per_100g: toNumber(food.carb_per_100g),
    fat_per_100g: toNumber(food.fat_per_100g),
    status: food.status || "active",
    updated_at: now
  };
  if (food._id) {
    await db.collection("foods").doc(food._id).update({ data });
    return ok(Object.assign({ _id: food._id }, data));
  }
  const result = await db.collection("foods").add({ data: Object.assign(data, { created_at: now, deleted_at: null }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function updateFoodStatus(event, openid) {
  await assertAdmin(openid);
  const foodId = event.food_id;
  const status = event.status;
  if (!foodId || ["active", "inactive"].indexOf(status) < 0) return fail("VALIDATION_ERROR", "食材状态不正确");
  await db.collection("foods").doc(foodId).update({ data: { status, updated_at: new Date() } });
  return ok({ food_id: foodId, status });
}

async function deleteFood(event, openid) {
  await assertAdmin(openid);
  if (!event.food_id) return fail("VALIDATION_ERROR", "缺少食材 ID");
  await db.collection("foods").doc(event.food_id).update({ data: { deleted_at: new Date(), status: "deleted" } });
  return ok({ food_id: event.food_id });
}

async function listFeedbacks(event, openid) {
  await assertAdmin(openid);
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.page_size) || 20, 1), 50);
  const result = await db.collection("feedbacks").where({ deleted_at: null }).orderBy("created_at", "desc").limit(100).get();
  return ok(result.data.slice((page - 1) * pageSize, page * pageSize));
}

async function updateFeedback(event, openid) {
  await assertAdmin(openid);
  const feedbackId = event.feedback_id;
  const status = event.status;
  if (!feedbackId || ["pending", "processing", "resolved", "closed"].indexOf(status) < 0) return fail("VALIDATION_ERROR", "反馈状态不正确");
  await db.collection("feedbacks").doc(feedbackId).update({
    data: {
      status,
      admin_reply: String(event.admin_reply || ""),
      processed_at: status === "pending" ? null : new Date(),
      updated_at: new Date()
    }
  });
  return ok({ feedback_id: feedbackId, status });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "login";

  try {
    await ensureCollections();
    if (action === "login") return await login(openid);
    if (action === "overview") return await overview(openid);
    if (action === "listUsers") return await listUsers(event, openid);
    if (action === "updateUserStatus") return await updateUserStatus(event, openid);
    if (action === "listCategories") return await listCategories(openid);
    if (action === "saveCategory") return await saveCategory(event, openid);
    if (action === "deleteCategory") return await deleteCategory(event, openid);
    if (action === "listFoods") return await listFoods(event, openid);
    if (action === "saveFood") return await saveFood(event, openid);
    if (action === "updateFoodStatus") return await updateFoodStatus(event, openid);
    if (action === "deleteFood") return await deleteFood(event, openid);
    if (action === "listFeedbacks") return await listFeedbacks(event, openid);
    if (action === "updateFeedback") return await updateFeedback(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail(error.code || "INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

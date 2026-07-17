const cloud = require("wx-server-sdk");
const crypto = require("crypto");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const TEMPLATE_TYPES = MEALS.concat(["custom"]);

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
  await ensureCollection("favorite_foods");
  await ensureCollection("diet_templates");
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function pad(value) {
  return `${value}`.padStart(2, "0");
}

function formatDate(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function yesterdayString() {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return formatDate(date);
}

function pageParams(event, defaultSize = 20) {
  const page = Math.max(Number.parseInt(event.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(event.page_size, 10) || defaultSize, 1), 20);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function validDate(value) {
  const text = String(value || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function validAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= 5000 && Math.round(amount * 10) === amount * 10;
}

async function getUser(openid) {
  const result = await db.collection("users").where({ openid, deleted_at: null, status: "active" }).limit(1).get();
  return result.data[0] || null;
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
  if (!food || food.deleted_at || food.status === "deleted" || food.status === "inactive") {
    throw new Error("食物不存在或已下架");
  }
  if (food.source === "custom" && food.openid !== openid) {
    throw new Error("无权访问该食物");
  }
  return food;
}

function foodSnapshot(food) {
  return {
    food_id: food._id,
    food_name: food.name,
    food_source: food.source,
    calorie_per_100g: Number(food.calorie_per_100g || 0),
    protein_per_100g: Number(food.protein_per_100g || 0),
    carb_per_100g: Number(food.carb_per_100g || 0),
    fat_per_100g: Number(food.fat_per_100g || 0)
  };
}

function buildRecordData(record, food, user, openid) {
  const amount = Number(record.amount_g);
  return Object.assign(foodSnapshot(food), {
    user_id: user._id,
    openid,
    record_date: record.record_date || formatDate(),
    meal_type: record.meal_type,
    amount_g: round1(amount),
    calorie: round1(Number(food.calorie_per_100g) * amount / 100),
    protein: round1(Number(food.protein_per_100g) * amount / 100),
    carb: round1(Number(food.carb_per_100g) * amount / 100),
    fat: round1(Number(food.fat_per_100g) * amount / 100),
    note: String(record.note || "").slice(0, 100)
  });
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

async function removeDietCheckinIfEmpty(openid, date) {
  const records = await db.collection("diet_records").where({ openid, record_date: date, deleted_at: null }).limit(1).get();
  if (records.data.length) return;
  const checkins = await db.collection("checkin_records").where({ openid, checkin_date: date, type: "diet", deleted_at: null }).limit(10).get();
  for (let i = 0; i < checkins.data.length; i += 1) {
    await db.collection("checkin_records").doc(checkins.data[i]._id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
  }
}

async function upsertFavorite(user, openid, food, amount) {
  const now = new Date();
  const existing = await db.collection("favorite_foods").where({ openid, food_id: food._id }).limit(1).get();
  const data = Object.assign(foodSnapshot(food), {
    user_id: user._id,
    openid,
    default_amount_g: round1(Number(amount || 100)),
    last_used_at: now,
    updated_at: now,
    deleted_at: null
  });
  if (existing.data[0]) {
    data.use_count = Number(existing.data[0].use_count || 0) + 1;
    await db.collection("favorite_foods").doc(existing.data[0]._id).update({ data });
    return Object.assign({}, existing.data[0], data);
  }
  data.use_count = 1;
  data.created_at = now;
  const result = await db.collection("favorite_foods").add({ data });
  return Object.assign({ _id: result._id }, data);
}

async function createRecord(record, food, user, openid) {
  const now = new Date();
  const data = Object.assign(buildRecordData(record, food, user, openid), {
    created_at: now,
    updated_at: now,
    deleted_at: null
  });
  const result = await db.collection("diet_records").add({ data });
  await completeDietCheckin(user, openid, data.record_date);
  return Object.assign({ _id: result._id }, data);
}

async function createRecordsAtomically(entries, user, openid) {
  const now = new Date();
  const created = entries.map((entry) => {
    const data = Object.assign(buildRecordData(entry.record, entry.food, user, openid), {
      created_at: now,
      updated_at: now,
      deleted_at: null
    });
    return Object.assign({ _id: crypto.randomBytes(16).toString("hex") }, data);
  });
  const dates = {};
  created.forEach((item) => { dates[item.record_date] = true; });
  const checkins = [];
  const dateKeys = Object.keys(dates);
  for (let i = 0; i < dateKeys.length; i += 1) {
    const date = dateKeys[i];
    const result = await db.collection("checkin_records").where({ openid, checkin_date: date, type: "diet", deleted_at: null }).limit(1).get();
    const existing = result.data[0] || null;
    checkins.push({ date, existing, id: existing ? existing._id : crypto.randomBytes(16).toString("hex") });
  }
  await db.runTransaction(async (transaction) => {
    for (let i = 0; i < created.length; i += 1) {
      const item = created[i];
      const data = Object.assign({}, item);
      delete data._id;
      await transaction.set(db.collection("diet_records").doc(item._id), data);
    }
    for (let i = 0; i < checkins.length; i += 1) {
      const item = checkins[i];
      const data = {
        user_id: user._id,
        openid,
        checkin_date: item.date,
        type: "diet",
        status: "done",
        items: ["diet"],
        updated_at: now,
        deleted_at: null
      };
      if (item.existing) await transaction.update(db.collection("checkin_records").doc(item.existing._id), data);
      else await transaction.set(db.collection("checkin_records").doc(item.id), Object.assign({}, data, { created_at: now }));
    }
  });
  return created;
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
    if (existing.data.record_date !== data.record_date) await removeDietCheckinIfEmpty(openid, existing.data.record_date);
    if (event.add_to_favorites === true) await upsertFavorite(user, openid, food, data.amount_g);
    return ok(Object.assign({}, existing.data, data));
  }

  const created = await createRecord(record, food, user, openid);
  if (event.add_to_favorites === true) await upsertFavorite(user, openid, food, created.amount_g);
  return ok(created);
}

async function listRecords(event, openid) {
  const date = event.record_date || formatDate();
  const result = await db.collection("diet_records").where({ openid, record_date: date, deleted_at: null }).orderBy("created_at", "asc").limit(100).get();
  return ok(result.data);
}

async function removeRecord(event, openid) {
  if (!event.record_id) return fail("VALIDATION_ERROR", "缺少记录 ID");
  const existing = await db.collection("diet_records").doc(event.record_id).get();
  if (existing.data.openid !== openid) return fail("FORBIDDEN", "无权删除该记录");
  await db.collection("diet_records").doc(event.record_id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
  await removeDietCheckinIfEmpty(openid, existing.data.record_date);
  return ok({ removed: true });
}

async function copyYesterday(event, openid) {
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const fromDate = event.from_date || yesterdayString();
  const toDate = event.to_date || formatDate();
  if (!validDate(fromDate) || !validDate(toDate)) return fail("VALIDATION_ERROR", "记录日期无效");
  const records = await db.collection("diet_records").where({ openid, record_date: fromDate, deleted_at: null }).limit(100).get();
  const entries = [];
  for (let i = 0; i < records.data.length; i += 1) {
    const item = records.data[i];
    const food = await getFood(item.food_id, openid);
    entries.push({
      food,
      record: { food_id: item.food_id, amount_g: item.amount_g, meal_type: item.meal_type, record_date: toDate, note: item.note || "" }
    });
  }
  const copied = entries.length ? await createRecordsAtomically(entries, user, openid) : [];
  return ok({ count: copied.length, records: copied });
}

async function listFavorites(event, openid) {
  const params = pageParams(event);
  const result = await db.collection("favorite_foods")
    .where({ openid, deleted_at: null })
    .orderBy("last_used_at", "desc")
    .skip(params.skip)
    .limit(params.pageSize + 1)
    .get();
  return ok({
    items: result.data.slice(0, params.pageSize),
    page: params.page,
    page_size: params.pageSize,
    has_more: result.data.length > params.pageSize
  });
}

async function setFavorite(event, openid) {
  if (!event.food_id) return fail("VALIDATION_ERROR", "缺少食物 ID");
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const existing = await db.collection("favorite_foods").where({ openid, food_id: event.food_id }).limit(1).get();
  if (event.favorite === false) {
    if (existing.data[0]) {
      await db.collection("favorite_foods").doc(existing.data[0]._id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
    }
    return ok({ favorite: false });
  }
  const defaultAmount = event.default_amount_g === undefined ? 100 : event.default_amount_g;
  if (!validAmount(defaultAmount)) return fail("VALIDATION_ERROR", "常用重量需在 0-5000g 之间，且最多一位小数");
  const food = await getFood(event.food_id, openid);
  const favorite = await upsertFavorite(user, openid, food, defaultAmount);
  return ok({ favorite: true, item: favorite });
}

function recordToQuickFood(item) {
  return {
    _id: item.food_id,
    food_id: item.food_id,
    name: item.food_name,
    food_name: item.food_name,
    source: item.food_source,
    food_source: item.food_source,
    last_amount_g: Number(item.amount_g || item.default_amount_g || 100),
    calorie_per_100g: Number(item.calorie_per_100g || 0),
    protein_per_100g: Number(item.protein_per_100g || 0),
    carb_per_100g: Number(item.carb_per_100g || 0),
    fat_per_100g: Number(item.fat_per_100g || 0),
    last_meal_type: item.meal_type || "breakfast",
    last_record_date: item.record_date || ""
  };
}

async function recentFoods(event, openid) {
  const params = pageParams(event);
  const result = await db.collection("diet_records")
    .where({ openid, deleted_at: null })
    .orderBy("created_at", "desc")
    .limit(20)
    .get();
  const seen = {};
  const unique = [];
  result.data.forEach((item) => {
    if (!seen[item.food_id] && unique.length < 20) {
      seen[item.food_id] = true;
      unique.push(recordToQuickFood(item));
    }
  });
  const start = params.skip;
  return ok({
    items: unique.slice(start, start + params.pageSize),
    page: params.page,
    page_size: params.pageSize,
    has_more: unique.length > start + params.pageSize
  });
}

async function quickOptions(openid) {
  const favoritesResult = await listFavorites({ page: 1, page_size: 6 }, openid);
  const recentResult = await recentFoods({ page: 1, page_size: 6 }, openid);
  return ok({
    favorites: favoritesResult.data.items.map(recordToQuickFood),
    recent: recentResult.data.items
  });
}

async function saveTemplate(event, openid) {
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const template = event.template || {};
  const name = String(template.name || "").trim().slice(0, 20);
  const templateType = TEMPLATE_TYPES.includes(template.template_type) ? template.template_type : "custom";
  const defaultMealType = MEALS.includes(template.default_meal_type) ? template.default_meal_type : "breakfast";
  const recordIds = Array.isArray(template.record_ids) ? template.record_ids.slice(0, 50) : [];
  if (!name) return fail("VALIDATION_ERROR", "请填写模板名称");
  if (!recordIds.length) return fail("VALIDATION_ERROR", "请至少选择一条饮食记录");

  const items = [];
  const sourceMealTypes = {};
  for (let i = 0; i < recordIds.length; i += 1) {
    const result = await db.collection("diet_records").doc(recordIds[i]).get();
    const record = result.data;
    if (!record || record.openid !== openid || record.deleted_at) return fail("FORBIDDEN", "模板中包含无权访问的记录");
    sourceMealTypes[record.meal_type] = true;
    items.push({
      food_id: record.food_id,
      food_name: record.food_name,
      amount_g: Number(record.amount_g),
      meal_type: record.meal_type,
      note: record.note || ""
    });
  }
  if (Object.keys(sourceMealTypes).length > 1) return fail("VALIDATION_ERROR", "一次只能把同一餐次保存为模板");

  const now = new Date();
  const data = {
    user_id: user._id,
    openid,
    name,
    template_type: templateType,
    default_meal_type: defaultMealType,
    items,
    item_count: items.length,
    updated_at: now,
    deleted_at: null
  };
  if (template._id) {
    const existing = await db.collection("diet_templates").doc(template._id).get();
    if (!existing.data || existing.data.openid !== openid) return fail("FORBIDDEN", "无权编辑该模板");
    await db.collection("diet_templates").doc(template._id).update({ data });
    return ok(Object.assign({}, existing.data, data));
  }
  data.created_at = now;
  const result = await db.collection("diet_templates").add({ data });
  return ok(Object.assign({ _id: result._id }, data));
}

async function listTemplates(event, openid) {
  const params = pageParams(event, 10);
  const result = await db.collection("diet_templates")
    .where({ openid, deleted_at: null })
    .orderBy("updated_at", "desc")
    .skip(params.skip)
    .limit(params.pageSize + 1)
    .get();
  return ok({
    items: result.data.slice(0, params.pageSize),
    page: params.page,
    page_size: params.pageSize,
    has_more: result.data.length > params.pageSize
  });
}

async function removeTemplate(event, openid) {
  if (!event.template_id) return fail("VALIDATION_ERROR", "缺少模板 ID");
  const existing = await db.collection("diet_templates").doc(event.template_id).get();
  if (!existing.data || existing.data.openid !== openid) return fail("FORBIDDEN", "无权删除该模板");
  await db.collection("diet_templates").doc(event.template_id).update({ data: { deleted_at: new Date(), updated_at: new Date() } });
  return ok({ removed: true });
}

async function applyTemplate(event, openid) {
  if (!event.template_id) return fail("VALIDATION_ERROR", "缺少模板 ID");
  const user = await getUser(openid);
  if (!user) return fail("LOGIN_REQUIRED", "请先登录");
  const result = await db.collection("diet_templates").doc(event.template_id).get();
  const template = result.data;
  if (!template || template.openid !== openid || template.deleted_at) return fail("FORBIDDEN", "无权使用该模板");
  const mealType = MEALS.includes(event.meal_type) ? event.meal_type : template.default_meal_type;
  const recordDate = formatDate();
  const entries = [];
  for (let i = 0; i < template.items.length; i += 1) {
    const item = template.items[i];
    const food = await getFood(item.food_id, openid);
    entries.push({
      food,
      record: { food_id: item.food_id, amount_g: item.amount_g, meal_type: mealType, record_date: recordDate, note: item.note || "" }
    });
  }
  const created = entries.length ? await createRecordsAtomically(entries, user, openid) : [];
  return ok({ count: created.length, records: created });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "list";

  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "list") return await listRecords(event, openid);
    if (action === "upsert" || action === "quickAdd") return await upsertRecord(event, openid);
    if (action === "remove") return await removeRecord(event, openid);
    if (action === "copyYesterday") return await copyYesterday(event, openid);
    if (action === "favorites") return await listFavorites(event, openid);
    if (action === "setFavorite") return await setFavorite(event, openid);
    if (action === "recentFoods") return await recentFoods(event, openid);
    if (action === "quickOptions") return await quickOptions(openid);
    if (action === "saveTemplate") return await saveTemplate(event, openid);
    if (action === "templates") return await listTemplates(event, openid);
    if (action === "removeTemplate") return await removeTemplate(event, openid);
    if (action === "applyTemplate") return await applyTemplate(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

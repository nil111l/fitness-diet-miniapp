const cloud = require("wx-server-sdk");
const {
  ARTICLE_CATEGORIES,
  CORRECTION_TYPES,
  CORRECTION_STATUSES,
  buildDefaultArticles,
  validateArticlePayload,
  validateCorrectionPayload,
  isCorrectableFood,
  validateFoodUpdate
} = require("./lib");

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
  const names = ["health_articles", "food_corrections", "foods", "food_categories"];
  for (let index = 0; index < names.length; index += 1) await ensureCollection(names[index]);
}

async function requireUser(openid) {
  const result = await db.collection("users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const user = result.data[0] || null;
  if (!user) throw businessError("LOGIN_REQUIRED", "请先登录，或确认账号状态正常");
  return user;
}

async function requireAdmin(openid) {
  const result = await db.collection("admin_users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const admin = result.data[0] || null;
  if (!admin) throw businessError("FORBIDDEN", "当前微信身份不是管理员");
  return admin;
}

async function getDocument(collection, id) {
  if (!id) return null;
  try {
    const result = await db.collection(collection).doc(id).get();
    return result.data || null;
  } catch (error) {
    const message = String(error.errMsg || error.message || "");
    if (message.includes("does not exist") || message.includes("not found") || error.errCode === -502001) return null;
    throw error;
  }
}

async function queryAll(collection, where) {
  const records = [];
  const pageSize = 100;
  for (let page = 0; page < 50; page += 1) {
    const result = await db.collection(collection).where(where).skip(page * pageSize).limit(pageSize).get();
    records.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return records;
}

function pageParams(event, defaultSize = 10) {
  const page = Math.max(Number.parseInt(event.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(event.page_size, 10) || defaultSize, 1), 20);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function categoryLabel(value) {
  const item = ARTICLE_CATEGORIES.find((option) => option.value === value);
  return item ? item.label : "健康知识";
}

function correctionTypeLabel(value) {
  const item = CORRECTION_TYPES.find((option) => option.value === value);
  return item ? item.label : "其他";
}

function publicArticle(article, includeContent = false) {
  const data = {
    _id: article._id,
    title: article.title,
    summary: article.summary,
    category: article.category,
    category_text: categoryLabel(article.category),
    cover_url: article.cover_url || "",
    is_recommended: article.is_recommended === true,
    updated_at: article.updated_at || article.created_at || null
  };
  if (includeContent) data.content = article.content || [];
  return data;
}

function publicCorrection(item) {
  return {
    _id: item._id,
    food_id: item.food_id,
    food_name: item.food_name,
    correction_type: item.correction_type,
    correction_type_text: correctionTypeLabel(item.correction_type),
    description: item.description,
    suggested_value: item.suggested_value || "",
    status: item.status,
    admin_note: item.admin_note || "",
    applied_food_update: item.applied_food_update === true,
    created_at: item.created_at,
    processed_at: item.processed_at || null
  };
}

async function ensureDefaultArticles() {
  const existing = await db.collection("health_articles").where({ seed_source: "phase9-foundation" }).limit(100).get();
  const keys = new Set(existing.data.map((item) => item.seed_key));
  const now = new Date();
  const seeds = buildDefaultArticles();
  for (let index = 0; index < seeds.length; index += 1) {
    const item = seeds[index];
    if (keys.has(item.seed_key)) continue;
    const data = Object.assign({}, item, { created_by: "system", updated_by: "system", created_at: now, updated_at: now, deleted_at: null });
    delete data._id;
    await db.collection("health_articles").doc(item._id).set({ data });
  }
}

async function articleList(event) {
  const params = pageParams(event);
  const keyword = String(event.keyword || "").trim().slice(0, 40);
  const category = ARTICLE_CATEGORIES.some((item) => item.value === event.category) ? event.category : "";
  const articles = (await queryAll("health_articles", { status: "active", deleted_at: null }))
    .filter((item) => !category || item.category === category)
    .filter((item) => !keyword || String(item.title || "").includes(keyword) || String(item.summary || "").includes(keyword))
    .sort((left, right) => Number(right.is_recommended) - Number(left.is_recommended) || Number(left.sort_order || 0) - Number(right.sort_order || 0) || new Date(right.updated_at || 0) - new Date(left.updated_at || 0));
  return ok({ items: articles.slice(params.skip, params.skip + params.pageSize).map((item) => publicArticle(item)), page: params.page, page_size: params.pageSize, has_more: articles.length > params.skip + params.pageSize });
}

async function articleDetail(event) {
  const article = await getDocument("health_articles", event.article_id);
  if (!article || article.deleted_at || article.status !== "active") throw businessError("NOT_FOUND", "文章不存在或已下架");
  return ok(publicArticle(article, true));
}

async function recommendedArticles(event) {
  const limit = Math.min(Math.max(Number.parseInt(event.limit, 10) || 3, 1), 6);
  const articles = (await queryAll("health_articles", { status: "active", deleted_at: null }))
    .filter((item) => item.is_recommended === true)
    .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0) || new Date(right.updated_at || 0) - new Date(left.updated_at || 0));
  return ok(articles.slice(0, limit).map((item) => publicArticle(item)));
}

async function submitCorrection(event, openid) {
  const user = await requireUser(openid);
  const validation = validateCorrectionPayload(event.correction);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  const food = await getDocument("foods", validation.data.food_id);
  if (!isCorrectableFood(food)) {
    throw businessError("NOT_FOUND", "平台食材不存在或已下架");
  }
  const now = new Date();
  const data = Object.assign({}, validation.data, {
    user_id: user._id,
    openid,
    food_name: food.name,
    food_snapshot: {
      name: food.name,
      category_id: food.category_id || "",
      calorie_per_100g: Number(food.calorie_per_100g || 0),
      protein_per_100g: Number(food.protein_per_100g || 0),
      carb_per_100g: Number(food.carb_per_100g || 0),
      fat_per_100g: Number(food.fat_per_100g || 0)
    },
    status: "pending",
    admin_note: "",
    applied_food_update: false,
    processed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null
  });
  const result = await db.collection("food_corrections").add({ data });
  return ok(publicCorrection(Object.assign({ _id: result._id }, data)));
}

async function myCorrections(event, openid) {
  const params = pageParams(event);
  const records = (await queryAll("food_corrections", { openid, deleted_at: null })).sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  return ok({ items: records.slice(params.skip, params.skip + params.pageSize).map(publicCorrection), page: params.page, page_size: params.pageSize, has_more: records.length > params.skip + params.pageSize });
}

async function adminArticleList(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event);
  const keyword = String(event.keyword || "").trim().slice(0, 40);
  const records = (await queryAll("health_articles", { deleted_at: null }))
    .filter((item) => !keyword || String(item.title || "").includes(keyword))
    .sort((left, right) => new Date(right.updated_at || 0) - new Date(left.updated_at || 0));
  return ok({ items: records.slice(params.skip, params.skip + params.pageSize).map((item) => Object.assign(publicArticle(item), { status: item.status, sort_order: Number(item.sort_order || 0) })), page: params.page, page_size: params.pageSize, has_more: records.length > params.skip + params.pageSize });
}

async function adminArticleDetail(event, openid) {
  await requireAdmin(openid);
  const article = await getDocument("health_articles", event.article_id);
  if (!article || article.deleted_at) throw businessError("NOT_FOUND", "文章不存在");
  return ok(Object.assign(publicArticle(article, true), { status: article.status, sort_order: Number(article.sort_order || 0) }));
}

async function adminSaveArticle(event, openid) {
  const admin = await requireAdmin(openid);
  const validation = validateArticlePayload(event.article);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  const now = new Date();
  const data = Object.assign({}, validation.data, { updated_by: admin._id, updated_at: now, deleted_at: null });
  const articleId = event.article && event.article._id;
  if (articleId) {
    const existing = await getDocument("health_articles", articleId);
    if (!existing || existing.deleted_at) throw businessError("NOT_FOUND", "文章不存在");
    await db.collection("health_articles").doc(articleId).update({ data });
    return ok(Object.assign(publicArticle(Object.assign({}, existing, data), true), { status: data.status, sort_order: data.sort_order }));
  }
  const result = await db.collection("health_articles").add({ data: Object.assign({}, data, { created_by: admin._id, created_at: now }) });
  return ok(Object.assign(publicArticle(Object.assign({ _id: result._id }, data), true), { status: data.status, sort_order: data.sort_order }));
}

async function adminUpdateArticleStatus(event, openid) {
  const admin = await requireAdmin(openid);
  if (!event.article_id || !["active", "inactive"].includes(event.status)) throw businessError("VALIDATION_ERROR", "文章状态不正确");
  const article = await getDocument("health_articles", event.article_id);
  if (!article || article.deleted_at) throw businessError("NOT_FOUND", "文章不存在");
  await db.collection("health_articles").doc(article._id).update({ data: { status: event.status, updated_by: admin._id, updated_at: new Date() } });
  return ok({ article_id: article._id, status: event.status });
}

async function adminSetArticleRecommended(event, openid) {
  const admin = await requireAdmin(openid);
  const article = await getDocument("health_articles", event.article_id);
  if (!article || article.deleted_at) throw businessError("NOT_FOUND", "文章不存在");
  await db.collection("health_articles").doc(article._id).update({ data: { is_recommended: event.is_recommended === true, updated_by: admin._id, updated_at: new Date() } });
  return ok({ article_id: article._id, is_recommended: event.is_recommended === true });
}

async function adminCorrectionList(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event);
  const status = CORRECTION_STATUSES.includes(event.status) ? event.status : "";
  const records = (await queryAll("food_corrections", { deleted_at: null }))
    .filter((item) => !status || item.status === status)
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0));
  return ok({ items: records.slice(params.skip, params.skip + params.pageSize).map(publicCorrection), page: params.page, page_size: params.pageSize, has_more: records.length > params.skip + params.pageSize });
}

async function adminCorrectionDetail(event, openid) {
  await requireAdmin(openid);
  const correction = await getDocument("food_corrections", event.correction_id);
  if (!correction || correction.deleted_at) throw businessError("NOT_FOUND", "纠错记录不存在");
  const food = await getDocument("foods", correction.food_id);
  return ok(Object.assign(publicCorrection(correction), {
    food_snapshot: correction.food_snapshot,
    current_food: food && !food.deleted_at ? {
      _id: food._id,
      name: food.name,
      category_id: food.category_id || "",
      calorie_per_100g: Number(food.calorie_per_100g || 0),
      protein_per_100g: Number(food.protein_per_100g || 0),
      carb_per_100g: Number(food.carb_per_100g || 0),
      fat_per_100g: Number(food.fat_per_100g || 0)
    } : null
  }));
}

async function adminResolveCorrection(event, openid) {
  const admin = await requireAdmin(openid);
  if (!event.correction_id || !CORRECTION_STATUSES.includes(event.status)) throw businessError("VALIDATION_ERROR", "处理状态不正确");
  const correction = await getDocument("food_corrections", event.correction_id);
  if (!correction || correction.deleted_at) throw businessError("NOT_FOUND", "纠错记录不存在");
  const applyFoodUpdate = event.apply_food_update === true;
  if (applyFoodUpdate && event.status !== "resolved") throw businessError("VALIDATION_ERROR", "确认修改食材时，处理状态必须为已采纳");
  if (correction.applied_food_update === true && event.status !== "resolved") {
    throw businessError("VALIDATION_ERROR", "已同步修改食材的纠错不能改为其他状态");
  }
  let foodUpdate = null;
  if (applyFoodUpdate) {
    const food = await getDocument("foods", correction.food_id);
    if (!food || food.deleted_at || food.source !== "system") throw businessError("NOT_FOUND", "平台食材不存在");
    const validation = validateFoodUpdate(event.food);
    if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
    foodUpdate = validation.data;
    if (foodUpdate.category_id) {
      const category = await getDocument("food_categories", foodUpdate.category_id);
      if (!category || category.deleted_at) throw businessError("VALIDATION_ERROR", "所选食材分类不存在");
    }
  }
  const now = new Date();
  const correctionUpdate = {
    status: event.status,
    admin_note: String(event.admin_note || "").trim().slice(0, 500),
    applied_food_update: correction.applied_food_update === true || applyFoodUpdate,
    processed_by: event.status === "pending" ? null : admin._id,
    processed_at: event.status === "pending" ? null : now,
    updated_at: now
  };
  await db.runTransaction(async (transaction) => {
    if (foodUpdate) {
      await transaction.collection("foods").doc(correction.food_id).update({ data: Object.assign({}, foodUpdate, { updated_at: now }) });
      correctionUpdate.food_snapshot_after = foodUpdate;
    }
    await transaction.collection("food_corrections").doc(correction._id).update({ data: correctionUpdate });
  });
  return ok(publicCorrection(Object.assign({}, correction, correctionUpdate)));
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const action = String(event.action || "articleList");
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    if (action.startsWith("admin")) await requireAdmin(openid);
    else await requireUser(openid);
    await ensureCollections();
    await ensureDefaultArticles();
    if (action === "filters") return ok({ article_categories: ARTICLE_CATEGORIES, correction_types: CORRECTION_TYPES, correction_statuses: CORRECTION_STATUSES });
    if (action === "articleList") return await articleList(event);
    if (action === "articleDetail") return await articleDetail(event);
    if (action === "recommendedArticles") return await recommendedArticles(event);
    if (action === "submitCorrection") return await submitCorrection(event, openid);
    if (action === "myCorrections") return await myCorrections(event, openid);
    if (action === "adminArticleList") return await adminArticleList(event, openid);
    if (action === "adminArticleDetail") return await adminArticleDetail(event, openid);
    if (action === "adminSaveArticle") return await adminSaveArticle(event, openid);
    if (action === "adminUpdateArticleStatus") return await adminUpdateArticleStatus(event, openid);
    if (action === "adminSetArticleRecommended") return await adminSetArticleRecommended(event, openid);
    if (action === "adminCorrectionList") return await adminCorrectionList(event, openid);
    if (action === "adminCorrectionDetail") return await adminCorrectionDetail(event, openid);
    if (action === "adminResolveCorrection") return await adminResolveCorrection(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    if (error.isBusinessError) return fail(error.code, error.message);
    console.error("content function failed", error);
    return fail("INTERNAL_ERROR", "服务暂时不可用，请稍后重试");
  }
};

const cloud = require("wx-server-sdk");
const crypto = require("crypto");
const {
  MEAL_TYPES,
  round1,
  calculateNutrition,
  scaleRecipe,
  buildMealPlan,
  replaceMealForRange
} = require("./lib");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const GOAL_TYPES = ["lose_weight", "gain_muscle", "maintain"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const STATUSES = ["active", "inactive"];
const DEFAULT_TAGS = ["高蛋白", "低脂", "低碳"];

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

function businessError(code, message) {
  const error = new Error(message);
  error.code = code;
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
  const names = ["users", "fitness_goals", "foods", "recipes", "recipe_categories", "diet_records", "checkin_records", "admin_users"];
  for (let index = 0; index < names.length; index += 1) {
    await ensureCollection(names[index]);
  }
}

function pageParams(event, defaultSize = 10) {
  const page = Math.max(Number.parseInt(event.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(event.page_size, 10) || defaultSize, 1), 20);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function uniqueValues(value, allowed) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item) => allowed.includes(item))));
}

function validNumber(value, min, max, decimals = 1) {
  const number = Number(value);
  const multiplier = 10 ** decimals;
  return Number.isFinite(number) && number >= min && number <= max && Math.round(number * multiplier) === number * multiplier;
}

function validServings(value) {
  const servings = Number(value);
  return Number.isFinite(servings) && servings >= 0.5 && servings <= 5 && Math.round(servings * 2) === servings * 2;
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

async function queryAll(collection, where, orderField, orderDirection = "asc") {
  const items = [];
  const pageSize = 100;
  for (let page = 0; page < 50; page += 1) {
    let query = db.collection(collection).where(where);
    if (orderField) query = query.orderBy(orderField, orderDirection);
    const result = await query.skip(page * pageSize).limit(pageSize).get();
    items.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return items;
}

async function getUser(openid) {
  const result = await db.collection("users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  return result.data[0] || null;
}

async function requireUser(openid) {
  const user = await getUser(openid);
  if (!user) throw businessError("LOGIN_REQUIRED", "请先登录，或确认账号状态正常");
  return user;
}

async function requireAdmin(openid) {
  const result = await db.collection("admin_users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const admin = result.data[0] || null;
  if (!admin) throw businessError("FORBIDDEN", "当前微信身份不是管理员");
  return admin;
}

async function ensureDefaultTags() {
  const result = await db.collection("recipe_categories").where({ deleted_at: null }).limit(1).get();
  if (result.data.length) return;
  const now = new Date();
  for (let index = 0; index < DEFAULT_TAGS.length; index += 1) {
    await db.collection("recipe_categories").add({
      data: {
        name: DEFAULT_TAGS[index],
        sort_order: index + 1,
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    });
  }
}

function publicRecipe(recipe, includeDetail = false) {
  const item = {
    _id: recipe._id,
    name: recipe.name,
    intro: recipe.intro || "",
    cover_url: recipe.cover_url || "",
    goals: recipe.goals || [],
    meals: recipe.meals || [],
    tag_ids: recipe.tag_ids || [],
    tags: recipe.tags || [],
    calorie: Number(recipe.calorie || 0),
    protein: Number(recipe.protein || 0),
    carb: Number(recipe.carb || 0),
    fat: Number(recipe.fat || 0),
    prep_time_min: Number(recipe.prep_time_min || 0),
    difficulty: recipe.difficulty || "easy",
    is_recommended: Boolean(recipe.is_recommended)
  };
  if (includeDetail) {
    item.ingredients = (recipe.ingredients || []).map((ingredient) => ({
      food_id: ingredient.food_id,
      food_name: ingredient.food_name,
      amount_g: Number(ingredient.amount_g || 0)
    }));
    item.steps = recipe.steps || [];
  }
  return item;
}

async function listActiveRecipes() {
  return queryAll("recipes", { status: "active", deleted_at: null }, "updated_at", "desc");
}

async function listFilters(openid) {
  await requireUser(openid);
  await ensureDefaultTags();
  const tags = await queryAll("recipe_categories", { status: "active", deleted_at: null }, "sort_order", "asc");
  return ok({ tags: tags.map((item) => ({ _id: item._id, name: item.name })) });
}

async function listRecipes(event, openid) {
  await requireUser(openid);
  const params = pageParams(event);
  const goal = GOAL_TYPES.includes(event.goal) ? event.goal : "";
  const meal = MEAL_TYPES.includes(event.meal_type) ? event.meal_type : "";
  const tagId = cleanText(event.tag_id, 64);
  const recipes = (await listActiveRecipes())
    .filter((item) => !goal || (item.goals || []).includes(goal))
    .filter((item) => !meal || (item.meals || []).includes(meal))
    .filter((item) => !tagId || (item.tag_ids || []).includes(tagId))
    .sort((left, right) => Number(Boolean(right.is_recommended)) - Number(Boolean(left.is_recommended)) || new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  return ok({
    items: recipes.slice(params.skip, params.skip + params.pageSize).map((item) => publicRecipe(item)),
    page: params.page,
    page_size: params.pageSize,
    has_more: recipes.length > params.skip + params.pageSize
  });
}

async function getActiveRecipe(recipeId) {
  const recipe = await getDocument("recipes", recipeId);
  if (!recipe || recipe.deleted_at || recipe.status !== "active") throw businessError("NOT_FOUND", "食谱不存在或已下架");
  return recipe;
}

async function recipeDetail(event, openid) {
  await requireUser(openid);
  const recipe = await getActiveRecipe(event.recipe_id);
  return ok(publicRecipe(recipe, true));
}

function ingredientRecord(recipe, ingredient, mealType, servings, user, openid, now) {
  const amount = round1(Number(ingredient.amount_g || 0) * servings);
  return {
    user_id: user._id,
    openid,
    food_id: ingredient.food_id,
    food_name: ingredient.food_name,
    food_source: "system",
    calorie_per_100g: Number(ingredient.calorie_per_100g || 0),
    protein_per_100g: Number(ingredient.protein_per_100g || 0),
    carb_per_100g: Number(ingredient.carb_per_100g || 0),
    fat_per_100g: Number(ingredient.fat_per_100g || 0),
    record_date: formatDate(),
    meal_type: mealType,
    amount_g: amount,
    calorie: round1(Number(ingredient.calorie_per_100g || 0) * amount / 100),
    protein: round1(Number(ingredient.protein_per_100g || 0) * amount / 100),
    carb: round1(Number(ingredient.carb_per_100g || 0) * amount / 100),
    fat: round1(Number(ingredient.fat_per_100g || 0) * amount / 100),
    note: `来自食谱：${recipe.name}（${servings} 份）`,
    recipe_id: recipe._id,
    recipe_name: recipe.name,
    recipe_servings: servings,
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
}

async function assertRecipeFoodsActive(recipe) {
  const ingredients = recipe.ingredients || [];
  for (let index = 0; index < ingredients.length; index += 1) {
    const food = await getDocument("foods", ingredients[index].food_id);
    if (!food || food.source !== "system" || food.status !== "active" || food.deleted_at) {
      throw businessError("FOOD_UNAVAILABLE", `食材“${ingredients[index].food_name}”已下架，暂时无法加入`);
    }
  }
}

async function createDietRecords(recipeSelections, user, openid) {
  const now = new Date();
  const records = [];
  for (let index = 0; index < recipeSelections.length; index += 1) {
    const selection = recipeSelections[index];
    await assertRecipeFoodsActive(selection.recipe);
    (selection.recipe.ingredients || []).forEach((ingredient) => {
      records.push({
        _id: crypto.randomBytes(16).toString("hex"),
        data: ingredientRecord(selection.recipe, ingredient, selection.meal_type, selection.servings, user, openid, now)
      });
    });
  }
  if (!records.length) throw businessError("VALIDATION_ERROR", "食谱没有可加入的食材");
  if (records.length > 80) throw businessError("VALIDATION_ERROR", "一次加入的食材过多，请分餐加入");

  const today = formatDate();
  const checkinResult = await db.collection("checkin_records")
    .where({ openid, checkin_date: today, type: "diet", deleted_at: null })
    .limit(1)
    .get();
  const existingCheckin = checkinResult.data[0] || null;
  const checkinId = existingCheckin ? existingCheckin._id : crypto.randomBytes(16).toString("hex");

  await db.runTransaction(async (transaction) => {
    for (let index = 0; index < records.length; index += 1) {
      await transaction.set(db.collection("diet_records").doc(records[index]._id), records[index].data);
    }
    const checkin = {
      user_id: user._id,
      openid,
      checkin_date: today,
      type: "diet",
      status: "done",
      items: ["diet"],
      updated_at: now,
      deleted_at: null
    };
    if (existingCheckin) await transaction.update(db.collection("checkin_records").doc(checkinId), checkin);
    else await transaction.set(db.collection("checkin_records").doc(checkinId), Object.assign({}, checkin, { created_at: now }));
  });

  return {
    count: records.length,
    calorie: round1(records.reduce((sum, item) => sum + Number(item.data.calorie || 0), 0)),
    record_date: today
  };
}

async function addToMeal(event, openid) {
  const user = await requireUser(openid);
  if (!MEAL_TYPES.includes(event.meal_type)) return fail("VALIDATION_ERROR", "请选择正确的餐次");
  const servings = Number(event.servings || 1);
  if (!validServings(servings)) return fail("VALIDATION_ERROR", "份量需在 0.5-5 份之间，并按 0.5 份调整");
  const recipe = await getActiveRecipe(event.recipe_id);
  const result = await createDietRecords([{ recipe, meal_type: event.meal_type, servings }], user, openid);
  return ok(result);
}

function validatePlanOptions(event) {
  const goal = GOAL_TYPES.includes(event.goal) ? event.goal : "";
  const calorieMin = Number(event.calorie_min);
  const calorieMax = Number(event.calorie_max);
  if (!goal) throw businessError("VALIDATION_ERROR", "请选择健身目标");
  if (!Number.isFinite(calorieMin) || !Number.isFinite(calorieMax) || calorieMin < 800 || calorieMax > 5000 || calorieMin >= calorieMax) {
    throw businessError("VALIDATION_ERROR", "总热量区间需在 800-5000 kcal 内，且最低值小于最高值");
  }
  return { goal, calorieMin, calorieMax };
}

async function mealPlan(event, openid) {
  await requireUser(openid);
  const options = validatePlanOptions(event);
  const recipes = await listActiveRecipes();
  const plan = buildMealPlan(recipes, {
    goal: options.goal,
    calorie_min: options.calorieMin,
    calorie_max: options.calorieMax
  });
  if (!plan.complete) throw businessError("NO_PLAN", "当前食谱不足以组成完整的一日计划，请稍后再试");
  if (!plan.within_range) throw businessError("NO_PLAN", "当前食谱无法满足所选热量区间，请调整区间后再试");
  return ok({
    meals: plan.meals.map((item) => ({ meal_type: item.meal_type, recipe: publicRecipe(item.recipe) })),
    total: plan.total,
    within_range: plan.within_range,
    goal: options.goal,
    calorie_min: options.calorieMin,
    calorie_max: options.calorieMax
  });
}

async function replaceMeal(event, openid) {
  await requireUser(openid);
  const options = validatePlanOptions(event);
  if (!MEAL_TYPES.includes(event.meal_type)) return fail("VALIDATION_ERROR", "餐次参数错误");
  const selections = Array.isArray(event.selections) ? event.selections : [];
  const mealSet = new Set(selections.map((item) => item.meal_type));
  if (selections.length !== 4 || mealSet.size !== 4 || MEAL_TYPES.some((meal) => !mealSet.has(meal))) {
    return fail("VALIDATION_ERROR", "请先生成完整的一日计划");
  }
  let otherCalories = 0;
  for (let index = 0; index < selections.length; index += 1) {
    if (selections[index].meal_type === event.meal_type) continue;
    const selectedRecipe = await getActiveRecipe(selections[index].recipe_id);
    otherCalories += Number(selectedRecipe.calorie || 0);
  }
  const recipe = replaceMealForRange(await listActiveRecipes(), {
    goal: options.goal,
    meal_type: event.meal_type,
    calorie_min: options.calorieMin,
    calorie_max: options.calorieMax,
    other_calories: otherCalories,
    exclude_recipe_ids: selections.map((item) => item.recipe_id)
  });
  if (!recipe) throw businessError("NO_PLAN", "这个餐次暂时没有符合热量区间的其他食谱");
  return ok({
    meal_type: event.meal_type,
    recipe: publicRecipe(recipe),
    total_calorie: round1(otherCalories + Number(recipe.calorie || 0))
  });
}

async function addMealPlan(event, openid) {
  const user = await requireUser(openid);
  const selections = Array.isArray(event.selections) ? event.selections : [];
  const mealSet = new Set(selections.map((item) => item.meal_type));
  if (selections.length !== 4 || mealSet.size !== 4 || MEAL_TYPES.some((meal) => !mealSet.has(meal))) {
    return fail("VALIDATION_ERROR", "一日计划需要包含早餐、午餐、晚餐和加餐");
  }
  const resolved = [];
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    resolved.push({
      recipe: await getActiveRecipe(selection.recipe_id),
      meal_type: selection.meal_type,
      servings: 1
    });
  }
  return ok(await createDietRecords(resolved, user, openid));
}

async function adminList(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event);
  const keyword = cleanText(event.keyword, 40);
  const result = await queryAll("recipes", { deleted_at: null }, "updated_at", "desc");
  const recipes = result.filter((item) => !keyword || String(item.name || "").includes(keyword));
  return ok({
    items: recipes.slice(params.skip, params.skip + params.pageSize).map((item) => Object.assign(publicRecipe(item), { status: item.status })),
    page: params.page,
    page_size: params.pageSize,
    has_more: recipes.length > params.skip + params.pageSize
  });
}

async function adminDetail(event, openid) {
  await requireAdmin(openid);
  const recipe = await getDocument("recipes", event.recipe_id);
  if (!recipe || recipe.deleted_at) throw businessError("NOT_FOUND", "食谱不存在");
  return ok(Object.assign(publicRecipe(recipe, true), { status: recipe.status }));
}

async function adminFoodOptions(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event, 20);
  const keyword = cleanText(event.keyword, 40);
  const result = await queryAll("foods", { source: "system", status: "active", deleted_at: null }, "name", "asc");
  const foods = result.filter((item) => !keyword || String(item.name || "").includes(keyword));
  return ok({
    items: foods.slice(params.skip, params.skip + params.pageSize).map((item) => ({ _id: item._id, name: item.name })),
    page: params.page,
    page_size: params.pageSize,
    has_more: foods.length > params.skip + params.pageSize
  });
}

async function resolveTags(tagIds) {
  const uniqueIds = Array.from(new Set(Array.isArray(tagIds) ? tagIds.slice(0, 10) : []));
  const tags = [];
  for (let index = 0; index < uniqueIds.length; index += 1) {
    const tag = await getDocument("recipe_categories", uniqueIds[index]);
    if (!tag || tag.deleted_at || tag.status !== "active") throw businessError("VALIDATION_ERROR", "食谱包含无效标签");
    tags.push(tag);
  }
  return tags;
}

async function resolveIngredients(rawIngredients) {
  if (!Array.isArray(rawIngredients) || !rawIngredients.length || rawIngredients.length > 15) {
    throw businessError("VALIDATION_ERROR", "食材清单需包含 1-15 项");
  }
  const foodsById = {};
  const ingredients = [];
  for (let index = 0; index < rawIngredients.length; index += 1) {
    const item = rawIngredients[index];
    if (!item.food_id || !validNumber(item.amount_g, 0.1, 5000, 1)) throw businessError("VALIDATION_ERROR", "请正确填写食材和重量");
    const food = await getDocument("foods", item.food_id);
    if (!food || food.source !== "system" || food.status !== "active" || food.deleted_at) throw businessError("VALIDATION_ERROR", "食谱只能绑定已上架的平台食材");
    foodsById[food._id] = food;
    ingredients.push({
      food_id: food._id,
      food_name: food.name,
      amount_g: Number(item.amount_g),
      calorie_per_100g: Number(food.calorie_per_100g || 0),
      protein_per_100g: Number(food.protein_per_100g || 0),
      carb_per_100g: Number(food.carb_per_100g || 0),
      fat_per_100g: Number(food.fat_per_100g || 0)
    });
  }
  return { ingredients, nutrition: calculateNutrition(ingredients, foodsById) };
}

function validateCoverUrl(value) {
  const coverUrl = cleanText(value, 500);
  if (coverUrl && !coverUrl.startsWith("https://") && !coverUrl.startsWith("cloud://")) {
    throw businessError("VALIDATION_ERROR", "封面地址仅支持 https:// 或 cloud://");
  }
  return coverUrl;
}

async function adminSave(event, openid) {
  const admin = await requireAdmin(openid);
  const recipe = event.recipe || {};
  const name = cleanText(recipe.name, 40);
  const intro = cleanText(recipe.intro, 200);
  const goals = uniqueValues(recipe.goals, GOAL_TYPES);
  const meals = uniqueValues(recipe.meals, MEAL_TYPES);
  const steps = (Array.isArray(recipe.steps) ? recipe.steps : []).map((step) => cleanText(step, 300)).filter(Boolean).slice(0, 20);
  const prepTime = Number(recipe.prep_time_min);
  const difficulty = DIFFICULTIES.includes(recipe.difficulty) ? recipe.difficulty : "";
  if (!name) return fail("VALIDATION_ERROR", "请填写食谱名称");
  if (!intro) return fail("VALIDATION_ERROR", "请填写食谱简介");
  if (!goals.length || !meals.length) return fail("VALIDATION_ERROR", "请至少选择一个目标和餐次");
  if (!steps.length) return fail("VALIDATION_ERROR", "请至少填写一个制作步骤");
  if (!Number.isInteger(prepTime) || prepTime < 1 || prepTime > 600) return fail("VALIDATION_ERROR", "制作时间需在 1-600 分钟之间");
  if (!difficulty) return fail("VALIDATION_ERROR", "请选择难度");
  const status = STATUSES.includes(recipe.status) ? recipe.status : "inactive";
  const tags = await resolveTags(recipe.tag_ids);
  if (!tags.length) return fail("VALIDATION_ERROR", "请至少选择一个标签");
  const resolved = await resolveIngredients(recipe.ingredients);
  const now = new Date();
  const data = Object.assign({
    name,
    intro,
    cover_url: validateCoverUrl(recipe.cover_url),
    goals,
    meals,
    tag_ids: tags.map((item) => item._id),
    tags: tags.map((item) => item.name),
    ingredients: resolved.ingredients,
    steps,
    prep_time_min: prepTime,
    difficulty,
    status,
    is_recommended: Boolean(recipe.is_recommended),
    base_servings: 1,
    updated_by: admin._id,
    updated_at: now,
    deleted_at: null
  }, resolved.nutrition);
  if (recipe._id) {
    const existing = await getDocument("recipes", recipe._id);
    if (!existing || existing.deleted_at) return fail("NOT_FOUND", "食谱不存在");
    await db.collection("recipes").doc(recipe._id).update({ data });
    return ok(Object.assign({}, existing, data));
  }
  const result = await db.collection("recipes").add({ data: Object.assign({}, data, { created_by: admin._id, created_at: now }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function adminUpdateStatus(event, openid) {
  await requireAdmin(openid);
  if (!event.recipe_id || !STATUSES.includes(event.status)) return fail("VALIDATION_ERROR", "食谱状态不正确");
  const recipe = await getDocument("recipes", event.recipe_id);
  if (!recipe || recipe.deleted_at) return fail("NOT_FOUND", "食谱不存在");
  await db.collection("recipes").doc(event.recipe_id).update({ data: { status: event.status, updated_at: new Date() } });
  return ok({ recipe_id: event.recipe_id, status: event.status });
}

async function adminSetRecommended(event, openid) {
  await requireAdmin(openid);
  if (!event.recipe_id) return fail("VALIDATION_ERROR", "缺少食谱 ID");
  const recipe = await getDocument("recipes", event.recipe_id);
  if (!recipe || recipe.deleted_at) return fail("NOT_FOUND", "食谱不存在");
  const isRecommended = Boolean(event.is_recommended);
  await db.collection("recipes").doc(event.recipe_id).update({ data: { is_recommended: isRecommended, updated_at: new Date() } });
  return ok({ recipe_id: event.recipe_id, is_recommended: isRecommended });
}

async function adminListTags(event, openid) {
  await requireAdmin(openid);
  await ensureDefaultTags();
  const params = pageParams(event, 20);
  const result = await queryAll("recipe_categories", { deleted_at: null }, "sort_order", "asc");
  return ok({
    items: result.slice(params.skip, params.skip + params.pageSize),
    page: params.page,
    page_size: params.pageSize,
    has_more: result.length > params.skip + params.pageSize
  });
}

async function adminSaveTag(event, openid) {
  await requireAdmin(openid);
  const tag = event.tag || {};
  const name = cleanText(tag.name, 20);
  const status = STATUSES.includes(tag.status) ? tag.status : "active";
  const sortOrder = Number.parseInt(tag.sort_order, 10) || 0;
  if (!name) return fail("VALIDATION_ERROR", "请填写标签名称");
  const duplicates = await db.collection("recipe_categories").where({ name, deleted_at: null }).limit(10).get();
  if (duplicates.data.some((item) => item._id !== tag._id)) return fail("VALIDATION_ERROR", "标签名称已存在");
  const now = new Date();
  const data = { name, status, sort_order: sortOrder, updated_at: now, deleted_at: null };
  if (tag._id) {
    const existing = await getDocument("recipe_categories", tag._id);
    if (!existing || existing.deleted_at) return fail("NOT_FOUND", "标签不存在");
    await db.collection("recipe_categories").doc(tag._id).update({ data });
    return ok(Object.assign({}, existing, data));
  }
  const result = await db.collection("recipe_categories").add({ data: Object.assign({}, data, { created_at: now }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function adminDeleteTag(event, openid) {
  await requireAdmin(openid);
  if (!event.tag_id) return fail("VALIDATION_ERROR", "缺少标签 ID");
  const tag = await getDocument("recipe_categories", event.tag_id);
  if (!tag || tag.deleted_at) return fail("NOT_FOUND", "标签不存在");
  await db.collection("recipe_categories").doc(event.tag_id).update({ data: { status: "inactive", deleted_at: new Date(), updated_at: new Date() } });
  return ok({ tag_id: event.tag_id });
}

exports.main = async (event) => {
  const openid = cloud.getWXContext().OPENID;
  const action = event.action || "list";
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "filters") return await listFilters(openid);
    if (action === "list") return await listRecipes(event, openid);
    if (action === "detail") return await recipeDetail(event, openid);
    if (action === "addToMeal") return await addToMeal(event, openid);
    if (action === "mealPlan") return await mealPlan(event, openid);
    if (action === "replaceMeal") return await replaceMeal(event, openid);
    if (action === "addMealPlan") return await addMealPlan(event, openid);
    if (action === "adminList") return await adminList(event, openid);
    if (action === "adminDetail") return await adminDetail(event, openid);
    if (action === "adminFoodOptions") return await adminFoodOptions(event, openid);
    if (action === "adminSave") return await adminSave(event, openid);
    if (action === "adminUpdateStatus") return await adminUpdateStatus(event, openid);
    if (action === "adminSetRecommended") return await adminSetRecommended(event, openid);
    if (action === "adminListTags") return await adminListTags(event, openid);
    if (action === "adminSaveTag") return await adminSaveTag(event, openid);
    if (action === "adminDeleteTag") return await adminDeleteTag(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail(error.code || "INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

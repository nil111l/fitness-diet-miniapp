const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

const DEFAULT_CATEGORIES = [
  { name: "主食谷物", sort_order: 10 },
  { name: "肉蛋奶", sort_order: 20 },
  { name: "蔬菜", sort_order: 30 },
  { name: "水果", sort_order: 40 },
  { name: "坚果零食", sort_order: 50 },
  { name: "饮品", sort_order: 60 }
];

const DEFAULT_FOODS = [
  { name: "米饭", category_name: "主食谷物", calorie_per_100g: 116, protein_per_100g: 2.6, carb_per_100g: 25.9, fat_per_100g: 0.3 },
  { name: "全麦面包", category_name: "主食谷物", calorie_per_100g: 247, protein_per_100g: 13, carb_per_100g: 41, fat_per_100g: 4.2 },
  { name: "鸡胸肉", category_name: "肉蛋奶", calorie_per_100g: 133, protein_per_100g: 24.6, carb_per_100g: 0, fat_per_100g: 3 },
  { name: "鸡蛋", category_name: "肉蛋奶", calorie_per_100g: 144, protein_per_100g: 13.3, carb_per_100g: 2.8, fat_per_100g: 8.8 },
  { name: "牛奶", category_name: "肉蛋奶", calorie_per_100g: 54, protein_per_100g: 3, carb_per_100g: 3.4, fat_per_100g: 3.2 },
  { name: "西兰花", category_name: "蔬菜", calorie_per_100g: 36, protein_per_100g: 4.1, carb_per_100g: 4.3, fat_per_100g: 0.6 },
  { name: "苹果", category_name: "水果", calorie_per_100g: 53, protein_per_100g: 0.4, carb_per_100g: 13.7, fat_per_100g: 0.2 },
  { name: "香蕉", category_name: "水果", calorie_per_100g: 93, protein_per_100g: 1.4, carb_per_100g: 22, fat_per_100g: 0.2 }
];

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

function uniqueBy(items, getKey) {
  const seen = {};
  return (items || []).filter((item) => {
    const key = getKey(item);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
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
  await ensureCollection("food_categories");
  await ensureCollection("foods");
  await ensureCollection("users");
}

async function getUser(openid) {
  const result = await db.collection("users").where({ openid, deleted_at: null, status: "active" }).limit(1).get();
  return result.data[0] || null;
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function validateFood(food) {
  if (!food.name || !String(food.name).trim()) return "请填写食物名称";
  const fields = ["calorie_per_100g", "protein_per_100g", "carb_per_100g", "fat_per_100g"];
  for (let i = 0; i < fields.length; i += 1) {
    const numberValue = toNumber(food[fields[i]]);
    if (numberValue === null || numberValue < 0 || numberValue > 2000) {
      return "营养数据需要填写 0-2000 的数字";
    }
  }
  return "";
}

async function seedDefaults() {
  const now = new Date();
  const categories = await db.collection("food_categories").where({ deleted_at: null }).limit(100).get();
  const categoryMap = {};
  categories.data.forEach((item) => {
    if (!categoryMap[item.name]) categoryMap[item.name] = item._id;
  });

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i += 1) {
    const item = DEFAULT_CATEGORIES[i];
    if (!categoryMap[item.name]) {
      const result = await db.collection("food_categories").add({
        data: Object.assign({}, item, {
          status: "active",
          created_at: now,
          updated_at: now,
          deleted_at: null
        })
      });
      categoryMap[item.name] = result._id;
    }
  }

  const foods = await db.collection("foods").where({ source: "system", deleted_at: null }).limit(200).get();
  const foodMap = {};
  foods.data.forEach((item) => {
    foodMap[`${item.name}-${item.calorie_per_100g}-${item.protein_per_100g}-${item.carb_per_100g}-${item.fat_per_100g}`] = true;
  });

  for (let i = 0; i < DEFAULT_FOODS.length; i += 1) {
    const item = DEFAULT_FOODS[i];
    const key = `${item.name}-${item.calorie_per_100g}-${item.protein_per_100g}-${item.carb_per_100g}-${item.fat_per_100g}`;
    if (foodMap[key]) continue;
    await db.collection("foods").add({
      data: {
        name: item.name,
        category_id: categoryMap[item.category_name] || "",
        source: "system",
        user_id: "",
        openid: "",
        calorie_per_100g: item.calorie_per_100g,
        protein_per_100g: item.protein_per_100g,
        carb_per_100g: item.carb_per_100g,
        fat_per_100g: item.fat_per_100g,
        status: "active",
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    });
  }
}

async function listCategories() {
  await seedDefaults();
  const result = await db.collection("food_categories").where({ deleted_at: null, status: "active" }).orderBy("sort_order", "asc").limit(100).get();
  return ok(uniqueBy(result.data, (item) => item.name));
}

async function searchFoods(event, openid) {
  await seedDefaults();
  const keyword = String(event.keyword || "").trim();
  const categoryId = event.category_id || "";
  const page = Math.max(Number(event.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(event.page_size) || 20, 1), 50);
  const systemResult = await db.collection("foods").where({ source: "system", deleted_at: null, status: "active" }).limit(200).get();
  const customResult = await db.collection("foods").where({ source: "custom", openid, deleted_at: null, status: "active" }).limit(100).get();
  const allFoods = uniqueBy(systemResult.data.concat(customResult.data), (item) => `${item.source || "system"}-${item.name}-${item.calorie_per_100g}-${item.protein_per_100g}-${item.carb_per_100g}-${item.fat_per_100g}`);
  const filtered = allFoods.filter((item) => {
    const keywordMatched = !keyword || item.name.indexOf(keyword) >= 0;
    const categoryMatched = !categoryId || item.category_id === categoryId;
    return keywordMatched && categoryMatched;
  });
  const start = (page - 1) * pageSize;
  return ok(filtered.slice(start, start + pageSize));
}

async function createFood(event, openid, source) {
  const user = source === "custom" ? await getUser(openid) : null;
  if (source === "custom" && !user) return fail("LOGIN_REQUIRED", "请先登录");

  const food = event.food || {};
  const validationMessage = validateFood(food);
  if (validationMessage) return fail("VALIDATION_ERROR", validationMessage);

  const now = new Date();
  const data = {
    name: String(food.name).trim(),
    category_id: food.category_id || "",
    source,
    user_id: user ? user._id : "",
    openid: source === "custom" ? openid : "",
    calorie_per_100g: toNumber(food.calorie_per_100g),
    protein_per_100g: toNumber(food.protein_per_100g),
    carb_per_100g: toNumber(food.carb_per_100g),
    fat_per_100g: toNumber(food.fat_per_100g),
    status: "active",
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  const addResult = await db.collection("foods").add({ data });
  return ok(Object.assign({ _id: addResult._id }, data));
}

async function listCustom(openid) {
  const result = await db.collection("foods").where({ source: "custom", openid, deleted_at: null, status: "active" }).orderBy("updated_at", "desc").limit(100).get();
  return ok(uniqueBy(result.data, (item) => `${item.name}-${item.calorie_per_100g}-${item.protein_per_100g}-${item.carb_per_100g}-${item.fat_per_100g}`));
}

async function getFood(event, openid) {
  const id = event.food_id;
  if (!id) return fail("VALIDATION_ERROR", "缺少食物 ID");
  const food = await db.collection("foods").doc(id).get();
  const data = food.data;
  if (data.source === "custom" && data.openid !== openid) return fail("FORBIDDEN", "无权访问该食物");
  return ok(data);
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "search";

  try {
    await ensureCollections();
    if (action === "categories") return await listCategories();
    if (action === "search") return await searchFoods(event, openid);
    if (action === "createCustom") return await createFood(event, openid, "custom");
    if (action === "createPlatform") return await createFood(event, openid, "system");
    if (action === "listCustom") return await listCustom(openid);
    if (action === "get") return await getFood(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

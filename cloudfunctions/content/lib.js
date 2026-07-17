const ARTICLE_CATEGORIES = [
  { value: "diet", label: "饮食知识" },
  { value: "training", label: "训练知识" },
  { value: "recording", label: "记录技巧" },
  { value: "faq", label: "常见问题" }
];

const CORRECTION_TYPES = [
  { value: "name", label: "名称" },
  { value: "calorie", label: "热量" },
  { value: "protein", label: "蛋白质" },
  { value: "carb", label: "碳水" },
  { value: "fat", label: "脂肪" },
  { value: "category", label: "分类" },
  { value: "other", label: "其他" }
];

const ARTICLE_STATUSES = ["active", "inactive"];
const CORRECTION_STATUSES = ["pending", "processing", "resolved", "rejected"];

const DEFAULT_ARTICLES = [
  {
    seed_key: "balanced-plate",
    category: "diet",
    title: "一餐如何搭配得更均衡",
    summary: "用主食、优质蛋白和蔬菜组成容易执行的一餐。",
    content: ["可以先确定一份主食，再搭配蛋、奶、豆制品、鱼禽肉等蛋白质来源。", "蔬菜尽量覆盖不同颜色，烹调方式以自己能长期坚持为准。", "记录时关注整体份量，不必追求每一餐都完全相同。"]
  },
  {
    seed_key: "training-start",
    category: "training",
    title: "开始训练时先关注动作质量",
    summary: "稳定、可控的动作比盲目增加重量更重要。",
    content: ["先从能够稳定完成的重量和次数开始。", "动作过程中保持正常呼吸，出现明显不适时停止。", "逐周小幅增加训练量，更容易建立持续习惯。"]
  },
  {
    seed_key: "recording-rhythm",
    category: "recording",
    title: "让记录更容易坚持的三个方法",
    summary: "降低记录门槛，把常吃食物和模板用起来。",
    content: ["优先收藏经常吃的食物，减少重复搜索。", "固定餐次可以保存为饮食模板。", "漏记一两天不需要补齐全部历史，从下一餐继续即可。"]
  },
  {
    seed_key: "calorie-change",
    category: "faq",
    title: "为什么每天的剩余热量会变化",
    summary: "饮食记录、运动消耗和目标共同影响首页结果。",
    content: ["首页剩余热量由推荐热量减去已摄入，再加上运动消耗得到。", "编辑或删除当天记录后，首页会基于原始记录重新计算。", "推荐值用于日常管理参考，可结合实际状态调整目标。"]
  }
];

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanParagraphs(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  return source.map((item) => cleanText(item, 800)).filter(Boolean).slice(0, 60);
}

function validMediaUrl(value) {
  const url = cleanText(value, 500);
  return !url || url.startsWith("https://") || url.startsWith("cloud://");
}

function validateArticlePayload(raw) {
  const article = raw || {};
  const data = {
    title: cleanText(article.title, 60),
    summary: cleanText(article.summary, 180),
    category: ARTICLE_CATEGORIES.some((item) => item.value === article.category) ? article.category : "",
    cover_url: cleanText(article.cover_url, 500),
    content: cleanParagraphs(article.content),
    status: ARTICLE_STATUSES.includes(article.status) ? article.status : "inactive",
    is_recommended: article.is_recommended === true,
    sort_order: Math.max(Math.min(Number.parseInt(article.sort_order, 10) || 0, 9999), -9999)
  };
  let error = "";
  if (!data.title) error = "请填写文章标题";
  else if (!data.summary) error = "请填写文章摘要";
  else if (!data.category) error = "请选择文章类型";
  else if (!data.content.length) error = "请至少填写一段文章内容";
  else if (!validMediaUrl(data.cover_url)) error = "封面地址仅支持 https:// 或 cloud://";
  return { error, data };
}

function validateCorrectionPayload(raw) {
  const correction = raw || {};
  const data = {
    food_id: cleanText(correction.food_id, 80),
    correction_type: CORRECTION_TYPES.some((item) => item.value === correction.correction_type) ? correction.correction_type : "",
    description: cleanText(correction.description, 500),
    suggested_value: cleanText(correction.suggested_value, 120)
  };
  let error = "";
  if (!data.food_id) error = "缺少食材信息";
  else if (!data.correction_type) error = "请选择纠错类型";
  else if (data.description.length < 5) error = "请至少填写 5 个字的纠错说明";
  return { error, data };
}

function isCorrectableFood(food) {
  return Boolean(food && !food.deleted_at && food.status === "active" && food.source === "system");
}

function validateFoodUpdate(raw) {
  const food = raw || {};
  const numberFields = ["calorie_per_100g", "protein_per_100g", "carb_per_100g", "fat_per_100g"];
  const data = {
    name: cleanText(food.name, 60),
    category_id: cleanText(food.category_id, 80)
  };
  numberFields.forEach((field) => { data[field] = Number(food[field]); });
  let error = "";
  if (!data.name) error = "请填写食材名称";
  else if (numberFields.some((field) => !Number.isFinite(data[field]) || data[field] < 0 || data[field] > 2000)) error = "营养数据需为 0-2000 的数字";
  return { error, data };
}

function buildDefaultArticles() {
  return DEFAULT_ARTICLES.map((item, index) => Object.assign({
    _id: `phase9-article-${item.seed_key}`,
    cover_url: "",
    status: "active",
    is_recommended: index < 2,
    sort_order: (index + 1) * 10,
    seed_source: "phase9-foundation"
  }, item));
}

module.exports = {
  ARTICLE_CATEGORIES,
  CORRECTION_TYPES,
  CORRECTION_STATUSES,
  buildDefaultArticles,
  validateArticlePayload,
  validateCorrectionPayload,
  isCorrectableFood,
  validateFoodUpdate
};

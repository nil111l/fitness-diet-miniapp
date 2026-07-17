const ARTICLE_CATEGORIES = [
  { label: "全部", value: "" },
  { label: "饮食知识", value: "diet" },
  { label: "训练知识", value: "training" },
  { label: "记录技巧", value: "recording" },
  { label: "常见问题", value: "faq" }
];

const CORRECTION_TYPES = [
  { label: "名称", value: "name" },
  { label: "热量", value: "calorie" },
  { label: "蛋白质", value: "protein" },
  { label: "碳水", value: "carb" },
  { label: "脂肪", value: "fat" },
  { label: "分类", value: "category" },
  { label: "其他", value: "other" }
];

const CORRECTION_STATUSES = [
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已采纳", value: "resolved" },
  { label: "未采纳", value: "rejected" }
];

function labelFor(options, value, fallback) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : fallback;
}

function decorateArticle(article) {
  return Object.assign({}, article, { category_text: article.category_text || labelFor(ARTICLE_CATEGORIES, article.category, "健康知识") });
}

function decorateCorrection(item) {
  return Object.assign({}, item, {
    correction_type_text: item.correction_type_text || labelFor(CORRECTION_TYPES, item.correction_type, "其他"),
    status_text: labelFor(CORRECTION_STATUSES, item.status, "待处理")
  });
}

module.exports = {
  ARTICLE_CATEGORIES,
  CORRECTION_TYPES,
  CORRECTION_STATUSES,
  decorateArticle,
  decorateCorrection,
  labelFor
};

const test = require("node:test");
const assert = require("node:assert/strict");
const { ARTICLE_CATEGORIES, buildDefaultArticles, validateArticlePayload, validateCorrectionPayload, isCorrectableFood, validateFoodUpdate } = require("../lib");

test("基础文章覆盖四个内容类型", () => {
  const articles = buildDefaultArticles();
  assert.deepEqual(new Set(articles.map((item) => item.category)), new Set(ARTICLE_CATEGORIES.map((item) => item.value)));
  assert.equal(articles.every((item) => item.status === "active" && item.content.length), true);
});

test("文章校验标题、摘要、类型、正文和媒体协议", () => {
  const valid = validateArticlePayload({ title: "记录技巧", summary: "摘要", category: "recording", content: "第一段\n第二段", cover_url: "https://example.com/a.jpg" });
  assert.equal(valid.error, "");
  assert.deepEqual(valid.data.content, ["第一段", "第二段"]);
  const invalid = validateArticlePayload(Object.assign({}, valid.data, { cover_url: "ftp://example.com/a.jpg" }));
  assert.match(invalid.error, /封面地址/);
});

test("食材纠错需要有效类型和至少五个字说明", () => {
  const valid = validateCorrectionPayload({ food_id: "food-1", correction_type: "calorie", description: "热量数据可能偏高", suggested_value: "116" });
  assert.equal(valid.error, "");
  const invalid = validateCorrectionPayload({ food_id: "food-1", correction_type: "calorie", description: "不对" });
  assert.match(invalid.error, /5 个字/);
});

test("只有仍在上架的平台食材可以提交纠错", () => {
  assert.equal(isCorrectableFood({ source: "system", status: "active", deleted_at: null }), true);
  assert.equal(isCorrectableFood({ source: "system", status: "inactive", deleted_at: null }), false);
  assert.equal(isCorrectableFood({ source: "custom", status: "active", deleted_at: null }), false);
  assert.equal(isCorrectableFood({ source: "system", status: "active", deleted_at: new Date() }), false);
});

test("管理员应用纠错时完整校验食材数据", () => {
  const valid = validateFoodUpdate({ name: "米饭", category_id: "c1", calorie_per_100g: 116, protein_per_100g: 2.6, carb_per_100g: 25.9, fat_per_100g: 0.3 });
  assert.equal(valid.error, "");
  const invalid = validateFoodUpdate(Object.assign({}, valid.data, { calorie_per_100g: -1 }));
  assert.match(invalid.error, /营养数据/);
});

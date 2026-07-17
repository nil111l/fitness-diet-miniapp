const test = require("node:test");
const assert = require("node:assert/strict");
const { weekRange, weeklySummary, monthlySummary, evaluateDietInsights } = require("../lib");

test("周区间按周一到周日计算", () => {
  assert.deepEqual(weekRange("2026-07-17"), {
    start: "2026-07-13",
    end: "2026-07-19",
    dates: ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18", "2026-07-19"]
  });
});

test("周总结从原始记录计算平均热量、天数和常吃食物", () => {
  const result = weeklySummary({
    today: "2026-07-17",
    dietRecords: [
      { record_date: "2026-07-13", food_id: "rice", food_name: "米饭", amount_g: 100, calorie: 200 },
      { record_date: "2026-07-13", food_id: "egg", food_name: "鸡蛋", amount_g: 50, calorie: 100 },
      { record_date: "2026-07-14", food_id: "rice", food_name: "米饭", amount_g: 120, calorie: 300 }
    ],
    exerciseRecords: [{ record_date: "2026-07-14" }, { record_date: "2026-07-16" }],
    bodyRecords: [{ record_date: "2026-07-13", weight_kg: 70 }, { record_date: "2026-07-17", weight_kg: 69.5 }]
  });
  assert.equal(result.average_calorie, 300);
  assert.equal(result.training_count, 2);
  assert.equal(result.diet_record_days, 2);
  assert.equal(result.exercise_record_days, 2);
  assert.equal(result.weight.change, -0.5);
  assert.equal(result.most_frequent_food.name, "米饭");
});

test("月总结计算最长打卡和营养素达标率", () => {
  const result = monthlySummary({
    month: "2026-07",
    dietRecords: [
      { record_date: "2026-07-01", calorie: 1800, protein: 100, carb: 200, fat: 50 },
      { record_date: "2026-07-02", calorie: 2000, protein: 70, carb: 150, fat: 45 }
    ],
    exerciseRecords: [{ record_date: "2026-07-02" }],
    bodyRecords: [{ record_date: "2026-07-01", weight_kg: 70 }, { record_date: "2026-07-30", weight_kg: 69 }],
    checkinRecords: [{ checkin_date: "2026-07-01" }, { checkin_date: "2026-07-02" }, { checkin_date: "2026-07-04" }],
    goal: { macro_targets: { protein_g: 100, carb_g: 200, fat_g: 50 } }
  });
  assert.equal(result.average_calorie, 1900);
  assert.equal(result.exercise_count, 1);
  assert.equal(result.longest_checkin_days, 2);
  assert.equal(result.weight.change, -1);
  assert.equal(result.macro_compliance.protein.rate, 50);
});

test("饮食洞察严格按连续日期和目标阈值触发", () => {
  const records = [];
  ["2026-07-15", "2026-07-16", "2026-07-17"].forEach((date) => {
    records.push({ record_date: date, meal_type: "lunch", calorie: 1300, protein: 30 });
    records.push({ record_date: date, meal_type: "dinner", calorie: 1000, protein: 30 });
  });
  const result = evaluateDietInsights({
    today: "2026-07-17",
    dietRecords: records,
    goal: { daily_calorie_target: 2000, macro_targets: { protein_g: 100 } }
  });
  assert.deepEqual(result.insights.map((item) => item.code), ["CALORIE_HIGH_3_DAYS", "PROTEIN_LOW_3_DAYS", "DINNER_RATIO_HIGH_3_DAYS"]);
});

test("连续两个完整自然日无饮食记录时提示恢复记录", () => {
  const result = evaluateDietInsights({ today: "2026-07-17", dietRecords: [{ record_date: "2026-07-14", calorie: 1000 }], goal: {} });
  assert.deepEqual(result.insights.map((item) => item.code), ["DIET_MISSING_2_DAYS"]);
});

test("日期不连续或未达到阈值时不强行生成洞察", () => {
  const result = evaluateDietInsights({
    today: "2026-07-17",
    dietRecords: [
      { record_date: "2026-07-15", meal_type: "dinner", calorie: 700, protein: 90 },
      { record_date: "2026-07-17", meal_type: "lunch", calorie: 1800, protein: 90 }
    ],
    goal: { daily_calorie_target: 2000, macro_targets: { protein_g: 100 } }
  });
  assert.deepEqual(result.insights, []);
});

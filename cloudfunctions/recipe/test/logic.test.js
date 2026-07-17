const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateNutrition,
  scaleRecipe,
  buildDefaultRecipeSeeds,
  buildMealPlan,
  replaceMealRecipe,
  replaceMealForRange
} = require("../lib");

const defaultFoods = [
  { _id: "rice", name: "米饭", calorie_per_100g: 116, protein_per_100g: 2.6, carb_per_100g: 25.9, fat_per_100g: 0.3 },
  { _id: "bread", name: "全麦面包", calorie_per_100g: 247, protein_per_100g: 13, carb_per_100g: 41, fat_per_100g: 4.2 },
  { _id: "chicken", name: "鸡胸肉", calorie_per_100g: 133, protein_per_100g: 24.6, carb_per_100g: 0, fat_per_100g: 3 },
  { _id: "egg", name: "鸡蛋", calorie_per_100g: 144, protein_per_100g: 13.3, carb_per_100g: 2.8, fat_per_100g: 8.8 },
  { _id: "milk", name: "牛奶", calorie_per_100g: 54, protein_per_100g: 3, carb_per_100g: 3.4, fat_per_100g: 3.2 },
  { _id: "broccoli", name: "西兰花", calorie_per_100g: 36, protein_per_100g: 4.1, carb_per_100g: 4.3, fat_per_100g: 0.6 },
  { _id: "apple", name: "苹果", calorie_per_100g: 53, protein_per_100g: 0.4, carb_per_100g: 13.7, fat_per_100g: 0.2 },
  { _id: "banana", name: "香蕉", calorie_per_100g: 93, protein_per_100g: 1.4, carb_per_100g: 22, fat_per_100g: 0.2 }
];

test("按平台食材每百克营养和食材重量计算每份营养", () => {
  const foodsById = {
    chicken: {
      calorie_per_100g: 165,
      protein_per_100g: 31,
      carb_per_100g: 0,
      fat_per_100g: 3.6
    },
    rice: {
      calorie_per_100g: 116,
      protein_per_100g: 2.6,
      carb_per_100g: 25.9,
      fat_per_100g: 0.3
    }
  };

  assert.deepEqual(calculateNutrition([
    { food_id: "chicken", amount_g: 150 },
    { food_id: "rice", amount_g: 200 }
  ], foodsById), {
    calorie: 479.5,
    protein: 51.7,
    carb: 51.8,
    fat: 6
  });
});

test("调整份量时同步缩放营养和食材重量", () => {
  assert.deepEqual(scaleRecipe({
    calorie: 400,
    protein: 30,
    carb: 45,
    fat: 10,
    ingredients: [{ food_id: "rice", food_name: "米饭", amount_g: 150 }]
  }, 1.5), {
    calorie: 600,
    protein: 45,
    carb: 67.5,
    fat: 15,
    ingredients: [{ food_id: "rice", food_name: "米饭", amount_g: 225 }]
  });
});

test("基础食谱可为所有目标生成 2100-2400 千卡的四餐计划", () => {
  const recipes = buildDefaultRecipeSeeds(defaultFoods).map((item, index) => Object.assign({
    _id: `seed-${index}`,
    status: "active"
  }, item));

  ["lose_weight", "gain_muscle", "maintain"].forEach((goal) => {
    const plan = buildMealPlan(recipes, {
      goal,
      calorie_min: 2100,
      calorie_max: 2400
    });
    assert.equal(plan.complete, true);
    assert.equal(plan.within_range, true);
    assert.deepEqual(plan.meals.map((item) => item.meal_type), ["breakfast", "lunch", "dinner", "snack"]);
  });
});

test("按目标和总热量区间为四个餐次匹配食谱", () => {
  const recipes = [
    { _id: "b1", status: "active", goals: ["lose_weight"], meals: ["breakfast"], calorie: 430, is_recommended: true },
    { _id: "b2", status: "active", goals: ["lose_weight"], meals: ["breakfast"], calorie: 520 },
    { _id: "l1", status: "active", goals: ["lose_weight"], meals: ["lunch"], calorie: 620 },
    { _id: "d1", status: "active", goals: ["lose_weight"], meals: ["dinner"], calorie: 540 },
    { _id: "s1", status: "active", goals: ["lose_weight"], meals: ["snack"], calorie: 190 },
    { _id: "hidden", status: "inactive", goals: ["lose_weight"], meals: ["lunch"], calorie: 630 },
    { _id: "gain", status: "active", goals: ["muscle_gain"], meals: ["dinner"], calorie: 550 }
  ];

  const plan = buildMealPlan(recipes, {
    goal: "lose_weight",
    calorie_min: 1700,
    calorie_max: 1900
  });

  assert.deepEqual(plan.meals.map((item) => item.recipe._id), ["b1", "l1", "d1", "s1"]);
  assert.equal(plan.total.calorie, 1780);
});

test("存在可用组合时优先让一日总热量落在所选区间", () => {
  const recipes = [
    { _id: "b1", status: "active", goals: ["maintain"], meals: ["breakfast"], calorie: 400 },
    { _id: "b2", status: "active", goals: ["maintain"], meals: ["breakfast"], calorie: 500 },
    { _id: "l1", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 630 },
    { _id: "l2", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 680 },
    { _id: "d1", status: "active", goals: ["maintain"], meals: ["dinner"], calorie: 540 },
    { _id: "s1", status: "active", goals: ["maintain"], meals: ["snack"], calorie: 180 }
  ];

  const plan = buildMealPlan(recipes, {
    goal: "maintain",
    calorie_min: 1790,
    calorie_max: 1810
  });

  assert.equal(plan.total.calorie, 1800);
  assert.equal(plan.within_range, true);
});

test("替换单个餐次时不会再次返回当前食谱", () => {
  const recipes = [
    { _id: "l1", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 600, is_recommended: true },
    { _id: "l2", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 630 },
    { _id: "d1", status: "active", goals: ["maintain"], meals: ["dinner"], calorie: 630 }
  ];

  const replacement = replaceMealRecipe(recipes, {
    goal: "maintain",
    meal_type: "lunch",
    target_calorie: 620,
    exclude_recipe_ids: ["l1"]
  });

  assert.equal(replacement._id, "l2");
});

test("替换单餐时只返回能让整日热量留在区间内的食谱", () => {
  const recipes = [
    { _id: "l1", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 520 },
    { _id: "l2", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 650 },
    { _id: "l3", status: "active", goals: ["maintain"], meals: ["lunch"], calorie: 900 }
  ];

  const replacement = replaceMealForRange(recipes, {
    goal: "maintain",
    meal_type: "lunch",
    calorie_min: 1750,
    calorie_max: 1850,
    other_calories: 1200,
    exclude_recipe_ids: ["l1"]
  });

  assert.equal(replacement._id, "l2");
});

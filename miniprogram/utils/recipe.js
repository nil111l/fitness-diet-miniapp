const GOAL_OPTIONS = [
  { label: "全部目标", value: "" },
  { label: "减脂", value: "lose_weight" },
  { label: "增肌", value: "gain_muscle" },
  { label: "保持健康", value: "maintain" }
];

const MEAL_OPTIONS = [
  { label: "全部餐次", value: "" },
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
  { label: "加餐", value: "snack" }
];

const DIFFICULTY_OPTIONS = [
  { label: "简单", value: "easy" },
  { label: "适中", value: "medium" },
  { label: "较难", value: "hard" }
];

function labelFor(options, value) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : "";
}

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function decorateRecipe(recipe) {
  return Object.assign({}, recipe, {
    goal_text: (recipe.goals || []).map((value) => labelFor(GOAL_OPTIONS, value)).filter(Boolean).join("、"),
    meal_text: (recipe.meals || []).map((value) => labelFor(MEAL_OPTIONS, value)).filter(Boolean).join("、"),
    difficulty_text: labelFor(DIFFICULTY_OPTIONS, recipe.difficulty),
    tag_text: (recipe.tags || []).join(" · ")
  });
}

function mealLabel(value) {
  return labelFor(MEAL_OPTIONS, value);
}

function scaleRecipe(recipe, servings) {
  const portion = Number(servings || 1);
  return Object.assign({}, decorateRecipe(recipe), {
    calorie: round1(Number(recipe.calorie || 0) * portion),
    protein: round1(Number(recipe.protein || 0) * portion),
    carb: round1(Number(recipe.carb || 0) * portion),
    fat: round1(Number(recipe.fat || 0) * portion),
    ingredients: (recipe.ingredients || []).map((item) => Object.assign({}, item, {
      amount_g: round1(Number(item.amount_g || 0) * portion)
    }))
  });
}

function sumNutrition(recipes) {
  return recipes.reduce((total, recipe) => ({
    calorie: round1(total.calorie + Number(recipe.calorie || 0)),
    protein: round1(total.protein + Number(recipe.protein || 0)),
    carb: round1(total.carb + Number(recipe.carb || 0)),
    fat: round1(total.fat + Number(recipe.fat || 0))
  }), { calorie: 0, protein: 0, carb: 0, fat: 0 });
}

module.exports = {
  GOAL_OPTIONS,
  MEAL_OPTIONS,
  DIFFICULTY_OPTIONS,
  mealLabel,
  decorateRecipe,
  scaleRecipe,
  sumNutrition
};

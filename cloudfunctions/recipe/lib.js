const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_SHARES = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1
};

function round1(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function calculateNutrition(ingredients, foodsById) {
  const total = { calorie: 0, protein: 0, carb: 0, fat: 0 };
  (ingredients || []).forEach((ingredient) => {
    const food = foodsById[ingredient.food_id];
    if (!food) throw new Error("食谱包含不存在的食材");
    const ratio = Number(ingredient.amount_g || 0) / 100;
    total.calorie += Number(food.calorie_per_100g || 0) * ratio;
    total.protein += Number(food.protein_per_100g || 0) * ratio;
    total.carb += Number(food.carb_per_100g || 0) * ratio;
    total.fat += Number(food.fat_per_100g || 0) * ratio;
  });
  return {
    calorie: round1(total.calorie),
    protein: round1(total.protein),
    carb: round1(total.carb),
    fat: round1(total.fat)
  };
}

function scaleRecipe(recipe, servings) {
  const portion = Number(servings || 1);
  return {
    calorie: round1(Number(recipe.calorie || 0) * portion),
    protein: round1(Number(recipe.protein || 0) * portion),
    carb: round1(Number(recipe.carb || 0) * portion),
    fat: round1(Number(recipe.fat || 0) * portion),
    ingredients: (recipe.ingredients || []).map((item) => Object.assign({}, item, {
      amount_g: round1(Number(item.amount_g || 0) * portion)
    }))
  };
}

function recipeMatches(recipe, goal, mealType, excluded) {
  return recipe && recipe.status === "active"
    && Array.isArray(recipe.goals) && recipe.goals.includes(goal)
    && Array.isArray(recipe.meals) && recipe.meals.includes(mealType)
    && !excluded.includes(recipe._id);
}

function pickRecipe(recipes, options) {
  const excluded = Array.isArray(options.exclude_recipe_ids) ? options.exclude_recipe_ids : [];
  const target = Number(options.target_calorie || 0);
  return recipes
    .filter((item) => recipeMatches(item, options.goal, options.meal_type, excluded))
    .sort((left, right) => {
      const calorieDiff = Math.abs(Number(left.calorie || 0) - target) - Math.abs(Number(right.calorie || 0) - target);
      if (calorieDiff !== 0) return calorieDiff;
      if (Boolean(left.is_recommended) !== Boolean(right.is_recommended)) return left.is_recommended ? -1 : 1;
      return String(left._id).localeCompare(String(right._id));
    })[0] || null;
}

function mealCandidates(recipes, options) {
  const target = Number(options.target_calorie || 0);
  return recipes
    .filter((item) => recipeMatches(item, options.goal, options.meal_type, []))
    .sort((left, right) => {
      const calorieDiff = Math.abs(Number(left.calorie || 0) - target) - Math.abs(Number(right.calorie || 0) - target);
      if (calorieDiff !== 0) return calorieDiff;
      if (Boolean(left.is_recommended) !== Boolean(right.is_recommended)) return left.is_recommended ? -1 : 1;
      return String(left._id).localeCompare(String(right._id));
    })
    .slice(0, 10);
}

function nutritionTotal(recipes) {
  return recipes.reduce((total, recipe) => ({
    calorie: round1(total.calorie + Number(recipe.calorie || 0)),
    protein: round1(total.protein + Number(recipe.protein || 0)),
    carb: round1(total.carb + Number(recipe.carb || 0)),
    fat: round1(total.fat + Number(recipe.fat || 0))
  }), { calorie: 0, protein: 0, carb: 0, fat: 0 });
}

function buildMealPlan(recipes, options) {
  const midpoint = (Number(options.calorie_min) + Number(options.calorie_max)) / 2;
  const candidateGroups = MEAL_TYPES.map((mealType) => mealCandidates(recipes, {
    goal: options.goal,
    meal_type: mealType,
    target_calorie: midpoint * MEAL_SHARES[mealType]
  }));
  if (candidateGroups.some((items) => !items.length)) {
    const meals = MEAL_TYPES.map((mealType, index) => ({ meal_type: mealType, recipe: candidateGroups[index][0] || null }));
    return { meals, total: nutritionTotal(meals.filter((item) => item.recipe).map((item) => item.recipe)), complete: false, within_range: false };
  }

  let best = null;
  function visit(groupIndex, selected) {
    if (groupIndex === candidateGroups.length) {
      const total = nutritionTotal(selected);
      const withinRange = total.calorie >= Number(options.calorie_min) && total.calorie <= Number(options.calorie_max);
      const intervalDistance = total.calorie < Number(options.calorie_min)
        ? Number(options.calorie_min) - total.calorie
        : Math.max(total.calorie - Number(options.calorie_max), 0);
      const recommendedCount = selected.filter((item) => item.is_recommended).length;
      const score = (withinRange ? 0 : 1000000 + intervalDistance * 100) + Math.abs(total.calorie - midpoint) - recommendedCount * 0.01;
      if (!best || score < best.score) best = { selected: selected.slice(), total, score, withinRange };
      return;
    }
    candidateGroups[groupIndex].forEach((recipe) => {
      if (selected.some((item) => item._id === recipe._id)) return;
      selected.push(recipe);
      visit(groupIndex + 1, selected);
      selected.pop();
    });
  }
  visit(0, []);
  if (!best) return { meals: MEAL_TYPES.map((mealType) => ({ meal_type: mealType, recipe: null })), total: nutritionTotal([]), complete: false, within_range: false };
  const meals = MEAL_TYPES.map((mealType, index) => ({ meal_type: mealType, recipe: best.selected[index] }));
  return {
    meals,
    total: best.total,
    complete: true,
    within_range: best.withinRange
  };
}

function replaceMealRecipe(recipes, options) {
  return pickRecipe(recipes, options);
}

function replaceMealForRange(recipes, options) {
  const otherCalories = Number(options.other_calories || 0);
  const candidates = recipes.filter((item) => {
    const total = otherCalories + Number(item.calorie || 0);
    return total >= Number(options.calorie_min) && total <= Number(options.calorie_max);
  });
  return pickRecipe(candidates, {
    goal: options.goal,
    meal_type: options.meal_type,
    target_calorie: (Number(options.calorie_min) + Number(options.calorie_max)) / 2 - otherCalories,
    exclude_recipe_ids: options.exclude_recipe_ids || []
  });
}

module.exports = {
  MEAL_TYPES,
  MEAL_SHARES,
  round1,
  calculateNutrition,
  scaleRecipe,
  buildMealPlan,
  replaceMealRecipe,
  replaceMealForRange
};

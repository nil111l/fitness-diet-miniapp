const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_SHARES = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1
};
const DEFAULT_GOALS = ["lose_weight", "gain_muscle", "maintain"];
const DEFAULT_RECIPE_TEMPLATES = [
  {
    seed_key: "breakfast-light",
    name: "轻食牛奶鸡蛋全麦餐",
    intro: "牛奶、鸡蛋和全麦面包组成的简单早餐。",
    meal_type: "breakfast",
    ingredients: [["牛奶", 200], ["鸡蛋", 50], ["全麦面包", 60]],
    steps: ["鸡蛋煮熟后去壳。", "搭配全麦面包和牛奶食用。"],
    prep_time_min: 12,
    difficulty: "easy",
    tag_names: ["低脂"]
  },
  {
    seed_key: "breakfast-standard",
    name: "活力牛奶鸡蛋全麦餐",
    intro: "蛋白质和主食搭配均衡的早餐。",
    meal_type: "breakfast",
    ingredients: [["牛奶", 250], ["鸡蛋", 100], ["全麦面包", 110]],
    steps: ["鸡蛋煮熟后去壳。", "搭配全麦面包和牛奶食用。"],
    prep_time_min: 12,
    difficulty: "easy",
    tag_names: ["高蛋白"],
    is_recommended: true
  },
  {
    seed_key: "breakfast-high",
    name: "高能量牛奶鸡蛋全麦餐",
    intro: "适合热量需求较高日期的饱腹早餐。",
    meal_type: "breakfast",
    ingredients: [["牛奶", 300], ["鸡蛋", 150], ["全麦面包", 150]],
    steps: ["鸡蛋煮熟后去壳。", "搭配全麦面包和牛奶食用。"],
    prep_time_min: 15,
    difficulty: "easy",
    tag_names: ["高蛋白"]
  },
  {
    seed_key: "lunch-light",
    name: "轻食鸡胸西兰花米饭",
    intro: "鸡胸肉、西兰花和米饭组成的低脂午餐。",
    meal_type: "lunch",
    ingredients: [["鸡胸肉", 150], ["米饭", 180], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟或少油煎熟。", "西兰花焯熟，与米饭一起装盘。"],
    prep_time_min: 25,
    difficulty: "easy",
    tag_names: ["高蛋白", "低脂"]
  },
  {
    seed_key: "lunch-standard",
    name: "经典鸡胸西兰花米饭",
    intro: "蛋白质、蔬菜和主食搭配完整的午餐。",
    meal_type: "lunch",
    ingredients: [["鸡胸肉", 200], ["米饭", 350], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟或少油煎熟。", "西兰花焯熟，与米饭一起装盘。"],
    prep_time_min: 25,
    difficulty: "easy",
    tag_names: ["高蛋白", "低脂"],
    is_recommended: true
  },
  {
    seed_key: "lunch-high",
    name: "足量鸡胸西兰花米饭",
    intro: "增加主食和蛋白质份量的高能量午餐。",
    meal_type: "lunch",
    ingredients: [["鸡胸肉", 250], ["米饭", 450], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟或少油煎熟。", "西兰花焯熟，与米饭一起装盘。"],
    prep_time_min: 30,
    difficulty: "easy",
    tag_names: ["高蛋白"]
  },
  {
    seed_key: "dinner-light",
    name: "清爽鸡胸西兰花米饭",
    intro: "份量轻盈的高蛋白晚餐。",
    meal_type: "dinner",
    ingredients: [["鸡胸肉", 120], ["米饭", 160], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟后切片。", "西兰花焯熟，搭配米饭食用。"],
    prep_time_min: 22,
    difficulty: "easy",
    tag_names: ["高蛋白", "低脂"]
  },
  {
    seed_key: "dinner-standard",
    name: "饱腹鸡胸西兰花米饭",
    intro: "兼顾饱腹感与蛋白质的晚餐。",
    meal_type: "dinner",
    ingredients: [["鸡胸肉", 180], ["米饭", 300], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟后切片。", "西兰花焯熟，搭配米饭食用。"],
    prep_time_min: 25,
    difficulty: "easy",
    tag_names: ["高蛋白", "低脂"],
    is_recommended: true
  },
  {
    seed_key: "dinner-high",
    name: "高能量鸡胸西兰花米饭",
    intro: "适合训练日的足量晚餐。",
    meal_type: "dinner",
    ingredients: [["鸡胸肉", 220], ["米饭", 400], ["西兰花", 200]],
    steps: ["鸡胸肉煮熟后切片。", "西兰花焯熟，搭配米饭食用。"],
    prep_time_min: 30,
    difficulty: "easy",
    tag_names: ["高蛋白"]
  },
  {
    seed_key: "snack-light",
    name: "清爽苹果加餐",
    intro: "简单清爽的水果加餐。",
    meal_type: "snack",
    ingredients: [["苹果", 200]],
    steps: ["苹果洗净后切块食用。"],
    prep_time_min: 3,
    difficulty: "easy",
    tag_names: ["低脂"]
  },
  {
    seed_key: "snack-standard",
    name: "香蕉牛奶加餐",
    intro: "水果和牛奶搭配的日常加餐。",
    meal_type: "snack",
    ingredients: [["香蕉", 120], ["牛奶", 200]],
    steps: ["香蕉去皮，搭配牛奶食用。"],
    prep_time_min: 3,
    difficulty: "easy",
    tag_names: ["低脂"],
    is_recommended: true
  },
  {
    seed_key: "snack-high",
    name: "足量香蕉牛奶加餐",
    intro: "适合运动前后的高能量加餐。",
    meal_type: "snack",
    ingredients: [["香蕉", 200], ["牛奶", 300]],
    steps: ["香蕉去皮，搭配牛奶食用。"],
    prep_time_min: 3,
    difficulty: "easy",
    tag_names: ["低脂"]
  }
];

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

function buildDefaultRecipeSeeds(foods) {
  const foodByName = {};
  (foods || []).forEach((food) => {
    if (food && food._id && food.name && !foodByName[food.name]) foodByName[food.name] = food;
  });
  const requiredNames = Array.from(new Set(DEFAULT_RECIPE_TEMPLATES.flatMap((template) => template.ingredients.map((item) => item[0]))));
  if (requiredNames.some((name) => !foodByName[name])) return [];

  return DEFAULT_RECIPE_TEMPLATES.map((template) => {
    const ingredients = template.ingredients.map(([name, amount]) => {
      const food = foodByName[name];
      return {
        food_id: food._id,
        food_name: food.name,
        amount_g: amount,
        calorie_per_100g: Number(food.calorie_per_100g || 0),
        protein_per_100g: Number(food.protein_per_100g || 0),
        carb_per_100g: Number(food.carb_per_100g || 0),
        fat_per_100g: Number(food.fat_per_100g || 0)
      };
    });
    const foodsById = {};
    ingredients.forEach((ingredient) => {
      foodsById[ingredient.food_id] = foodByName[ingredient.food_name];
    });
    return {
      seed_key: template.seed_key,
      name: template.name,
      intro: template.intro,
      goals: DEFAULT_GOALS.slice(),
      meals: [template.meal_type],
      tag_names: template.tag_names.slice(),
      ingredients,
      steps: template.steps.slice(),
      prep_time_min: template.prep_time_min,
      difficulty: template.difficulty,
      is_recommended: Boolean(template.is_recommended),
      base_servings: 1,
      ...calculateNutrition(ingredients, foodsById)
    };
  });
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
  buildDefaultRecipeSeeds,
  buildMealPlan,
  replaceMealRecipe,
  replaceMealForRange
};

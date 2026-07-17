const { callFunction } = require("../../utils/cloud");
const { requireLogin, getGoal } = require("../../utils/auth");
const { GOAL_OPTIONS, mealLabel, decorateRecipe, sumNutrition } = require("../../utils/recipe");

function decorateMeal(item) {
  return Object.assign({}, item, {
    meal_label: mealLabel(item.meal_type),
    recipe: decorateRecipe(item.recipe)
  });
}

Page({
  data: {
    goalOptions: GOAL_OPTIONS.slice(1),
    goalIndex: 0,
    calorieMin: 1500,
    calorieMax: 1800,
    meals: [],
    total: null,
    withinRange: false,
    loading: false,
    adding: false
  },

  onLoad() {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "一日饮食计划" });
    const goal = getGoal() || {};
    const goalIndex = Math.max(this.data.goalOptions.findIndex((item) => item.value === goal.goal_type), 0);
    const target = Number(goal.daily_calorie_target || 1650);
    this.setData({
      goalIndex,
      calorieMin: Math.max(800, Math.round((target - 150) / 50) * 50),
      calorieMax: Math.min(5000, Math.round((target + 150) / 50) * 50)
    });
  },

  changeGoal(event) {
    this.setData({ goalIndex: Number(event.detail.value || 0), meals: [], total: null, withinRange: false });
  },

  inputCalorie(event) {
    this.setData({
      [event.currentTarget.dataset.field]: event.detail.value,
      meals: [],
      total: null,
      withinRange: false
    });
  },

  async generatePlan() {
    if (this.data.loading) return;
    const calorieMin = Number(this.data.calorieMin);
    const calorieMax = Number(this.data.calorieMax);
    if (!Number.isFinite(calorieMin) || !Number.isFinite(calorieMax) || calorieMin < 800 || calorieMax > 5000 || calorieMin >= calorieMax) {
      wx.showToast({ title: "请填写 800-5000 千卡内的有效区间", icon: "none", duration: 2500 });
      return;
    }
    this.setData({ loading: true, meals: [], total: null, withinRange: false });
    try {
      const result = await callFunction("recipe", {
        action: "mealPlan",
        goal: this.data.goalOptions[this.data.goalIndex].value,
        calorie_min: calorieMin,
        calorie_max: calorieMax
      }, { loadingText: "生成计划" });
      this.setData({
        meals: (result.meals || []).map(decorateMeal),
        total: result.total,
        withinRange: Boolean(result.within_range)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async replaceMeal(event) {
    const mealType = event.currentTarget.dataset.meal;
    const result = await callFunction("recipe", {
      action: "replaceMeal",
      goal: this.data.goalOptions[this.data.goalIndex].value,
      calorie_min: Number(this.data.calorieMin),
      calorie_max: Number(this.data.calorieMax),
      meal_type: mealType,
      selections: this.data.meals.map((item) => ({ meal_type: item.meal_type, recipe_id: item.recipe._id }))
    }, { loadingText: "替换食谱" });
    const meals = this.data.meals.map((item) => item.meal_type === mealType
      ? decorateMeal({ meal_type: mealType, recipe: result.recipe })
      : item);
    const total = sumNutrition(meals.map((item) => item.recipe));
    this.setData({
      meals,
      total,
      withinRange: total.calorie >= Number(this.data.calorieMin) && total.calorie <= Number(this.data.calorieMax)
    });
  },

  openRecipe(event) {
    wx.navigateTo({ url: `/pages/recipe/detail/index?id=${event.currentTarget.dataset.id}` });
  },

  async addToday() {
    if (this.data.adding || this.data.meals.length !== 4) return;
    this.setData({ adding: true });
    try {
      await callFunction("recipe", {
        action: "addMealPlan",
        selections: this.data.meals.map((item) => ({ meal_type: item.meal_type, recipe_id: item.recipe._id }))
      }, { loadingText: "加入今日饮食" });
      wx.showToast({ title: "一日计划已加入", icon: "success" });
      setTimeout(() => wx.navigateTo({ url: "/pages/diet/detail/index" }), 500);
    } finally {
      this.setData({ adding: false });
    }
  }
});

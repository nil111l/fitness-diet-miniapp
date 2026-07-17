const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { MEAL_OPTIONS, decorateRecipe, scaleRecipe } = require("../../../utils/recipe");

Page({
  data: {
    recipeId: "",
    recipe: null,
    displayRecipe: null,
    servings: 1,
    mealOptions: MEAL_OPTIONS.slice(1),
    loading: true,
    loadFailed: false,
    addingMeal: ""
  },

  onLoad(options) {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "食谱详情" });
    this.setData({ recipeId: options.id || "" });
    this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const recipe = decorateRecipe(await callFunction("recipe", {
        action: "detail",
        recipe_id: this.data.recipeId
      }, { loadingText: "加载食谱" }));
      this.setData({ recipe, displayRecipe: scaleRecipe(recipe, 1) });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  retry() {
    this.loadDetail();
  },

  changeServings(event) {
    const next = Math.min(5, Math.max(0.5, Number(this.data.servings) + Number(event.currentTarget.dataset.delta)));
    this.setData({ servings: next, displayRecipe: scaleRecipe(this.data.recipe, next) });
  },

  async addToMeal(event) {
    const mealType = event.currentTarget.dataset.meal;
    if (this.data.addingMeal) return;
    this.setData({ addingMeal: mealType });
    try {
      await callFunction("recipe", {
        action: "addToMeal",
        recipe_id: this.data.recipeId,
        meal_type: mealType,
        servings: this.data.servings
      }, { loadingText: "加入今日饮食" });
      wx.showToast({ title: "已加入今日饮食", icon: "success" });
      setTimeout(() => wx.navigateTo({ url: "/pages/diet/detail/index" }), 500);
    } finally {
      this.setData({ addingMeal: "" });
    }
  }
});

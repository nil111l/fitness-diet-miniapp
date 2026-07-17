const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { GOAL_OPTIONS, MEAL_OPTIONS, decorateRecipe } = require("../../../utils/recipe");

Page({
  data: {
    goalOptions: GOAL_OPTIONS,
    mealOptions: MEAL_OPTIONS,
    tagOptions: [{ _id: "", name: "全部标签" }],
    goalIndex: 0,
    mealIndex: 0,
    tagIndex: 0,
    recipes: [],
    page: 1,
    hasMore: false,
    loading: true,
    loadFailed: false
  },

  onLoad() {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "食谱推荐" });
    this.loadInitial();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadRecipes(false);
  },

  async loadInitial() {
    this.setData({ loadFailed: false });
    try {
      const result = await callFunction("recipe", { action: "filters" }, { loadingText: "加载食谱" });
      this.setData({ tagOptions: [{ _id: "", name: "全部标签" }].concat(result.tags || []) });
      await this.loadRecipes(true);
    } catch (error) {
      this.setData({ loading: false, loadFailed: true });
    }
  },

  async loadRecipes(reset) {
    if (this.data.loading && !reset) return;
    const page = reset ? 1 : this.data.page;
    this.setData(reset ? { loading: true, recipes: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("recipe", {
        action: "list",
        page,
        page_size: 10,
        goal: this.data.goalOptions[this.data.goalIndex].value,
        meal_type: this.data.mealOptions[this.data.mealIndex].value,
        tag_id: this.data.tagOptions[this.data.tagIndex]._id
      }, { showLoading: reset, loadingText: "加载食谱" });
      const items = (result.items || []).map(decorateRecipe);
      this.setData({
        recipes: reset ? items : this.data.recipes.concat(items),
        page: page + 1,
        hasMore: Boolean(result.has_more),
        loadFailed: false
      });
    } catch (error) {
      if (!this.data.recipes.length) this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  changeGoal(event) {
    this.setData({ goalIndex: Number(event.detail.value || 0) });
    this.loadRecipes(true);
  },

  changeMeal(event) {
    this.setData({ mealIndex: Number(event.detail.value || 0) });
    this.loadRecipes(true);
  },

  changeTag(event) {
    this.setData({ tagIndex: Number(event.detail.value || 0) });
    this.loadRecipes(true);
  },

  resetFilters() {
    this.setData({ goalIndex: 0, mealIndex: 0, tagIndex: 0 });
    this.loadRecipes(true);
  },

  retry() {
    this.loadInitial();
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/recipe/detail/index?id=${event.currentTarget.dataset.id}` });
  },

  openMealPlan() {
    wx.navigateTo({ url: "/pages/meal-plan/index" });
  }
});

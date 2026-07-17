const { callFunction } = require("../../../utils/cloud");
const { MEAL_OPTIONS, getMealIndex } = require("../../../utils/meal");
const { startQuickDiet } = require("../../../utils/quick-diet");

Page({
  data: {
    items: [],
    page: 1,
    hasMore: false,
    loading: false,
    mealOptions: MEAL_OPTIONS,
    mealIndex: 0
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: "最近记录" });
    this.setData({ mealIndex: getMealIndex(query && query.meal) });
  },

  onShow() {
    this.loadRecent(true);
  },

  async loadRecent(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("diet", { action: "recentFoods", page, page_size: 20 }, { loadingText: "加载最近记录" });
      this.setData({
        items: reset ? result.items : this.data.items.concat(result.items),
        page: page + 1,
        hasMore: result.has_more
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadRecent(false);
  },

  handleMeal(event) {
    this.setData({ mealIndex: Number(event.detail.value) });
  },

  quickAdd(event) {
    startQuickDiet(event.currentTarget.dataset.item, MEAL_OPTIONS[this.data.mealIndex].value);
  },

  goSearch() {
    wx.navigateTo({ url: `/pages/food/search/index?meal=${MEAL_OPTIONS[this.data.mealIndex].value}` });
  }
});

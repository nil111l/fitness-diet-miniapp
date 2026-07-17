const { callFunction } = require("../../../utils/cloud");
const { showSuccess } = require("../../../utils/toast");
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
    wx.setNavigationBarTitle({ title: "常吃食物" });
    this.setData({ mealIndex: getMealIndex(query && query.meal) });
  },

  onShow() {
    this.loadFavorites(true);
  },

  async loadFavorites(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("diet", { action: "favorites", page, page_size: 20 }, { loadingText: "加载常吃" });
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
    if (this.data.hasMore) this.loadFavorites(false);
  },

  handleMeal(event) {
    this.setData({ mealIndex: Number(event.detail.value) });
  },

  quickAdd(event) {
    const item = event.currentTarget.dataset.item;
    startQuickDiet(item, MEAL_OPTIONS[this.data.mealIndex].value);
  },

  removeFavorite(event) {
    const item = event.currentTarget.dataset.item;
    wx.showModal({
      title: "取消常吃",
      content: `确认将“${item.food_name}”移出常吃食物？`,
      confirmText: "取消常吃",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("diet", { action: "setFavorite", food_id: item.food_id, favorite: false }, { loadingText: "处理中" });
        showSuccess("已取消常吃");
        this.loadFavorites(true);
      }
    });
  },

  goSearch() {
    wx.navigateTo({ url: `/pages/food/search/index?meal=${MEAL_OPTIONS[this.data.mealIndex].value}` });
  }
});

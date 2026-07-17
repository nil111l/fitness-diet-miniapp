const { callFunction } = require("../../../utils/cloud");
const { decorateRecipe } = require("../../../utils/recipe");

Page({
  data: {
    keyword: "",
    recipes: [],
    page: 1,
    hasMore: false,
    loading: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "食谱管理" });
    this.loadRecipes(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadRecipes(false);
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  async loadRecipes(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("recipe", {
        action: "adminList",
        keyword: this.data.keyword,
        page,
        page_size: 10
      }, { showLoading: reset, loadingText: "加载食谱" });
      const items = (result.items || []).map(decorateRecipe);
      this.setData({
        recipes: reset ? items : this.data.recipes.concat(items),
        page: page + 1,
        hasMore: Boolean(result.has_more)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  createRecipe() {
    wx.navigateTo({ url: "/pages/admin/recipes/edit/index" });
  },

  editRecipe(event) {
    wx.navigateTo({ url: `/pages/admin/recipes/edit/index?id=${event.currentTarget.dataset.id}` });
  },

  manageTags() {
    wx.navigateTo({ url: "/pages/admin/recipe-tags/index" });
  },

  toggleStatus(event) {
    const item = event.currentTarget.dataset.item;
    const status = item.status === "active" ? "inactive" : "active";
    const actionText = status === "active" ? "上架" : "下架";
    wx.showModal({
      title: `${actionText}食谱`,
      content: `确认${actionText}“${item.name}”？`,
      confirmText: actionText,
      confirmColor: status === "active" ? "#16a05d" : "#d93025",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("recipe", {
          action: "adminUpdateStatus",
          recipe_id: item._id,
          status
        }, { loadingText: "处理中" });
        this.loadRecipes(true);
      }
    });
  },

  async toggleRecommended(event) {
    const item = event.currentTarget.dataset.item;
    await callFunction("recipe", {
      action: "adminSetRecommended",
      recipe_id: item._id,
      is_recommended: !item.is_recommended
    }, { loadingText: "保存设置" });
    this.loadRecipes(true);
  }
});

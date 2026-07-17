const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { ACTION_CATEGORIES, decorateAction } = require("../../../utils/workout");

Page({
  data: {
    categories: ACTION_CATEGORIES,
    selectedCategory: "",
    keyword: "",
    actions: [],
    page: 1,
    hasMore: false,
    loading: false,
    loadFailed: false
  },

  onLoad() {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "动作库" });
    this.loadActions(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadActions(false);
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  search() {
    this.loadActions(true);
  },

  selectCategory(event) {
    this.setData({ selectedCategory: event.currentTarget.dataset.value });
    this.loadActions(true);
  },

  clearFilters() {
    this.setData({ selectedCategory: "", keyword: "" });
    this.loadActions(true);
  },

  async loadActions(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData(reset ? { loading: true, actions: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("workout", {
        action: "actionList",
        keyword: this.data.keyword,
        category: this.data.selectedCategory,
        page,
        page_size: 10
      }, { showLoading: reset, loadingText: "加载动作" });
      const items = (result.items || []).map(decorateAction);
      this.setData({
        actions: reset ? items : this.data.actions.concat(items),
        page: page + 1,
        hasMore: Boolean(result.has_more),
        loadFailed: false
      });
    } catch (error) {
      if (!this.data.actions.length) this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/workout/action-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});

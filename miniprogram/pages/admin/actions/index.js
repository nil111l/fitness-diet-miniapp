const { callFunction } = require("../../../utils/cloud");
const { decorateAction } = require("../../../utils/workout");

Page({
  data: { keyword: "", actions: [], page: 1, hasMore: false, loading: false },

  onShow() {
    wx.setNavigationBarTitle({ title: "动作管理" });
    this.loadActions(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadActions(false);
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  async loadActions(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("workout", { action: "adminActionList", keyword: this.data.keyword, page, page_size: 10 }, { showLoading: reset, loadingText: "加载动作" });
      const items = (result.items || []).map(decorateAction);
      this.setData({ actions: reset ? items : this.data.actions.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } finally {
      this.setData({ loading: false });
    }
  },

  createAction() {
    wx.navigateTo({ url: "/pages/admin/actions/edit/index" });
  },

  editAction(event) {
    wx.navigateTo({ url: `/pages/admin/actions/edit/index?id=${event.currentTarget.dataset.id}` });
  },

  toggleStatus(event) {
    const item = event.currentTarget.dataset.item;
    const status = item.status === "active" ? "inactive" : "active";
    const actionText = status === "active" ? "上架" : "下架";
    wx.showModal({
      title: `${actionText}动作`,
      content: `确认${actionText}“${item.name}”？`,
      confirmText: actionText,
      confirmColor: status === "active" ? "#16a05d" : "#d93025",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("workout", { action: "adminUpdateActionStatus", action_id: item._id, status }, { loadingText: "处理中" });
        this.loadActions(true);
      }
    });
  }
});

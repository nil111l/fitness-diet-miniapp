const { callFunction } = require("../../../utils/cloud");
const { decoratePlan } = require("../../../utils/workout");

Page({
  data: { keyword: "", plans: [], page: 1, hasMore: false, loading: false },

  onShow() {
    wx.setNavigationBarTitle({ title: "训练计划管理" });
    this.loadPlans(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadPlans(false);
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  async loadPlans(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("workout", { action: "adminPlanList", keyword: this.data.keyword, page, page_size: 10 }, { showLoading: reset, loadingText: "加载计划" });
      const items = (result.items || []).map(decoratePlan);
      this.setData({ plans: reset ? items : this.data.plans.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } finally {
      this.setData({ loading: false });
    }
  },

  createPlan() {
    wx.navigateTo({ url: "/pages/admin/workout-plans/edit/index" });
  },

  editPlan(event) {
    wx.navigateTo({ url: `/pages/admin/workout-plans/edit/index?id=${event.currentTarget.dataset.id}` });
  },

  toggleStatus(event) {
    const item = event.currentTarget.dataset.item;
    const status = item.status === "active" ? "inactive" : "active";
    const actionText = status === "active" ? "上架" : "下架";
    wx.showModal({
      title: `${actionText}训练计划`,
      content: `确认${actionText}“${item.name}”？`,
      confirmText: actionText,
      confirmColor: status === "active" ? "#16a05d" : "#d93025",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("workout", { action: "adminUpdatePlanStatus", plan_id: item._id, status }, { loadingText: "处理中" });
        this.loadPlans(true);
      }
    });
  }
});

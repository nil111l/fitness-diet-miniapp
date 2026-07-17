const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { PLAN_TYPES, decoratePlan } = require("../../../utils/workout");

Page({
  data: {
    planTypes: PLAN_TYPES,
    selectedType: "",
    plans: [],
    page: 1,
    hasMore: false,
    loading: false,
    loadFailed: false
  },

  onLoad() {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "训练计划" });
    this.loadPlans(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadPlans(false);
  },

  selectType(event) {
    this.setData({ selectedType: event.currentTarget.dataset.value });
    this.loadPlans(true);
  },

  clearFilter() {
    this.setData({ selectedType: "" });
    this.loadPlans(true);
  },

  async loadPlans(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData(reset ? { loading: true, plans: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("workout", {
        action: "planList",
        plan_type: this.data.selectedType,
        page,
        page_size: 10
      }, { showLoading: reset, loadingText: "加载计划" });
      const items = (result.items || []).map(decoratePlan);
      this.setData({ plans: reset ? items : this.data.plans.concat(items), page: page + 1, hasMore: Boolean(result.has_more), loadFailed: false });
    } catch (error) {
      if (!this.data.plans.length) this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/workout/plan-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});

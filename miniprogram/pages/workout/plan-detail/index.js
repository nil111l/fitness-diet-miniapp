const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { decoratePlan } = require("../../../utils/workout");

Page({
  data: { planId: "", plan: null, loading: true, loadFailed: false, selecting: false },

  onLoad(options) {
    if (!requireLogin()) return;
    this.setData({ planId: options.id || "" });
    wx.setNavigationBarTitle({ title: "计划详情" });
  },

  onShow() {
    if (this.data.planId) this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const plan = await callFunction("workout", { action: "planDetail", plan_id: this.data.planId }, { loadingText: "加载计划" });
      this.setData({ plan: decoratePlan(plan) });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  openAction(event) {
    wx.navigateTo({ url: `/pages/workout/action-detail/index?id=${event.currentTarget.dataset.id}` });
  },

  selectPlan() {
    if (this.data.selecting || this.data.plan.is_current) return;
    wx.showModal({
      title: "设为当前计划",
      content: `确认将“${this.data.plan.name}”设为当前训练计划？`,
      confirmText: "确认选择",
      confirmColor: "#16a05d",
      success: async (result) => {
        if (!result.confirm) return;
        this.setData({ selecting: true });
        try {
          await callFunction("workout", { action: "selectPlan", plan_id: this.data.planId }, { loadingText: "保存计划" });
          this.setData({ "plan.is_current": true });
          wx.showToast({ title: "已设为当前计划", icon: "success" });
        } finally {
          this.setData({ selecting: false });
        }
      }
    });
  },

  startToday() {
    wx.navigateTo({ url: "/pages/workout/today/index" });
  }
});

const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    overview: {},
    metrics: [],
    entries: [
      { title: "用户管理", url: "/pages/admin/users/index" },
      { title: "食材分类", url: "/pages/admin/categories/index" },
      { title: "食材管理", url: "/pages/admin/foods/index" },
      { title: "食谱管理", url: "/pages/admin/recipes/index" },
      { title: "动作管理", url: "/pages/admin/actions/index" },
      { title: "训练计划管理", url: "/pages/admin/workout-plans/index" },
      { title: "反馈管理", url: "/pages/admin/feedback/index" }
    ]
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "数据概览" });
    this.loadOverview();
  },

  async loadOverview() {
    const overview = await callFunction("admin", { action: "overview" }, { loadingText: "刷新中" });
    this.setData({
      overview,
      metrics: [
        { label: "总用户数", value: overview.total_users || 0 },
        { label: "今日新增", value: overview.today_new_users || 0 },
        { label: "今日饮食", value: overview.today_diet_records || 0 },
        { label: "今日运动", value: overview.today_exercise_records || 0 },
        { label: "今日体重", value: overview.today_body_records || 0 },
        { label: "待处理反馈", value: overview.pending_feedbacks || 0 }
      ]
    });
  },

  goPage(event) {
    wx.navigateTo({ url: event.currentTarget.dataset.url });
  }
});

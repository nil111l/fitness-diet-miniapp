const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");

Page({
  data: { result: null, loading: true, loadFailed: false },
  onLoad() { if (!requireLogin()) return; this.loadInsights(); },
  async loadInsights() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const result = await callFunction("insights", { action: "dietInsights" }, { loadingText: "分析近期记录" });
      this.setData({ result });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  goDiet() { wx.navigateTo({ url: "/pages/food/search/index" }); }
});

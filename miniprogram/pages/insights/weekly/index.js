const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");

Page({
  data: { summary: null, loading: true, loadFailed: false },
  onLoad() { if (!requireLogin()) return; this.loadSummary(); },
  async loadSummary() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const summary = await callFunction("insights", { action: "weekly" }, { loadingText: "生成本周总结" });
      this.setData({ summary });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  goDiet() { wx.navigateTo({ url: "/pages/food/search/index" }); },
  goRecord() { wx.switchTab({ url: "/pages/record/index" }); }
});

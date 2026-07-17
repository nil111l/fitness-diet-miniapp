const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { decorateAction } = require("../../../utils/workout");

Page({
  data: { actionId: "", action: null, loading: true, loadFailed: false },

  onLoad(options) {
    if (!requireLogin()) return;
    this.setData({ actionId: options.id || "" });
    wx.setNavigationBarTitle({ title: "动作详情" });
    this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const action = await callFunction("workout", { action: "actionDetail", action_id: this.data.actionId }, { loadingText: "加载动作" });
      this.setData({ action: decorateAction(action) });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  }
});

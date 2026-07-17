const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");

const GOAL_LABELS = { lose_weight: "减脂", gain_muscle: "增肌", maintain: "保持健康" };

Page({
  data: { progress: null, loading: true, loadFailed: false, goalText: "当前目标" },
  onLoad() { if (!requireLogin()) return; this.loadProgress(); },
  async loadProgress() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const progress = await callFunction("insights", { action: "targetProgress" }, { loadingText: "加载目标进度" });
      this.setData({ progress, goalText: progress.goal ? (GOAL_LABELS[progress.goal.goal_type] || "当前目标") : "当前目标" });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  goGoal() { wx.navigateTo({ url: "/pages/goal/edit/index" }); },
  goRecord() { wx.switchTab({ url: "/pages/record/index" }); }
});

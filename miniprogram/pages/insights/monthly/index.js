const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month, offset) {
  const parts = month.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

Page({
  data: { month: currentMonth(), currentMonth: currentMonth(), canNext: false, summary: null, loading: true, loadFailed: false },
  onLoad() { if (!requireLogin()) return; this.loadSummary(); },
  previousMonth() { if (this.data.loading) return; const month = shiftMonth(this.data.month, -1); this.setData({ month, canNext: true }); this.loadSummary(); },
  nextMonth() { if (this.data.loading || !this.data.canNext) return; const month = shiftMonth(this.data.month, 1); this.setData({ month, canNext: month < this.data.currentMonth }); this.loadSummary(); },
  async loadSummary() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const summary = await callFunction("insights", { action: "monthly", month: this.data.month }, { loadingText: "生成月度总结" });
      this.setData({ summary });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  goRecord() { wx.switchTab({ url: "/pages/record/index" }); }
});

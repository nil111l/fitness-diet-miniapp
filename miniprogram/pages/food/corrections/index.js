const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { decorateCorrection } = require("../../../utils/content");

Page({
  data: { records: [], page: 1, hasMore: false, loading: false, loadFailed: false },
  onLoad() { if (!requireLogin()) return; this.loadRecords(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadRecords(false); },
  async loadRecords(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData(reset ? { loading: true, records: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("content", { action: "myCorrections", page, page_size: 10 }, { showLoading: reset, loadingText: "加载纠错记录" });
      const items = (result.items || []).map(decorateCorrection);
      this.setData({ records: reset ? items : this.data.records.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } catch (error) {
      if (!this.data.records.length) this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  goFoodSearch() { wx.navigateBack(); }
});

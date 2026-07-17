const { callFunction } = require("../../../utils/cloud");
const { CORRECTION_STATUSES, decorateCorrection } = require("../../../utils/content");

Page({
  data: { statuses: [{ label: "全部状态", value: "" }].concat(CORRECTION_STATUSES), statusIndex: 0, records: [], page: 1, hasMore: false, loading: false, loadFailed: false },
  onShow() { this.loadRecords(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadRecords(false); },
  changeStatus(event) { this.setData({ statusIndex: Number(event.detail.value || 0) }); this.loadRecords(true); },
  async loadRecords(reset) {
    if (reset === false && this.data.loading) return;
    const page = reset === false ? this.data.page : 1;
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    this.setData(page === 1 ? { loading: true, records: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("content", { action: "adminCorrectionList", status: this.data.statuses[this.data.statusIndex].value, page, page_size: 10 }, { showLoading: false });
      if (requestId !== this._requestId) return;
      const items = (result.items || []).map(decorateCorrection);
      this.setData({ records: page === 1 ? items : this.data.records.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } catch (error) {
      if (requestId === this._requestId && !this.data.records.length) this.setData({ loadFailed: true });
    } finally {
      if (requestId === this._requestId) this.setData({ loading: false });
    }
  },
  openDetail(event) { wx.navigateTo({ url: `/pages/admin/food-corrections/detail/index?id=${event.currentTarget.dataset.id}` }); }
});

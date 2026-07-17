const { callFunction } = require("../../../utils/cloud");
const { decorateArticle } = require("../../../utils/content");

Page({
  data: { keyword: "", articles: [], page: 1, hasMore: false, loading: false, loadFailed: false },
  onShow() { this.loadArticles(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadArticles(false); },
  inputKeyword(event) { this.setData({ keyword: event.detail.value }); },
  async loadArticles(reset) {
    if (reset === false && this.data.loading) return;
    const page = reset === false ? this.data.page : 1;
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    this.setData(page === 1 ? { loading: true, articles: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("content", { action: "adminArticleList", keyword: this.data.keyword, page, page_size: 10 }, { showLoading: false });
      if (requestId !== this._requestId) return;
      const items = (result.items || []).map(decorateArticle);
      this.setData({ articles: page === 1 ? items : this.data.articles.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } catch (error) {
      if (requestId === this._requestId && !this.data.articles.length) this.setData({ loadFailed: true });
    } finally {
      if (requestId === this._requestId) this.setData({ loading: false });
    }
  },
  createArticle() { wx.navigateTo({ url: "/pages/admin/articles/edit/index" }); },
  editArticle(event) { wx.navigateTo({ url: `/pages/admin/articles/edit/index?id=${event.currentTarget.dataset.id}` }); },
  toggleStatus(event) {
    const item = event.currentTarget.dataset.item;
    const status = item.status === "active" ? "inactive" : "active";
    const text = status === "active" ? "上架" : "下架";
    wx.showModal({ title: `${text}文章`, content: `确认${text}“${item.title}”？`, confirmText: text, confirmColor: status === "active" ? "#16a05d" : "#d93025", success: async (result) => { if (!result.confirm) return; await callFunction("content", { action: "adminUpdateArticleStatus", article_id: item._id, status }, { loadingText: "处理中" }); this.loadArticles(true); } });
  },
  async toggleRecommended(event) {
    const item = event.currentTarget.dataset.item;
    await callFunction("content", { action: "adminSetArticleRecommended", article_id: item._id, is_recommended: !item.is_recommended }, { loadingText: "保存推荐" });
    this.loadArticles(true);
  }
});

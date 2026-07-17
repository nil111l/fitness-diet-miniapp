const { callFunction } = require("../../utils/cloud");
const { requireLogin } = require("../../utils/auth");
const { ARTICLE_CATEGORIES, decorateArticle } = require("../../utils/content");

Page({
  data: { categories: ARTICLE_CATEGORIES, selectedCategory: "", keyword: "", articles: [], page: 1, hasMore: false, loading: false, loadFailed: false },
  onLoad() { if (!requireLogin()) return; this.loadArticles(true); },
  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.loadArticles(false); },
  inputKeyword(event) { this.setData({ keyword: event.detail.value }); },
  search() { this.loadArticles(true); },
  selectCategory(event) { this.setData({ selectedCategory: event.currentTarget.dataset.value }); this.loadArticles(true); },
  async loadArticles(reset) {
    if (!reset && this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    const requestId = (this._requestId || 0) + 1;
    this._requestId = requestId;
    this.setData(reset ? { loading: true, articles: [], loadFailed: false } : { loading: true });
    try {
      const result = await callFunction("content", { action: "articleList", category: this.data.selectedCategory, keyword: this.data.keyword, page, page_size: 10 }, { showLoading: false });
      if (requestId !== this._requestId) return;
      const items = (result.items || []).map(decorateArticle);
      this.setData({ articles: reset ? items : this.data.articles.concat(items), page: page + 1, hasMore: Boolean(result.has_more) });
    } catch (error) {
      if (requestId === this._requestId && !this.data.articles.length) this.setData({ loadFailed: true });
    } finally {
      if (requestId === this._requestId) this.setData({ loading: false });
    }
  },
  openArticle(event) { wx.navigateTo({ url: `/pages/articles/detail/index?id=${event.currentTarget.dataset.id}` }); },
  clearFilters() { this.setData({ keyword: "", selectedCategory: "" }); this.loadArticles(true); }
});

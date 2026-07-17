const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { decorateArticle } = require("../../../utils/content");

Page({
  data: { articleId: "", article: null, loading: true, loadFailed: false },
  onLoad(options) { if (!requireLogin()) return; this.setData({ articleId: options.id || "" }); this.loadArticle(); },
  async loadArticle() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const article = await callFunction("content", { action: "articleDetail", article_id: this.data.articleId }, { loadingText: "加载文章" });
      this.setData({ article: decorateArticle(article) });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  }
});

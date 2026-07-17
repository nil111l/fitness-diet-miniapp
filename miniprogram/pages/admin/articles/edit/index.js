const { callFunction } = require("../../../../utils/cloud");
const { ARTICLE_CATEGORIES } = require("../../../../utils/content");

function createForm() { return { title: "", summary: "", category: "diet", cover_url: "", content_text: "", status: "inactive", is_recommended: false, sort_order: 0 }; }

Page({
  data: { articleId: "", form: createForm(), categories: ARTICLE_CATEGORIES.slice(1), categoryIndex: 0, loading: true, loadFailed: false, saving: false },
  onLoad(options) { const articleId = options.id || ""; this.setData({ articleId }); wx.setNavigationBarTitle({ title: articleId ? "编辑文章" : "新增文章" }); this.loadPage(); },
  async loadPage() {
    this.setData({ loading: true, loadFailed: false });
    try {
      if (!this.data.articleId) return;
      const article = await callFunction("content", { action: "adminArticleDetail", article_id: this.data.articleId }, { loadingText: "加载文章" });
      const form = Object.assign(createForm(), article, { content_text: (article.content || []).join("\n\n") });
      this.setData({ form, categoryIndex: Math.max(this.data.categories.findIndex((item) => item.value === form.category), 0) });
    } catch (error) { this.setData({ loadFailed: true }); }
    finally { this.setData({ loading: false }); }
  },
  inputField(event) { this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value }); },
  changeCategory(event) { const index = Number(event.detail.value || 0); this.setData({ categoryIndex: index, "form.category": this.data.categories[index].value }); },
  toggleStatus(event) { this.setData({ "form.status": event.detail.value ? "active" : "inactive" }); },
  toggleRecommended(event) { this.setData({ "form.is_recommended": event.detail.value }); },
  validate() {
    const form = this.data.form; let message = "";
    if (!String(form.title || "").trim()) message = "请填写文章标题";
    else if (!String(form.summary || "").trim()) message = "请填写文章摘要";
    else if (!String(form.content_text || "").trim()) message = "请填写文章正文";
    else if (form.cover_url && !String(form.cover_url).startsWith("https://") && !String(form.cover_url).startsWith("cloud://")) message = "封面地址仅支持 https:// 或 cloud://";
    if (!message) return true; wx.showToast({ title: message, icon: "none" }); return false;
  },
  async saveArticle() {
    if (this.data.saving || !this.validate()) return;
    this.setData({ saving: true });
    try {
      const form = this.data.form;
      await callFunction("content", { action: "adminSaveArticle", article: { _id: this.data.articleId || undefined, title: form.title, summary: form.summary, category: form.category, cover_url: form.cover_url, content: String(form.content_text).split(/\n\s*\n|\r?\n/).map((item) => item.trim()).filter(Boolean), status: form.status, is_recommended: form.is_recommended, sort_order: Number(form.sort_order || 0) } }, { loadingText: "保存文章" });
      wx.showToast({ title: "文章已保存", icon: "success" }); setTimeout(() => wx.navigateBack(), 500);
    } finally { this.setData({ saving: false }); }
  }
});

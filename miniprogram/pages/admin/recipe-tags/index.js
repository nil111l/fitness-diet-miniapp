const { callFunction } = require("../../../utils/cloud");

function emptyForm() {
  return { name: "", sort_order: 0, status: "active" };
}

Page({
  data: {
    tags: [],
    form: emptyForm(),
    loading: false,
    page: 1,
    hasMore: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "食谱标签" });
    this.loadTags(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.loadTags(false);
  },

  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  editTag(event) {
    this.setData({ form: Object.assign({}, event.currentTarget.dataset.item) });
  },

  resetForm() {
    this.setData({ form: emptyForm() });
  },

  async loadTags(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("recipe", { action: "adminListTags", page, page_size: 20 }, { showLoading: reset, loadingText: "加载标签" });
      this.setData({
        tags: reset ? (result.items || []) : this.data.tags.concat(result.items || []),
        page: page + 1,
        hasMore: Boolean(result.has_more)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async saveTag() {
    if (!String(this.data.form.name || "").trim()) {
      wx.showToast({ title: "请填写标签名称", icon: "none" });
      return;
    }
    await callFunction("recipe", { action: "adminSaveTag", tag: this.data.form }, { loadingText: "保存标签" });
    this.resetForm();
    this.loadTags(true);
  },

  async toggleTag(event) {
    const item = event.currentTarget.dataset.item;
    await callFunction("recipe", {
      action: "adminSaveTag",
      tag: Object.assign({}, item, { status: item.status === "active" ? "inactive" : "active" })
    }, { loadingText: "更新标签" });
    this.loadTags(true);
  },

  removeTag(event) {
    const item = event.currentTarget.dataset.item;
    wx.showModal({
      title: "删除标签",
      content: `确认删除“${item.name}”？已保存食谱中的标签名称不会被删除。`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("recipe", { action: "adminDeleteTag", tag_id: item._id }, { loadingText: "删除标签" });
        this.loadTags(true);
      }
    });
  }
});

const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    categories: [],
    form: { name: "", sort_order: 0, status: "active" }
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "食材分类" });
    this.loadCategories();
  },

  inputName(event) {
    this.setData({ "form.name": event.detail.value });
  },

  inputSort(event) {
    this.setData({ "form.sort_order": event.detail.value });
  },

  edit(event) {
    const item = event.currentTarget.dataset.item;
    this.setData({ form: Object.assign({}, item) });
  },

  async save() {
    await callFunction("admin", { action: "saveCategory", category: this.data.form }, { loadingText: "保存中" });
    this.setData({ form: { name: "", sort_order: 0, status: "active" } });
    this.loadCategories();
  },

  toggle(event) {
    const item = event.currentTarget.dataset.item;
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const actionName = nextStatus === "inactive" ? "下架" : "上架";
    wx.showModal({
      title: `${actionName}分类`,
      content: `确认${actionName}“${item.name}”？`,
      confirmText: actionName,
      confirmColor: nextStatus === "inactive" ? "#d93025" : "#16a05d",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("admin", {
          action: "saveCategory",
          category: Object.assign({}, item, { status: nextStatus })
        }, { loadingText: "处理中" });
        this.loadCategories();
      }
    });
  },

  remove(event) {
    const item = event.currentTarget.dataset.item;
    wx.showModal({
      title: "删除分类",
      content: `确认删除“${item.name}”？`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("admin", { action: "deleteCategory", category_id: item._id }, { loadingText: "删除中" });
        this.loadCategories();
      }
    });
  },

  async loadCategories() {
    const categories = await callFunction("admin", { action: "listCategories" }, { loadingText: "加载中" });
    this.setData({ categories });
  }
});

const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    keyword: "",
    foods: [],
    categories: [],
    categoryIndex: 0,
    form: {
      name: "",
      category_id: "",
      calorie_per_100g: "",
      protein_per_100g: "",
      carb_per_100g: "",
      fat_per_100g: "",
      status: "active"
    }
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "食材管理" });
    this.loadAll();
  },

  async loadAll() {
    const categories = await callFunction("admin", { action: "listCategories" }, { showLoading: false });
    const foods = await callFunction("admin", { action: "listFoods", keyword: this.data.keyword }, { loadingText: "加载中" });
    this.setData({ categories, foods });
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  inputField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  changeCategory(event) {
    const index = Number(event.detail.value || 0);
    const category = this.data.categories[index] || {};
    this.setData({ categoryIndex: index, "form.category_id": category._id || "" });
  },

  edit(event) {
    const item = event.currentTarget.dataset.item;
    const index = Math.max(this.data.categories.findIndex((category) => category._id === item.category_id), 0);
    this.setData({ form: Object.assign({}, item), categoryIndex: index });
  },

  resetForm() {
    this.setData({
      form: { name: "", category_id: "", calorie_per_100g: "", protein_per_100g: "", carb_per_100g: "", fat_per_100g: "", status: "active" },
      categoryIndex: 0
    });
  },

  async save() {
    await callFunction("admin", { action: "saveFood", food: this.data.form }, { loadingText: "保存中" });
    this.resetForm();
    this.loadAll();
  },

  toggle(event) {
    const item = event.currentTarget.dataset.item;
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const actionName = nextStatus === "inactive" ? "下架" : "上架";
    wx.showModal({
      title: `${actionName}食材`,
      content: `确认${actionName}“${item.name}”？`,
      confirmText: actionName,
      confirmColor: nextStatus === "inactive" ? "#d93025" : "#16a05d",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("admin", {
          action: "updateFoodStatus",
          food_id: item._id,
          status: nextStatus
        }, { loadingText: "处理中" });
        this.loadAll();
      }
    });
  },

  remove(event) {
    const item = event.currentTarget.dataset.item;
    wx.showModal({
      title: "删除食材",
      content: `确认删除“${item.name}”？`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("admin", { action: "deleteFood", food_id: item._id }, { loadingText: "删除中" });
        this.loadAll();
      }
    });
  }
});

const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");

Page({
  data: {
    form: {
      name: "",
      calorie_per_100g: "",
      protein_per_100g: "",
      carb_per_100g: "",
      fat_per_100g: ""
    },
    meal: "",
    loading: false
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: "自定义食物" });
    this.setData({ meal: query && query.meal ? query.meal : "" });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  validate() {
    const form = this.data.form;
    if (!form.name) return "请填写食物名称";
    const fields = ["calorie_per_100g", "protein_per_100g", "carb_per_100g", "fat_per_100g"];
    for (let i = 0; i < fields.length; i += 1) {
      const value = Number(form[fields[i]]);
      if (!Number.isFinite(value) || value < 0 || value > 2000) return "营养数据需为 0-2000 的数字";
    }
    return "";
  },

  async saveFood() {
    const message = this.validate();
    if (message) {
      showError(message);
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const food = await callFunction("food", { action: "createCustom", food: this.data.form }, { loadingText: "保存中" });
      showSuccess("已保存");
      wx.setStorageSync("selected_food", food);
      wx.redirectTo({ url: this.data.meal ? `/pages/diet/add/index?meal=${this.data.meal}` : "/pages/diet/add/index" });
    } finally {
      this.setData({ loading: false });
    }
  }
});

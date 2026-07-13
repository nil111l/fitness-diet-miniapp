const { callFunction } = require("../../../utils/cloud");

Page({
  data: { foods: [] },

  onShow() {
    wx.setNavigationBarTitle({ title: "我的食物" });
    this.loadFoods();
  },

  async loadFoods() {
    const foods = await callFunction("food", { action: "listCustom" }, { loadingText: "加载中" });
    this.setData({ foods });
  },

  addFood(event) {
    wx.setStorageSync("selected_food", event.currentTarget.dataset.food);
    wx.navigateTo({ url: "/pages/diet/add/index" });
  },

  goCustom() {
    wx.navigateTo({ url: "/pages/food/custom/index" });
  }
});

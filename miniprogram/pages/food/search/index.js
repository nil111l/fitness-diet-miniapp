const { callFunction } = require("../../../utils/cloud");
const { showError } = require("../../../utils/toast");

function uniqueBy(items, getKey) {
  const seen = {};
  return (items || []).filter((item) => {
    const key = getKey(item);
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

Page({
  data: {
    keyword: "",
    categories: [{ _id: "", name: "全部分类" }],
    categoryIndex: 0,
    foods: [],
    meal: "",
    loading: false
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: "食物搜索" });
    this.setData({ meal: query && query.meal ? query.meal : "" });
    this.loadCategories();
    this.searchFoods();
  },

  async loadCategories() {
    const categories = await callFunction("food", { action: "categories" }, { loadingText: "加载分类" });
    const uniqueCategories = uniqueBy(categories, (item) => item.name || item._id);
    this.setData({ categories: [{ _id: "", name: "全部分类" }].concat(uniqueCategories) });
  },

  handleKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  handleCategory(event) {
    this.setData({ categoryIndex: Number(event.detail.value) }, () => {
      this.searchFoods();
    });
  },

  async searchFoods() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const category = this.data.categories[this.data.categoryIndex] || {};
      const foods = await callFunction("food", {
        action: "search",
        keyword: this.data.keyword,
        category_id: category._id || ""
      }, { loadingText: "搜索中" });
      const uniqueFoods = uniqueBy(foods, (item) => `${item.source || "system"}-${item.name}-${item.calorie_per_100g}-${item.protein_per_100g}-${item.carb_per_100g}-${item.fat_per_100g}`);
      this.setData({ foods: uniqueFoods });
    } finally {
      this.setData({ loading: false });
    }
  },

  addFood(event) {
    const food = event.currentTarget.dataset.food;
    if (!food) {
      showError("请选择食物");
      return;
    }
    wx.setStorageSync("selected_food", food);
    const editingRecord = wx.getStorageSync("editing_diet_record");
    if (editingRecord && editingRecord._id) {
      wx.navigateTo({ url: `/pages/diet/add/index?recordId=${editingRecord._id}` });
      return;
    }
    wx.navigateTo({ url: this.data.meal ? `/pages/diet/add/index?meal=${this.data.meal}` : "/pages/diet/add/index" });
  },

  goCustom() {
    wx.navigateTo({ url: this.data.meal ? `/pages/food/custom/index?meal=${this.data.meal}` : "/pages/food/custom/index" });
  },

  goMyFoods() {
    wx.navigateTo({ url: "/pages/food/my/index" });
  }
});

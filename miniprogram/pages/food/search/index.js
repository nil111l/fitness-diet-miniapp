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
    favorites: [],
    foods: [],
    meal: "",
    loading: false
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: "食物搜索" });
    this.setData({ meal: query && query.meal ? query.meal : "" });
    this.loadCategories();
    this.loadFavorites();
    this.searchFoods();
  },

  async loadFavorites() {
    try {
      const result = await callFunction("diet", { action: "favorites", page: 1, page_size: 6 }, { showLoading: false, silent: true });
      this.setData({ favorites: result.items.map((item) => ({
        _id: item.food_id,
        name: item.food_name,
        source: item.food_source,
        calorie_per_100g: item.calorie_per_100g,
        protein_per_100g: item.protein_per_100g,
        carb_per_100g: item.carb_per_100g,
        fat_per_100g: item.fat_per_100g,
        default_amount_g: item.default_amount_g
      })) });
    } catch (error) {
      this.setData({ favorites: [] });
    }
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
    if (food.default_amount_g) wx.setStorageSync("selected_food_amount", food.default_amount_g);
    else wx.removeStorageSync("selected_food_amount");
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
  },

  goFavorites() {
    wx.navigateTo({ url: this.data.meal ? `/pages/food/favorites/index?meal=${this.data.meal}` : "/pages/food/favorites/index" });
  },

  goRecent() {
    wx.navigateTo({ url: this.data.meal ? `/pages/diet/recent/index?meal=${this.data.meal}` : "/pages/diet/recent/index" });
  },

  correctFood(event) {
    wx.navigateTo({ url: `/pages/food/correction/index?id=${event.currentTarget.dataset.id}` });
  },

  goCorrections() {
    wx.navigateTo({ url: "/pages/food/corrections/index" });
  }
});

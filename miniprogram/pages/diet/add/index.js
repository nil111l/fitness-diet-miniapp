const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { MEAL_OPTIONS, getMealIndex } = require("../../../utils/meal");

function round1(value) {
  return Math.round(value * 10) / 10;
}

Page({
  data: {
    mode: "create",
    mealOptions: MEAL_OPTIONS,
    mealIndex: 0,
    food: null,
    form: {
      _id: "",
      food_id: "",
      meal_type: "breakfast",
      amount_g: "",
      record_date: "",
      note: ""
    },
    totals: { calorie: 0, protein: 0, carb: 0, fat: 0 },
    addToFavorites: false,
    loading: false
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: query && query.recordId ? "编辑饮食" : "添加饮食" });
    const record = wx.getStorageSync("editing_diet_record");
    const selectedFood = wx.getStorageSync("selected_food");

    if (query && query.recordId && record) {
      const food = selectedFood || {
        _id: record.food_id,
        name: record.food_name,
        calorie_per_100g: record.calorie_per_100g,
        protein_per_100g: record.protein_per_100g,
        carb_per_100g: record.carb_per_100g,
        fat_per_100g: record.fat_per_100g
      };
      this.setData({
        mode: "edit",
        food,
        mealIndex: getMealIndex(record.meal_type),
        form: {
          _id: record._id,
          food_id: food._id,
          meal_type: record.meal_type,
          amount_g: String(record.amount_g),
          record_date: record.record_date,
          note: record.note || ""
        }
      });
      this.calculate();
      return;
    }

    const meal = query && query.meal ? query.meal : "breakfast";

    if (!selectedFood) {
      showError("请先选择食物");
      wx.redirectTo({ url: "/pages/food/search/index" });
      return;
    }

    const defaultAmount = wx.getStorageSync("selected_food_amount");
    this.setData({
      food: selectedFood,
      mealIndex: getMealIndex(meal),
      form: Object.assign({}, this.data.form, {
        food_id: selectedFood._id,
        meal_type: meal,
        record_date: formatDate(),
        amount_g: defaultAmount ? String(defaultAmount) : ""
      })
    }, () => this.calculate());
  },

  handleMeal(event) {
    const index = Number(event.detail.value);
    this.setData({ mealIndex: index, "form.meal_type": MEAL_OPTIONS[index].value });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: event.detail.value });
    if (field === "amount_g") this.calculate();
  },

  handleFavorite(event) {
    this.setData({ addToFavorites: event.detail.value });
  },

  calculate() {
    const food = this.data.food;
    const amount = Number(this.data.form.amount_g);
    if (!food || !Number.isFinite(amount) || amount <= 0) {
      this.setData({ totals: { calorie: 0, protein: 0, carb: 0, fat: 0 } });
      return;
    }
    this.setData({
      totals: {
        calorie: round1(Number(food.calorie_per_100g) * amount / 100),
        protein: round1(Number(food.protein_per_100g) * amount / 100),
        carb: round1(Number(food.carb_per_100g) * amount / 100),
        fat: round1(Number(food.fat_per_100g) * amount / 100)
      }
    });
  },

  validate() {
    const amount = Number(this.data.form.amount_g);
    if (!this.data.form.food_id) return "请选择食物";
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) return "重量需在 0-5000g 之间";
    if (Math.round(amount * 10) !== amount * 10) return "重量最多支持一位小数";
    return "";
  },

  async saveRecord() {
    const message = this.validate();
    if (message) {
      showError(message);
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await callFunction("diet", {
        action: "upsert",
        record: this.data.form,
        add_to_favorites: this.data.mode === "create" && this.data.addToFavorites
      }, { loadingText: "保存中" });
      wx.removeStorageSync("selected_food");
      wx.removeStorageSync("selected_food_amount");
      wx.removeStorageSync("editing_diet_record");
      showSuccess("饮食已保存");
      wx.redirectTo({ url: "/pages/diet/detail/index" });
    } finally {
      this.setData({ loading: false });
    }
  },

  changeFood() {
    wx.navigateTo({ url: "/pages/food/search/index" });
  }
});

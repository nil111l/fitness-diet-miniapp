const { callFunction } = require("../../../utils/cloud");
const { showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { MEAL_OPTIONS, getMealLabel } = require("../../../utils/meal");

Page({
  data: {
    date: "",
    meals: [],
    records: [],
    summary: { calorie: 0, protein: 0, carb: 0, fat: 0 },
    loading: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "今日饮食" });
    this.setData({ date: formatDate() });
    this.loadRecords();
  },

  groupRecords(records) {
    const meals = MEAL_OPTIONS.map((meal) => {
      const mealRecords = records.filter((item) => item.meal_type === meal.value);
      return {
        label: meal.label,
        value: meal.value,
        records: mealRecords,
        calorie: Math.round(mealRecords.reduce((total, item) => total + Number(item.calorie || 0), 0) * 10) / 10
      };
    });
    const summary = records.reduce((total, item) => ({
      calorie: Math.round((total.calorie + Number(item.calorie || 0)) * 10) / 10,
      protein: Math.round((total.protein + Number(item.protein || 0)) * 10) / 10,
      carb: Math.round((total.carb + Number(item.carb || 0)) * 10) / 10,
      fat: Math.round((total.fat + Number(item.fat || 0)) * 10) / 10
    }), { calorie: 0, protein: 0, carb: 0, fat: 0 });
    this.setData({ meals, summary });
  },

  async loadRecords() {
    const records = await callFunction("diet", { action: "list", record_date: this.data.date || formatDate() }, { loadingText: "加载中" });
    this.setData({ records });
    this.groupRecords(records);
  },

  goAdd(event) {
    const meal = event.currentTarget.dataset.meal || "";
    wx.removeStorageSync("editing_diet_record");
    const url = meal ? `/pages/food/search/index?meal=${meal}` : "/pages/food/search/index";
    wx.navigateTo({ url });
  },

  editRecord(event) {
    const record = event.currentTarget.dataset.record;
    wx.setStorageSync("editing_diet_record", record);
    wx.navigateTo({ url: `/pages/diet/add/index?recordId=${record._id}` });
  },

  deleteRecord(event) {
    const record = event.currentTarget.dataset.record;
    wx.showModal({
      title: "删除饮食记录",
      content: `确认删除“${record.food_name || "该记录"}”？删除后首页和数据页会同步更新。`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("diet", { action: "remove", record_id: record._id }, { loadingText: "删除中" });
        showSuccess("已删除");
        this.loadRecords();
      }
    });
  },

  async copyYesterday() {
    const result = await callFunction("diet", { action: "copyYesterday" }, { loadingText: "复制中" });
    showSuccess(result.count ? `已复制 ${result.count} 条` : "昨日无记录");
    this.loadRecords();
  },

  saveMealTemplate(event) {
    const meal = event.currentTarget.dataset.meal || "";
    wx.navigateTo({ url: `/pages/diet/template-edit/index?meal=${meal}` });
  },

  goTemplates() {
    wx.navigateTo({ url: "/pages/diet/templates/index" });
  },

  mealLabel(event) {
    return getMealLabel(event);
  }
});

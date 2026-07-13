const { callFunction } = require("../../../utils/cloud");
const { showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { getIntensityLabel } = require("../../../utils/exercise");

Page({
  data: {
    date: "",
    records: [],
    totalCalories: 0
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "运动记录" });
    this.setData({ date: formatDate() });
    this.loadRecords();
  },

  async loadRecords() {
    const records = await callFunction("exercise", { action: "list", record_date: this.data.date || formatDate() }, { loadingText: "加载中" });
    const totalCalories = records.reduce((total, item) => total + Number(item.calorie_burned || 0), 0);
    this.setData({ records, totalCalories: Math.round(totalCalories * 10) / 10 });
  },

  addRecord() {
    wx.removeStorageSync("editing_exercise_record");
    wx.navigateTo({ url: "/pages/exercise/add/index" });
  },

  editRecord(event) {
    wx.setStorageSync("editing_exercise_record", event.currentTarget.dataset.record);
    wx.navigateTo({ url: "/pages/exercise/add/index?mode=edit" });
  },

  deleteRecord(event) {
    const record = event.currentTarget.dataset.record;
    wx.showModal({
      title: "删除运动记录",
      content: `确认删除“${record.exercise_name || "该记录"}”？删除后首页和数据页会同步更新。`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("exercise", { action: "remove", record_id: record._id }, { loadingText: "删除中" });
        showSuccess("已删除");
        this.loadRecords();
      }
    });
  },

  intensityLabel(event) {
    return getIntensityLabel(event);
  }
});

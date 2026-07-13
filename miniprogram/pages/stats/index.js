const { callFunction } = require("../../utils/cloud");

function maxOf(items) {
  return Math.max.apply(null, items.map((item) => Number(item.value || 0)).concat([0]));
}

function withPercent(items) {
  const max = maxOf(items);
  return items.map((item) => ({
    date: item.date.slice(5),
    value: item.value,
    percent: max ? Math.max(Math.round(Number(item.value || 0) / max * 100), 4) : 0
  }));
}

Page({
  data: {
    loading: false,
    trends: null,
    weightTrend: [],
    calorieTrend: [],
    exerciseTrend: [],
    macroTotal: 0,
    hasWeightData: false,
    hasCalorieData: false,
    hasExerciseData: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "数据" });
    this.loadTrends();
  },

  async loadTrends() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const trends = await callFunction("stats", { action: "trends" }, { loadingText: "加载中" });
      this.setData({
        trends,
        weightTrend: withPercent(trends.weight_trend || []),
        calorieTrend: withPercent(trends.calorie_trend || []),
        exerciseTrend: withPercent(trends.exercise_trend || []),
        macroTotal: Number(trends.today_macro_total || 0),
        hasWeightData: (trends.weight_trend || []).some((item) => Number(item.value || 0) > 0),
        hasCalorieData: (trends.calorie_trend || []).some((item) => Number(item.value || 0) > 0),
        hasExerciseData: (trends.exercise_trend || []).some((item) => Number(item.value || 0) > 0)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDiet() {
    wx.navigateTo({ url: "/pages/diet/detail/index" });
  },

  goExercise() {
    wx.navigateTo({ url: "/pages/exercise/detail/index" });
  },

  goWeight() {
    wx.navigateTo({ url: "/pages/weight/index" });
  }
});

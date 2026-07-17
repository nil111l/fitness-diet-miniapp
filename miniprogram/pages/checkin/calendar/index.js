const { callFunction } = require("../../../utils/cloud");

function monthOffset(month, offset) {
  const parts = month.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

Page({
  data: {
    month: "",
    monthLabel: "",
    cells: [],
    currentStreak: 0,
    longestStreak: 0,
    loading: false,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"]
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "打卡日历" });
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    this.setData({ month }, () => this.loadCalendar());
  },

  async loadCalendar() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const result = await callFunction("stats", {
        action: "calendar",
        month: this.data.month
      }, { loadingText: "加载打卡日历" });
      const blanks = Array.from({ length: result.first_weekday }, (_, index) => ({ blank: true, key: `blank-${index}` }));
      const days = result.days.map((item) => Object.assign({}, item, { key: item.date }));
      this.setData({
        month: result.month,
        monthLabel: `${result.month.slice(0, 4)}年${Number(result.month.slice(5))}月`,
        cells: blanks.concat(days),
        currentStreak: result.current_streak_days,
        longestStreak: result.longest_streak_days
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  previousMonth() {
    this.setData({ month: monthOffset(this.data.month, -1) }, () => this.loadCalendar());
  },

  nextMonth() {
    this.setData({ month: monthOffset(this.data.month, 1) }, () => this.loadCalendar());
  }
});

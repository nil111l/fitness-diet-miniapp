const { callFunction } = require("../../utils/cloud");
const { getUser, getProfile, getGoal } = require("../../utils/auth");
const { startQuickDiet } = require("../../utils/quick-diet");

function percent(value, target) {
  if (!target) return 0;
  return Math.min(Math.round(Number(value || 0) / Number(target) * 100), 100);
}

Page({
  data: {
    user: null,
    profile: null,
    goal: null,
    dashboard: {
      target_calories: 0,
      intake_calories: 0,
      exercise_calories: 0,
      remaining_calories: 0,
      macros: { protein: 0, carb: 0, fat: 0 },
      macro_targets: { protein_g: 0, carb_g: 0, fat_g: 0 },
      diet_checkin_done: false,
      exercise_checkin_done: false,
      weight_checkin_done: false,
      streak_days: 0,
      longest_streak_days: 0
    },
    quickFoods: [],
    macroProgress: {
      protein: 0,
      carb: 0,
      fat: 0
    }
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "首页" });
    const user = getUser();
    const profile = getProfile();
    const goal = getGoal();
    this.setData({ user, profile, goal });
    if (!user) {
      wx.navigateTo({ url: "/pages/login/index" });
      return;
    }
    if (goal) {
      this.loadDashboard();
      this.loadQuickOptions();
    }
  },

  async loadDashboard() {
    const dashboard = await callFunction("stats", { action: "dashboard" }, { loadingText: "刷新中", silent: false });
    this.setData({
      dashboard,
      goal: dashboard.goal || this.data.goal,
      macroProgress: {
        protein: percent(dashboard.macros.protein, dashboard.macro_targets.protein_g),
        carb: percent(dashboard.macros.carb, dashboard.macro_targets.carb_g),
        fat: percent(dashboard.macros.fat, dashboard.macro_targets.fat_g)
      }
    });
  },

  async loadQuickOptions() {
    try {
      const result = await callFunction("diet", { action: "quickOptions" }, { showLoading: false, silent: true });
      const quickFoods = (result.favorites.length ? result.favorites : result.recent).slice(0, 4);
      this.setData({ quickFoods });
    } catch (error) {
      this.setData({ quickFoods: [] });
    }
  },

  quickAdd(event) {
    startQuickDiet(event.currentTarget.dataset.item);
  },

  goFavorites() {
    wx.navigateTo({ url: "/pages/food/favorites/index" });
  },

  goRecent() {
    wx.navigateTo({ url: "/pages/diet/recent/index" });
  },

  goTemplates() {
    wx.navigateTo({ url: "/pages/diet/templates/index" });
  },

  goCalendar() {
    wx.navigateTo({ url: "/pages/checkin/calendar/index" });
  },

  goRecord() {
    wx.navigateTo({ url: "/pages/diet/detail/index" });
  },

  goAddDiet() {
    wx.removeStorageSync("editing_diet_record");
    wx.navigateTo({ url: "/pages/food/search/index" });
  },

  goExercise() {
    wx.navigateTo({ url: "/pages/exercise/detail/index" });
  },

  goWeight() {
    wx.navigateTo({ url: "/pages/weight/index" });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goProfile() {
    wx.navigateTo({ url: "/pages/profile/edit/index?mode=create" });
  },

  goGoal() {
    wx.navigateTo({ url: "/pages/goal/edit/index?mode=create" });
  }
});

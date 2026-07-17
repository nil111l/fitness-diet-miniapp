Page({
  onShow() {
    wx.setNavigationBarTitle({ title: "记录" });
  },

  goDietDetail() {
    wx.navigateTo({ url: "/pages/diet/detail/index" });
  },

  goFoodSearch() {
    wx.removeStorageSync("editing_diet_record");
    wx.navigateTo({ url: "/pages/food/search/index" });
  },

  goCustomFood() {
    wx.navigateTo({ url: "/pages/food/custom/index" });
  },

  goExercise() {
    wx.navigateTo({ url: "/pages/exercise/detail/index" });
  },

  goWeight() {
    wx.navigateTo({ url: "/pages/weight/index" });
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
  }
});

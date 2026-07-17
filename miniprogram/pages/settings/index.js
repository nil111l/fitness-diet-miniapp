const { getUser, clearSession } = require("../../utils/auth");

Page({
  data: {
    user: null
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "设置" });
    this.setData({ user: getUser() });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后本机将清除登录状态。",
      confirmText: "退出",
      confirmColor: "#d93025",
      success: (res) => {
        if (!res.confirm) return;
        clearSession();
        this.setData({ user: null });
        wx.showToast({ title: "已退出", icon: "success" });
      }
    });
  },

  goDeleteAccount() {
    wx.navigateTo({ url: "/pages/account/delete/index" });
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goReminders() {
    wx.navigateTo({ url: "/pages/reminders/index" });
  }
});

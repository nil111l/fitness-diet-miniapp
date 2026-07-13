const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    loading: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "管理员登录" });
  },

  async login() {
    this.setData({ loading: true });
    try {
      const result = await callFunction("admin", { action: "login" }, { loadingText: "登录中" });
      wx.setStorageSync("admin_user", result.admin);
      wx.redirectTo({ url: "/pages/admin/dashboard/index" });
    } finally {
      this.setData({ loading: false });
    }
  }
});

const { callFunction } = require("../../../utils/cloud");
const { getUser, clearSession, requireLogin } = require("../../../utils/auth");

Page({
  data: {
    user: null,
    checked: false
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "注销账号" });
    if (!requireLogin()) return;
    this.setData({ user: getUser() });
  },

  toggleCheck() {
    this.setData({ checked: !this.data.checked });
  },

  requestDelete() {
    if (!this.data.checked) {
      wx.showToast({ title: "请先确认注销影响", icon: "none" });
      return;
    }
    wx.showModal({
      title: "确认注销账号",
      content: "注销后账号状态将变为已注销，健康档案、饮食、运动、体重和打卡数据会删除或匿名化。",
      confirmText: "继续注销",
      confirmColor: "#d93025",
      success: (first) => {
        if (!first.confirm) return;
        wx.showModal({
          title: "再次确认",
          content: "该操作不可直接恢复，是否确认注销当前账号？",
          confirmText: "确认注销",
          confirmColor: "#d93025",
          success: async (second) => {
            if (!second.confirm) return;
            await callFunction("auth", { action: "cancelAccount", confirm: true }, { loadingText: "注销中" });
            clearSession();
            wx.showToast({ title: "已注销", icon: "success" });
            setTimeout(() => wx.reLaunch({ url: "/pages/login/index" }), 600);
          }
        });
      }
    });
  }
});

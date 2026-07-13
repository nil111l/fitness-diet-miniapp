const { callFunction } = require("../../../utils/cloud");

Page({
  data: {
    keyword: "",
    users: []
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "用户管理" });
    this.loadUsers();
  },

  inputKeyword(event) {
    this.setData({ keyword: event.detail.value });
  },

  async loadUsers() {
    const users = await callFunction("admin", { action: "listUsers", keyword: this.data.keyword }, { loadingText: "加载中" });
    this.setData({ users });
  },

  toggleStatus(event) {
    const user = event.currentTarget.dataset.user;
    const nextStatus = user.status === "disabled" ? "active" : "disabled";
    const actionName = nextStatus === "disabled" ? "禁用" : "恢复";
    wx.showModal({
      title: `${actionName}用户`,
      content: `确认${actionName}“${user.nick_name || "该用户"}”？`,
      confirmText: actionName,
      confirmColor: nextStatus === "disabled" ? "#d93025" : "#16a05d",
      success: async (res) => {
        if (!res.confirm) return;
        await callFunction("admin", { action: "updateUserStatus", user_id: user._id, status: nextStatus }, { loadingText: "处理中" });
        this.loadUsers();
      }
    });
  }
});

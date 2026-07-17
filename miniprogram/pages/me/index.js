const { callFunction } = require("../../utils/cloud");
const { getUser, getProfile, getGoal, clearSession } = require("../../utils/auth");

function goalText(goal) {
  const map = {
    lose_fat: "减脂塑形",
    gain_muscle: "增肌训练",
    keep_fit: "保持健康"
  };
  if (!goal) return "待设置目标";
  return map[goal.goal_type] || "健康饮食";
}

Page({
  data: {
    user: null,
    profile: null,
    goal: null,
    streakDays: 0,
    goalName: "待设置目标",
    quickActions: [
      { title: "健康档案", desc: "身高体重与基础信息", url: "/pages/profile/edit/index?mode=edit" },
      { title: "目标设置", desc: "推荐热量与营养目标", url: "/pages/goal/edit/index?mode=edit" },
      { title: "自定义食物", desc: "管理自己的常用食物", url: "/pages/food/my/index" },
      { title: "意见反馈", desc: "提交问题或建议", url: "/pages/feedback/index" }
    ],
    menuItems: [
      { title: "用户协议", url: "/pages/agreement/index" },
      { title: "隐私政策", url: "/pages/privacy/index" },
      { title: "设置", url: "/pages/settings/index" }
    ],
    retentionItems: [
      { title: "记录提醒", url: "/pages/reminders/index" },
      { title: "打卡日历", url: "/pages/checkin/calendar/index" }
    ]
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "我的" });
    const user = getUser();
    const profile = getProfile();
    const goal = getGoal();
    this.setData({
      user,
      profile,
      goal,
      goalName: goalText(goal)
    });
    if (user) this.loadSummary();
  },

  async loadSummary() {
    try {
      const dashboard = await callFunction("stats", { action: "dashboard" }, { showLoading: false, silent: true });
      this.setData({ streakDays: Number(dashboard.streak_days || 0) });
    } catch (error) {
      this.setData({ streakDays: 0 });
    }
  },

  goLogin() {
    wx.navigateTo({ url: "/pages/login/index" });
  },

  goPage(event) {
    const { url } = event.currentTarget.dataset;
    if (!url) return;
    wx.navigateTo({ url });
  },

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后本机将清除登录状态，重新进入需要再次微信登录。",
      confirmText: "退出",
      confirmColor: "#d93025",
      success: (res) => {
        if (!res.confirm) return;
        clearSession();
        this.setData({ user: null, profile: null, goal: null, streakDays: 0, goalName: "待设置目标" });
      }
    });
  },

  goDeleteAccount() {
    wx.navigateTo({ url: "/pages/account/delete/index" });
  }
});

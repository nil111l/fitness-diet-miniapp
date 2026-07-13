const { callFunction } = require("../../utils/cloud");
const { showError } = require("../../utils/toast");
const { setUser, setProfile, setGoal } = require("../../utils/auth");

Page({
  data: {
    agreed: false,
    loading: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: "微信登录"
    });
  },

  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  openAgreement() {
    wx.navigateTo({
      url: "/pages/agreement/index"
    });
  },

  openPrivacy() {
    wx.navigateTo({
      url: "/pages/privacy/index"
    });
  },

  async handleLogin() {
    if (!this.data.agreed) {
      showError("请先阅读并同意用户协议和隐私政策");
      return;
    }

    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const profileResult = await wx.getUserProfile({
        desc: "用于完善账号资料"
      });

      const result = await callFunction("auth", {
        action: "login",
        userInfo: profileResult.userInfo || {}
      }, {
        loadingText: "登录中"
      });

      setUser(result.user);

      if (result.profile) {
        setProfile(result.profile);
      }

      if (result.goal) {
        setGoal(result.goal);
      }

      if (!result.profile) {
        wx.redirectTo({
          url: "/pages/profile/edit/index?mode=create"
        });
        return;
      }

      if (!result.goal) {
        wx.redirectTo({
          url: "/pages/goal/edit/index?mode=create"
        });
        return;
      }

      wx.switchTab({
        url: "/pages/home/index"
      });
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf("getUserProfile:fail") >= 0) {
        showError("需要授权后才能完成登录");
      }
    } finally {
      this.setData({ loading: false });
    }
  }
});

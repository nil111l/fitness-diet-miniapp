App({
  globalData: {
    env: "",
    cloudReady: false,
    userInfo: null
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error("Please use base library 2.2.3 or above for cloud capabilities.");
      return;
    }

    const cloudConfig = {
      traceUser: true
    };

    if (this.globalData.env) {
      cloudConfig.env = this.globalData.env;
    }

    wx.cloud.init(cloudConfig);
    this.globalData.cloudReady = true;
  }
});

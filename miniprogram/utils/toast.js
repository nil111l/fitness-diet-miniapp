const DEFAULT_ERROR_MESSAGE = "操作失败，请稍后重试";

function showLoading(title = "加载中") {
  wx.showLoading({
    title,
    mask: true
  });
}

function hideLoading() {
  wx.hideLoading();
}

function showSuccess(title = "操作成功") {
  wx.showToast({
    title,
    icon: "success",
    duration: 1600
  });
}

function showError(error, fallback = DEFAULT_ERROR_MESSAGE) {
  const message = typeof error === "string" ? error : (error && error.message) || fallback;

  if (message.length > 18) {
    wx.showModal({
      title: "操作失败",
      content: message,
      showCancel: false,
      confirmText: "知道了"
    });
    return;
  }

  wx.showToast({
    title: message,
    icon: "none",
    duration: 2200
  });
}

module.exports = {
  showLoading,
  hideLoading,
  showSuccess,
  showError
};

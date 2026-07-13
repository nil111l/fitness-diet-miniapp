const { callFunction } = require("../../utils/cloud");
const { requireLogin } = require("../../utils/auth");

const TYPES = ["功能异常", "食物数据错误", "运动记录问题", "产品建议", "其他"];

Page({
  data: {
    types: TYPES,
    typeIndex: 0,
    content: "",
    contact: "",
    images: []
  },

  onLoad() {
    wx.setNavigationBarTitle({ title: "意见反馈" });
    requireLogin();
  },

  changeType(event) {
    this.setData({ typeIndex: Number(event.detail.value || 0) });
  },

  inputContent(event) {
    this.setData({ content: event.detail.value });
  },

  inputContact(event) {
    this.setData({ contact: event.detail.value });
  },

  chooseImage() {
    wx.chooseImage({
      count: Math.max(0, 3 - this.data.images.length),
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        this.setData({ images: this.data.images.concat(res.tempFilePaths).slice(0, 3) });
      }
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const images = this.data.images.filter((_, itemIndex) => itemIndex !== index);
    this.setData({ images });
  },

  async submit() {
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ title: "请填写反馈内容", icon: "none" });
      return;
    }
    const uploadedImages = [];
    for (let i = 0; i < this.data.images.length; i += 1) {
      const filePath = this.data.images[i];
      if (filePath.indexOf("cloud://") === 0) {
        uploadedImages.push(filePath);
      } else {
        const suffix = filePath.substring(filePath.lastIndexOf(".") + 1) || "jpg";
        const upload = await wx.cloud.uploadFile({
          cloudPath: `feedback/${Date.now()}-${i}.${suffix}`,
          filePath
        });
        uploadedImages.push(upload.fileID);
      }
    }
    await callFunction("feedback", {
      action: "submit",
      feedback_type: this.data.types[this.data.typeIndex],
      content,
      images: uploadedImages,
      contact: this.data.contact.trim()
    }, { loadingText: "提交中" });
    wx.showToast({ title: "已提交", icon: "success" });
    setTimeout(() => wx.navigateBack(), 500);
  }
});

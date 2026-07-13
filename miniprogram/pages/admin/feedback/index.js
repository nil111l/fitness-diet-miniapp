const { callFunction } = require("../../../utils/cloud");

const STATUS = [
  { label: "待处理", value: "pending" },
  { label: "处理中", value: "processing" },
  { label: "已处理", value: "resolved" },
  { label: "已关闭", value: "closed" }
];

Page({
  data: {
    list: [],
    statusOptions: STATUS,
    active: null,
    statusIndex: 0,
    adminReply: ""
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "反馈管理" });
    this.loadList();
  },

  async loadList() {
    const list = await callFunction("admin", { action: "listFeedbacks" }, { loadingText: "加载中" });
    this.setData({ list });
  },

  open(event) {
    const item = event.currentTarget.dataset.item;
    const statusIndex = Math.max(STATUS.findIndex((status) => status.value === item.status), 0);
    this.setData({ active: item, statusIndex, adminReply: item.admin_reply || "" });
  },

  close() {
    this.setData({ active: null, adminReply: "" });
  },

  changeStatus(event) {
    this.setData({ statusIndex: Number(event.detail.value || 0) });
  },

  inputReply(event) {
    this.setData({ adminReply: event.detail.value });
  },

  async save() {
    await callFunction("admin", {
      action: "updateFeedback",
      feedback_id: this.data.active._id,
      status: STATUS[this.data.statusIndex].value,
      admin_reply: this.data.adminReply
    }, { loadingText: "保存中" });
    this.close();
    this.loadList();
  }
});

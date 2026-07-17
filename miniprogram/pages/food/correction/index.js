const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { CORRECTION_TYPES } = require("../../../utils/content");

Page({
  data: { foodId: "", food: null, types: CORRECTION_TYPES, typeIndex: 0, description: "", suggestedValue: "", loading: true, loadFailed: false, submitting: false },
  onLoad(options) { if (!requireLogin()) return; this.setData({ foodId: options.id || "" }); this.loadFood(); },
  async loadFood() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const food = await callFunction("food", { action: "get", food_id: this.data.foodId }, { loadingText: "加载食材" });
      if (food.source !== "system") throw new Error("仅支持纠错平台食材");
      this.setData({ food });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },
  changeType(event) { this.setData({ typeIndex: Number(event.detail.value || 0) }); },
  inputDescription(event) { this.setData({ description: event.detail.value }); },
  inputSuggestedValue(event) { this.setData({ suggestedValue: event.detail.value }); },
  async submit() {
    const description = String(this.data.description || "").trim();
    if (this.data.submitting || description.length < 5) { wx.showToast({ title: "请至少填写 5 个字的说明", icon: "none" }); return; }
    this.setData({ submitting: true });
    try {
      await callFunction("content", { action: "submitCorrection", correction: { food_id: this.data.foodId, correction_type: this.data.types[this.data.typeIndex].value, description, suggested_value: this.data.suggestedValue } }, { loadingText: "提交纠错" });
      wx.showModal({ title: "提交成功", content: "我们会核对食材数据，处理状态可在纠错记录中查看。", showCancel: false, confirmText: "查看记录", success: () => wx.redirectTo({ url: "/pages/food/corrections/index" }) });
    } finally {
      this.setData({ submitting: false });
    }
  },
  goHistory() { wx.navigateTo({ url: "/pages/food/corrections/index" }); }
});

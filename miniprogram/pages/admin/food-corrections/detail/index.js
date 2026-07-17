const { callFunction } = require("../../../../utils/cloud");
const { CORRECTION_STATUSES, decorateCorrection } = require("../../../../utils/content");

Page({
  data: { correctionId: "", correction: null, categories: [], categoryIndex: 0, statuses: CORRECTION_STATUSES, statusIndex: 0, food: null, adminNote: "", applyFoodUpdate: false, loading: true, loadFailed: false, saving: false },
  onLoad(options) { this.setData({ correctionId: options.id || "" }); this.loadPage(); },
  async loadPage() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const results = await Promise.all([callFunction("content", { action: "adminCorrectionDetail", correction_id: this.data.correctionId }, { showLoading: false }), callFunction("admin", { action: "listCategories" }, { showLoading: false })]);
      const correction = decorateCorrection(results[0]); const categories = results[1] || []; const food = correction.current_food ? Object.assign({}, correction.current_food) : null;
      this.setData({ correction, categories, food, categoryIndex: food ? Math.max(categories.findIndex((item) => item._id === food.category_id), 0) : 0, statusIndex: Math.max(this.data.statuses.findIndex((item) => item.value === correction.status), 0), adminNote: correction.admin_note || "", applyFoodUpdate: false });
    } catch (error) { this.setData({ loadFailed: true }); }
    finally { this.setData({ loading: false }); }
  },
  changeStatus(event) {
    const statusIndex = Number(event.detail.value || 0);
    if (this.data.correction.applied_food_update && this.data.statuses[statusIndex].value !== "resolved") {
      wx.showToast({ title: "已同步食材的记录需保持已采纳", icon: "none" });
      this.setData({ statusIndex: this.data.statuses.findIndex((item) => item.value === "resolved") });
      return;
    }
    this.setData({ statusIndex, applyFoodUpdate: this.data.statuses[statusIndex].value === "resolved" ? this.data.applyFoodUpdate : false });
  },
  changeCategory(event) { const categoryIndex = Number(event.detail.value || 0); this.setData({ categoryIndex, "food.category_id": this.data.categories[categoryIndex]._id }); },
  inputFood(event) { this.setData({ [`food.${event.currentTarget.dataset.field}`]: event.detail.value }); },
  inputNote(event) { this.setData({ adminNote: event.detail.value }); },
  toggleApply(event) {
    if (this.data.correction.applied_food_update) return;
    if (event.detail.value && this.data.statuses[this.data.statusIndex].value !== "resolved") { wx.showToast({ title: "请先把状态设为已采纳", icon: "none" }); this.setData({ applyFoodUpdate: false }); return; }
    this.setData({ applyFoodUpdate: event.detail.value });
  },
  validate() {
    if (!this.data.applyFoodUpdate) return true;
    const food = this.data.food || {}; const fields = ["calorie_per_100g", "protein_per_100g", "carb_per_100g", "fat_per_100g"];
    if (!String(food.name || "").trim() || fields.some((field) => !Number.isFinite(Number(food[field])) || Number(food[field]) < 0 || Number(food[field]) > 2000)) { wx.showToast({ title: "请正确填写食材名称和营养数据", icon: "none" }); return false; }
    return true;
  },
  async save() {
    if (this.data.saving || !this.validate()) return;
    this.setData({ saving: true });
    try {
      const food = this.data.food || {};
      await callFunction("content", { action: "adminResolveCorrection", correction_id: this.data.correctionId, status: this.data.statuses[this.data.statusIndex].value, admin_note: this.data.adminNote, apply_food_update: this.data.applyFoodUpdate, food: this.data.applyFoodUpdate ? { name: food.name, category_id: food.category_id, calorie_per_100g: Number(food.calorie_per_100g), protein_per_100g: Number(food.protein_per_100g), carb_per_100g: Number(food.carb_per_100g), fat_per_100g: Number(food.fat_per_100g) } : null }, { loadingText: "保存处理结果" });
      wx.showToast({ title: "处理结果已保存", icon: "success" }); setTimeout(() => wx.navigateBack(), 500);
    } finally { this.setData({ saving: false }); }
  }
});

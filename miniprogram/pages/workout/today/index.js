const { callFunction } = require("../../../utils/cloud");
const { requireLogin } = require("../../../utils/auth");
const { decoratePlan } = require("../../../utils/workout");

Page({
  data: {
    hasPlan: false,
    selectionInvalid: false,
    plan: null,
    session: null,
    items: [],
    completedCount: 0,
    completedPercent: 0,
    loading: true,
    completing: false,
    savingProgress: false,
    restActionId: "",
    restRemaining: 0
  },

  onLoad() {
    if (!requireLogin()) return;
    wx.setNavigationBarTitle({ title: "今日训练" });
  },

  onShow() {
    this.loadWorkout();
  },

  onHide() {
    this.saveProgress(true);
    this.clearRestTimer();
  },

  onUnload() {
    this.clearRestTimer();
  },

  async loadWorkout() {
    this.setData({ loading: true });
    try {
      const result = await callFunction("workout", { action: "todayWorkout" }, { loadingText: "加载今日训练" });
      if (!result.has_plan) {
        this.setData({ hasPlan: false, selectionInvalid: Boolean(result.selection_invalid), plan: null, session: null, items: [] });
        return;
      }
      const plan = decoratePlan(result.plan);
      const actionById = {};
      plan.actions.forEach((item) => { actionById[item.action_id] = item.action; });
      const items = (result.session.items || []).map((item) => Object.assign({}, item, { action: actionById[item.action_id] || null }));
      this.setData({ hasPlan: true, selectionInvalid: false, plan, session: result.session, items });
      this.updateProgress(items);
    } finally {
      this.setData({ loading: false });
    }
  },

  updateProgress(items) {
    const completedCount = items.filter((item) => item.completed).length;
    this.setData({ completedCount, completedPercent: items.length ? Math.round(completedCount / items.length * 100) : 0 });
  },

  toggleCompleted(event) {
    if (this.data.session.status === "completed") return;
    const index = Number(event.currentTarget.dataset.index);
    const items = this.data.items.slice();
    items[index] = Object.assign({}, items[index], { completed: !items[index].completed });
    this.setData({ items });
    this.updateProgress(items);
    this.saveProgress(true);
  },

  inputActual(event) {
    const index = Number(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    this.setData({ [`items[${index}].${field}`]: event.detail.value });
  },

  progressItems() {
    return this.data.items.map((item) => ({
      action_id: item.action_id,
      completed: Boolean(item.completed),
      actual_reps: item.actual_reps === "" ? 0 : Number(item.actual_reps || 0),
      weight_kg: item.weight_kg === "" ? 0 : Number(item.weight_kg || 0)
    }));
  },

  validateNumbers() {
    const invalid = this.progressItems().some((item) => !Number.isInteger(item.actual_reps) || item.actual_reps < 0 || item.actual_reps > 10000 || !Number.isFinite(item.weight_kg) || item.weight_kg < 0 || item.weight_kg > 1000 || Math.round(item.weight_kg * 10) !== item.weight_kg * 10);
    if (!invalid) return true;
    wx.showToast({ title: "实际次数需为整数，重量最多一位小数", icon: "none", duration: 2500 });
    return false;
  },

  async saveProgress(silent) {
    if (!this.data.session || this.data.session.status === "completed") return true;
    if (this.data.savingProgress) {
      this.progressDirty = true;
      return true;
    }
    this.setData({ savingProgress: true });
    try {
      await callFunction("workout", {
        action: "saveWorkoutProgress",
        session_id: this.data.session._id,
        items: this.progressItems()
      }, { showLoading: false, silent: Boolean(silent) });
      return true;
    } catch (error) {
      return false;
    } finally {
      this.setData({ savingProgress: false });
      if (this.progressDirty) {
        this.progressDirty = false;
        this.saveProgress(true);
      }
    }
  },

  async openAction(event) {
    if (!await this.saveProgress(false)) return;
    wx.navigateTo({ url: `/pages/workout/action-detail/index?id=${event.currentTarget.dataset.id}` });
  },

  clearRestTimer() {
    if (this.restTimer) clearInterval(this.restTimer);
    this.restTimer = null;
    if (this.data.restActionId) this.setData({ restActionId: "", restRemaining: 0 });
  },

  startRest(event) {
    const seconds = Number(event.currentTarget.dataset.seconds || 0);
    if (!seconds) {
      wx.showToast({ title: "该动作无休息时间", icon: "none" });
      return;
    }
    this.clearRestTimer();
    const actionId = event.currentTarget.dataset.id;
    this.setData({ restActionId: actionId, restRemaining: seconds });
    this.restTimer = setInterval(() => {
      const next = this.data.restRemaining - 1;
      if (next <= 0) {
        this.clearRestTimer();
        wx.vibrateShort({ type: "light" });
        wx.showToast({ title: "休息结束", icon: "none" });
        return;
      }
      this.setData({ restRemaining: next });
    }, 1000);
  },

  async completeWorkout() {
    if (this.data.completing || this.data.session.status === "completed") return;
    if (!this.data.items.length || this.data.completedCount !== this.data.items.length) {
      wx.showToast({ title: "请先逐项完成今日动作", icon: "none", duration: 2500 });
      return;
    }
    if (!this.validateNumbers()) return;
    this.setData({ completing: true });
    try {
      const result = await callFunction("workout", {
        action: "completeWorkout",
        session_id: this.data.session._id,
        items: this.progressItems()
      }, { loadingText: "完成训练" });
      const actionById = {};
      this.data.items.forEach((item) => { actionById[item.action_id] = item.action || null; });
      const items = result.session.items.map((item) => Object.assign({}, item, { action: actionById[item.action_id] || null }));
      this.setData({ session: result.session, items });
      wx.showModal({
        title: "今日训练已完成",
        content: `已生成运动记录，本次预计消耗 ${result.exercise_record.calorie_burned} kcal。`,
        showCancel: false,
        confirmText: "返回首页",
        success: () => wx.switchTab({ url: "/pages/home/index" })
      });
    } finally {
      this.setData({ completing: false });
    }
  },

  goPlans() {
    wx.navigateTo({ url: "/pages/workout/plans/index" });
  },

  goHome() {
    wx.switchTab({ url: "/pages/home/index" });
  }
});

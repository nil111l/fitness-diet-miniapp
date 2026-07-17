const { callFunction } = require("../../../../utils/cloud");
const { PLAN_TYPES, DIFFICULTY_OPTIONS } = require("../../../../utils/workout");

function createForm() {
  return { name: "", intro: "", cover_url: "", plan_type: "fat_loss", goal: "", difficulty: "easy", duration_weeks: 6, weekly_frequency: 3, session_duration_min: 40, actions: [], status: "inactive" };
}

Page({
  data: { planId: "", form: createForm(), planTypes: PLAN_TYPES.slice(1), planTypeIndex: 0, difficulties: DIFFICULTY_OPTIONS, difficultyIndex: 0, actionOptions: [], loading: true, loadFailed: false, saving: false },

  onLoad(options) {
    const planId = options.id || "";
    this.setData({ planId });
    wx.setNavigationBarTitle({ title: planId ? "编辑训练计划" : "新增训练计划" });
    this.loadPage();
  },

  async fetchActionOptions() {
    const items = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 10) {
      const result = await callFunction("workout", { action: "adminActionOptions", page, page_size: 20 }, { showLoading: false });
      items.push(...(result.items || []));
      hasMore = Boolean(result.has_more);
      page += 1;
    }
    return items;
  },

  async loadPage() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const results = await Promise.all([
        this.fetchActionOptions(),
        this.data.planId ? callFunction("workout", { action: "adminPlanDetail", plan_id: this.data.planId }, { showLoading: false }) : Promise.resolve(null)
      ]);
      const actionOptions = results[0];
      const plan = results[1];
      const form = plan ? Object.assign(createForm(), plan, {
        actions: (plan.actions || []).map((item) => Object.assign({}, item, { action_index: Math.max(actionOptions.findIndex((action) => action._id === item.action_id), 0) }))
      }) : createForm();
      this.setData({
        actionOptions,
        form,
        planTypeIndex: Math.max(this.data.planTypes.findIndex((item) => item.value === form.plan_type), 0),
        difficultyIndex: Math.max(this.data.difficulties.findIndex((item) => item.value === form.difficulty), 0)
      });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  changePlanType(event) {
    const index = Number(event.detail.value || 0);
    this.setData({ planTypeIndex: index, "form.plan_type": this.data.planTypes[index].value });
  },

  changeDifficulty(event) {
    const index = Number(event.detail.value || 0);
    this.setData({ difficultyIndex: index, "form.difficulty": this.data.difficulties[index].value });
  },

  toggleStatus(event) {
    this.setData({ "form.status": event.detail.value ? "active" : "inactive" });
  },

  addAction() {
    const firstActiveIndex = this.data.actionOptions.findIndex((item) => item.status === "active");
    if (firstActiveIndex < 0) {
      wx.showToast({ title: "请先上架至少一个动作", icon: "none" });
      return;
    }
    if (this.data.form.actions.length >= 20) {
      wx.showToast({ title: "每个计划最多 20 个动作", icon: "none" });
      return;
    }
    const action = this.data.actionOptions[firstActiveIndex];
    this.setData({ "form.actions": this.data.form.actions.concat({ action_id: action._id, action_index: firstActiveIndex, sets: 3, reps: "12次", rest_sec: 60 }) });
  },

  changeAction(event) {
    const row = Number(event.currentTarget.dataset.index);
    const actionIndex = Number(event.detail.value || 0);
    this.setData({ [`form.actions[${row}].action_index`]: actionIndex, [`form.actions[${row}].action_id`]: this.data.actionOptions[actionIndex]._id });
  },

  inputActionField(event) {
    this.setData({ [`form.actions[${event.currentTarget.dataset.index}].${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  removeAction(event) {
    const actions = this.data.form.actions.slice();
    actions.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ "form.actions": actions });
  },

  validateForm() {
    const form = this.data.form;
    const invalidAction = form.actions.some((item) => !item.action_id || !Number.isInteger(Number(item.sets)) || Number(item.sets) < 1 || Number(item.sets) > 20 || !String(item.reps || "").trim() || !Number.isInteger(Number(item.rest_sec)) || Number(item.rest_sec) < 0 || Number(item.rest_sec) > 600);
    const duplicateAction = new Set(form.actions.map((item) => item.action_id)).size !== form.actions.length;
    let message = "";
    if (!String(form.name || "").trim()) message = "请填写计划名称";
    else if (!String(form.intro || "").trim()) message = "请填写计划简介";
    else if (!String(form.goal || "").trim()) message = "请填写计划目标";
    else if (!Number.isInteger(Number(form.duration_weeks)) || Number(form.duration_weeks) < 1 || Number(form.duration_weeks) > 52) message = "计划周期需在 1-52 周之间";
    else if (!Number.isInteger(Number(form.weekly_frequency)) || Number(form.weekly_frequency) < 1 || Number(form.weekly_frequency) > 7) message = "每周次数需在 1-7 次之间";
    else if (!Number.isInteger(Number(form.session_duration_min)) || Number(form.session_duration_min) < 5 || Number(form.session_duration_min) > 300) message = "单次时长需在 5-300 分钟之间";
    else if (form.cover_url && !String(form.cover_url).startsWith("https://") && !String(form.cover_url).startsWith("cloud://")) message = "封面地址仅支持 https:// 或 cloud://";
    else if (!form.actions.length || invalidAction || duplicateAction) message = "请正确填写 1-20 个不重复的动作参数";
    if (!message) return true;
    wx.showToast({ title: message, icon: "none", duration: 2500 });
    return false;
  },

  async savePlan() {
    if (this.data.saving || !this.validateForm()) return;
    this.setData({ saving: true });
    try {
      const form = this.data.form;
      const plan = {
        _id: this.data.planId || undefined,
        name: form.name,
        intro: form.intro,
        cover_url: form.cover_url,
        plan_type: form.plan_type,
        goal: form.goal,
        difficulty: form.difficulty,
        duration_weeks: Number(form.duration_weeks),
        weekly_frequency: Number(form.weekly_frequency),
        session_duration_min: Number(form.session_duration_min),
        actions: form.actions.map((item) => ({ action_id: item.action_id, sets: Number(item.sets), reps: item.reps, rest_sec: Number(item.rest_sec) })),
        status: form.status
      };
      await callFunction("workout", { action: "adminSavePlan", plan }, { loadingText: "保存计划" });
      wx.showToast({ title: "计划已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});

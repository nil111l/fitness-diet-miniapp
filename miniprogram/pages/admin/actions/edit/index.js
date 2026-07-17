const { callFunction } = require("../../../../utils/cloud");
const { ACTION_CATEGORIES, DIFFICULTY_OPTIONS } = require("../../../../utils/workout");

function createForm() {
  return { name: "", category: "chest", target_muscles_text: "", secondary_muscles_text: "", difficulty: "easy", equipment: "", steps_text: "", common_errors_text: "", precautions_text: "", cover_url: "", video_url: "", status: "inactive" };
}

function joinLines(value) {
  return (value || []).join("\n");
}

function splitText(value, separator) {
  return String(value || "").split(separator).map((item) => item.trim()).filter(Boolean);
}

Page({
  data: { actionId: "", form: createForm(), categories: ACTION_CATEGORIES.slice(1), categoryIndex: 0, difficulties: DIFFICULTY_OPTIONS, difficultyIndex: 0, loading: true, loadFailed: false, saving: false },

  onLoad(options) {
    const actionId = options.id || "";
    this.setData({ actionId });
    wx.setNavigationBarTitle({ title: actionId ? "编辑动作" : "新增动作" });
    this.loadPage();
  },

  async loadPage() {
    this.setData({ loading: true, loadFailed: false });
    try {
      if (!this.data.actionId) return;
      const action = await callFunction("workout", { action: "adminActionDetail", action_id: this.data.actionId }, { loadingText: "加载动作" });
      const form = Object.assign(createForm(), action, {
        target_muscles_text: (action.target_muscles || []).join("、"),
        secondary_muscles_text: (action.secondary_muscles || []).join("、"),
        steps_text: joinLines(action.steps),
        common_errors_text: joinLines(action.common_errors),
        precautions_text: joinLines(action.precautions)
      });
      this.setData({ form, categoryIndex: Math.max(this.data.categories.findIndex((item) => item.value === form.category), 0), difficultyIndex: Math.max(this.data.difficulties.findIndex((item) => item.value === form.difficulty), 0) });
    } catch (error) {
      this.setData({ loadFailed: true });
    } finally {
      this.setData({ loading: false });
    }
  },

  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  changeCategory(event) {
    const index = Number(event.detail.value || 0);
    this.setData({ categoryIndex: index, "form.category": this.data.categories[index].value });
  },

  changeDifficulty(event) {
    const index = Number(event.detail.value || 0);
    this.setData({ difficultyIndex: index, "form.difficulty": this.data.difficulties[index].value });
  },

  toggleStatus(event) {
    this.setData({ "form.status": event.detail.value ? "active" : "inactive" });
  },

  validateForm() {
    const form = this.data.form;
    let message = "";
    if (!String(form.name || "").trim()) message = "请填写动作名称";
    else if (!String(form.target_muscles_text || "").trim()) message = "请填写目标肌群";
    else if (!String(form.equipment || "").trim()) message = "请填写所需器械";
    else if (!String(form.steps_text || "").trim()) message = "请填写动作步骤";
    else if (!String(form.common_errors_text || "").trim()) message = "请填写常见错误";
    else if (!String(form.precautions_text || "").trim()) message = "请填写注意事项";
    else if ((form.cover_url && !String(form.cover_url).startsWith("https://") && !String(form.cover_url).startsWith("cloud://")) || (form.video_url && !String(form.video_url).startsWith("https://") && !String(form.video_url).startsWith("cloud://"))) message = "媒体地址仅支持 https:// 或 cloud://";
    if (!message) return true;
    wx.showToast({ title: message, icon: "none", duration: 2500 });
    return false;
  },

  async saveAction() {
    if (this.data.saving || !this.validateForm()) return;
    this.setData({ saving: true });
    try {
      const form = this.data.form;
      const action = {
        _id: this.data.actionId || undefined,
        name: form.name,
        category: form.category,
        target_muscles: splitText(form.target_muscles_text, /[,，、]/),
        secondary_muscles: splitText(form.secondary_muscles_text, /[,，、]/),
        difficulty: form.difficulty,
        equipment: form.equipment,
        steps: splitText(form.steps_text, /\r?\n/),
        common_errors: splitText(form.common_errors_text, /\r?\n/),
        precautions: splitText(form.precautions_text, /\r?\n/),
        cover_url: form.cover_url,
        video_url: form.video_url,
        status: form.status
      };
      await callFunction("workout", { action: "adminSaveAction", action }, { loadingText: "保存动作" });
      wx.showToast({ title: "动作已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});

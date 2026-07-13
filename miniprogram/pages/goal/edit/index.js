const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");
const { requireLogin, getProfile, getGoal, setGoal } = require("../../../utils/auth");
const { GOAL_OPTIONS, findIndexByValue } = require("../../../utils/health");

Page({
  data: {
    goalOptions: GOAL_OPTIONS,
    goalIndex: 0,
    profile: null,
    form: {
      goal_type: "lose_weight",
      target_weight_kg: ""
    },
    result: null,
    loading: false
  },

  onLoad() {
    if (!requireLogin()) {
      return;
    }

    const profile = getProfile();
    const savedGoal = getGoal();

    if (!profile) {
      showError("请先填写健康档案");
      wx.redirectTo({
        url: "/pages/profile/edit/index?mode=create"
      });
      return;
    }

    const goalType = savedGoal ? savedGoal.goal_type : profile.goal_type;
    const targetWeight = savedGoal ? savedGoal.target_weight_kg : profile.target_weight_kg;

    this.setData({
      profile,
      result: savedGoal || null,
      goalIndex: findIndexByValue(GOAL_OPTIONS, goalType),
      form: {
        goal_type: goalType || "lose_weight",
        target_weight_kg: targetWeight || ""
      }
    });

    wx.setNavigationBarTitle({
      title: "目标设置"
    });
  },

  handleGoalPicker(event) {
    const index = Number(event.detail.value);
    this.setData({
      goalIndex: index,
      "form.goal_type": GOAL_OPTIONS[index].value
    });
  },

  handleInput(event) {
    this.setData({
      "form.target_weight_kg": event.detail.value
    });
  },

  validateForm() {
    const targetWeight = Number(this.data.form.target_weight_kg);
    if (!this.data.form.goal_type || !this.data.form.target_weight_kg) {
      return "请完整填写目标";
    }

    if (!Number.isFinite(targetWeight) || targetWeight < 30 || targetWeight > 250) {
      return "目标体重需在 30-250 kg 之间";
    }

    return "";
  },

  async submitGoal() {
    const validationMessage = this.validateForm();
    if (validationMessage) {
      showError(validationMessage);
      return;
    }

    if (this.data.loading) {
      return;
    }

    this.setData({ loading: true });

    try {
      const goal = await callFunction("goal", {
        action: "upsert",
        goal: this.data.form
      }, {
        loadingText: "计算中"
      });

      setGoal(goal);
      this.setData({ result: goal });
      showSuccess("目标已生成");

      wx.switchTab({
        url: "/pages/home/index"
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});

const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");
const { requireLogin, getProfile, setProfile, setGoal } = require("../../../utils/auth");
const {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  GENDER_OPTIONS,
  findIndexByValue
} = require("../../../utils/health");

function getAgeFromBirthMonth(birthMonth) {
  if (!birthMonth) {
    return 0;
  }
  const parts = birthMonth.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) {
    age -= 1;
  }
  return age;
}

Page({
  data: {
    mode: "create",
    genderOptions: GENDER_OPTIONS,
    activityOptions: ACTIVITY_OPTIONS,
    goalOptions: GOAL_OPTIONS,
    genderIndex: 0,
    activityIndex: 0,
    goalIndex: 0,
    form: {
      gender: "male",
      birth_month: "",
      height_cm: "",
      current_weight_kg: "",
      target_weight_kg: "",
      activity_level: "sedentary",
      goal_type: "lose_weight",
      diet_preference: "",
      allergies: "",
      water_target_ml: ""
    },
    loading: false
  },

  onLoad(query) {
    if (!requireLogin()) {
      return;
    }

    const savedProfile = getProfile();
    if (savedProfile) {
      const form = Object.assign({}, this.data.form, savedProfile);
      this.setData({
        form,
        genderIndex: findIndexByValue(GENDER_OPTIONS, form.gender),
        activityIndex: findIndexByValue(ACTIVITY_OPTIONS, form.activity_level),
        goalIndex: findIndexByValue(GOAL_OPTIONS, form.goal_type)
      });
    }

    const mode = query && query.mode ? query.mode : "edit";
    this.setData({ mode });
    wx.setNavigationBarTitle({
      title: mode === "create" ? "填写健康档案" : "编辑健康档案"
    });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  handlePicker(event) {
    const field = event.currentTarget.dataset.field;
    const index = Number(event.detail.value);
    const map = {
      gender: GENDER_OPTIONS,
      activity_level: ACTIVITY_OPTIONS,
      goal_type: GOAL_OPTIONS
    };

    this.setData({
      [`${field === "gender" ? "gender" : field === "activity_level" ? "activity" : "goal"}Index`]: index,
      [`form.${field}`]: map[field][index].value
    });
  },

  handleBirthMonth(event) {
    this.setData({
      "form.birth_month": event.detail.value
    });
  },

  validateForm() {
    const form = this.data.form;
    const height = Number(form.height_cm);
    const currentWeight = Number(form.current_weight_kg);
    const targetWeight = Number(form.target_weight_kg);
    const waterTarget = form.water_target_ml === "" ? 0 : Number(form.water_target_ml);
    const age = getAgeFromBirthMonth(form.birth_month);

    if (!form.gender || !form.birth_month || !form.height_cm || !form.current_weight_kg || !form.target_weight_kg || !form.activity_level || !form.goal_type) {
      return "请完整填写必填项";
    }

    if (!Number.isFinite(age) || age < 10 || age > 80) {
      return "年龄需在 10-80 岁之间";
    }

    if (!Number.isFinite(height) || height < 100 || height > 230) {
      return "身高需在 100-230 cm 之间";
    }

    if (!Number.isFinite(currentWeight) || currentWeight < 30 || currentWeight > 250) {
      return "当前体重需在 30-250 kg 之间";
    }

    if (!Number.isFinite(targetWeight) || targetWeight < 30 || targetWeight > 250) {
      return "目标体重需在 30-250 kg 之间";
    }

    if (waterTarget && (waterTarget < 500 || waterTarget > 6000)) {
      return "饮水目标需在 500-6000 ml 之间";
    }

    return "";
  },

  async submitProfile() {
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
      const profile = await callFunction("profile", {
        action: "upsert",
        profile: this.data.form
      }, {
        loadingText: "保存中"
      });

      setProfile(profile);

      if (this.data.mode === "edit") {
        const goal = await callFunction("goal", {
          action: "upsert",
          goal: {
            goal_type: profile.goal_type,
            target_weight_kg: profile.target_weight_kg
          }
        }, {
          loadingText: "重新计算中"
        });
        setGoal(goal);
        showSuccess("档案和目标已更新");
        wx.switchTab({
          url: "/pages/home/index"
        });
        return;
      }

      showSuccess("档案已保存");
      wx.redirectTo({
        url: "/pages/goal/edit/index?mode=create"
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});

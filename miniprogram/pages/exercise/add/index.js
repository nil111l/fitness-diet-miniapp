const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { EXERCISE_TYPES, INTENSITY_OPTIONS, getTypeIndex, getIntensityIndex } = require("../../../utils/exercise");

Page({
  data: {
    mode: "create",
    exerciseTypes: EXERCISE_TYPES,
    intensityOptions: INTENSITY_OPTIONS,
    typeIndex: 1,
    intensityIndex: 1,
    form: {
      _id: "",
      record_date: "",
      exercise_type: "跑步",
      exercise_name: "",
      duration_min: "",
      intensity: "medium",
      calorie_burned: "",
      note: ""
    },
    loading: false
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: query && query.mode === "edit" ? "编辑运动" : "添加运动" });
    const record = wx.getStorageSync("editing_exercise_record");
    if (query && query.mode === "edit" && record) {
      this.setData({
        mode: "edit",
        typeIndex: getTypeIndex(record.exercise_type),
        intensityIndex: getIntensityIndex(record.intensity),
        form: {
          _id: record._id,
          record_date: record.record_date,
          exercise_type: record.exercise_type,
          exercise_name: record.exercise_name,
          duration_min: String(record.duration_min),
          intensity: record.intensity,
          calorie_burned: String(record.calorie_burned),
          note: record.note || ""
        }
      });
      return;
    }
    this.setData({ "form.record_date": formatDate() });
  },

  handleInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  handleType(event) {
    const index = Number(event.detail.value);
    const type = this.data.exerciseTypes[index];
    this.setData({
      typeIndex: index,
      "form.exercise_type": type,
      "form.exercise_name": this.data.form.exercise_name || type
    });
  },

  handleIntensity(event) {
    const index = Number(event.detail.value);
    this.setData({
      intensityIndex: index,
      "form.intensity": this.data.intensityOptions[index].value
    });
  },

  handleDate(event) {
    this.setData({ "form.record_date": event.detail.value });
  },

  validate() {
    const duration = Number(this.data.form.duration_min);
    if (!this.data.form.record_date) return "请选择日期";
    if (!this.data.form.exercise_name) return "请填写运动名称";
    if (!Number.isFinite(duration) || duration <= 0) return "运动时长必须大于 0";
    return "";
  },

  async saveRecord() {
    const message = this.validate();
    if (message) {
      showError(message);
      return;
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await callFunction("exercise", { action: "upsert", record: this.data.form }, { loadingText: "保存中" });
      wx.removeStorageSync("editing_exercise_record");
      showSuccess("运动已保存");
      wx.redirectTo({ url: "/pages/exercise/detail/index" });
    } finally {
      this.setData({ loading: false });
    }
  }
});

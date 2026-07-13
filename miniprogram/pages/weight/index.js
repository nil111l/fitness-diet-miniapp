const { callFunction } = require("../../utils/cloud");
const { showError, showSuccess } = require("../../utils/toast");
const { formatDate } = require("../../utils/date");

Page({
  data: {
    date: "",
    form: {
      record_date: "",
      weight_kg: "",
      body_fat_rate: "",
      note: ""
    },
    existing: null,
    loading: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "今日体重" });
    const date = formatDate();
    this.setData({ date, "form.record_date": date });
    this.loadRecord(date);
  },

  async loadRecord(date) {
    const existing = await callFunction("body", { action: "get", record_date: date }, { loadingText: "加载中" });
    if (existing) {
      this.setData({
        existing,
        form: {
          record_date: existing.record_date,
          weight_kg: String(existing.weight_kg),
          body_fat_rate: existing.body_fat_rate === null || existing.body_fat_rate === undefined ? "" : String(existing.body_fat_rate),
          note: existing.note || ""
        }
      });
    }
  },

  handleInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  validate() {
    const weight = Number(this.data.form.weight_kg);
    if (!Number.isFinite(weight) || weight < 30 || weight > 250) return "体重需在 30-250 kg 之间";
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
      const record = await callFunction("body", { action: "upsert", record: this.data.form }, { loadingText: "保存中" });
      this.setData({ existing: record });
      showSuccess("体重已保存");
    } finally {
      this.setData({ loading: false });
    }
  }
});

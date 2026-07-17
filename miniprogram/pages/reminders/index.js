const { callFunction } = require("../../utils/cloud");
const { showError, showSuccess } = require("../../utils/toast");

const META = {
  breakfast: { label: "早餐提醒", desc: "提醒记录早餐" },
  lunch: { label: "午餐提醒", desc: "提醒记录午餐" },
  dinner: { label: "晚餐提醒", desc: "提醒记录晚餐" },
  water: { label: "喝水提醒", desc: "提醒完成当天饮水" },
  exercise: { label: "运动提醒", desc: "提醒记录当天运动" },
  weight: { label: "体重提醒", desc: "提醒记录当天体重" }
};

function statusText(status, enabled) {
  if (enabled && status === "long_term") return "已开启长期提醒";
  if (enabled && status === "accept") return "已授权，发送一次后需重新授权";
  if (status === "consumed") return "本次授权已使用，请重新开启";
  if (status === "reject" || status === "ban") return "未授权";
  return enabled ? "已开启" : "未开启";
}

function decorate(item) {
  const meta = META[item.reminder_type] || {};
  return Object.assign({}, item, meta, {
    status_text: statusText(item.authorization_status, item.enabled)
  });
}

Page({
  data: {
    settings: [],
    loading: false,
    missingTemplateCount: 0
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "提醒设置" });
    this.loadSettings();
  },

  async loadSettings() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const settings = await callFunction("reminder", { action: "get" }, { loadingText: "加载提醒" });
      this.setData({
        settings: (settings || []).map(decorate),
        missingTemplateCount: (settings || []).filter((item) => !item.template_available).length
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  async saveSetting(index, changes) {
    const current = this.data.settings[index];
    const next = Object.assign({}, current, changes);
    const saved = await callFunction("reminder", {
      action: "save",
      reminder_type: next.reminder_type,
      reminder_time: next.reminder_time,
      enabled: next.enabled,
      subscription_accepted: changes.subscriptionAccepted === true
    }, { loadingText: "保存中" });
    const settings = this.data.settings.slice();
    settings[index] = decorate(saved);
    this.setData({ settings });
  },

  handleToggle(event) {
    const index = Number(event.currentTarget.dataset.index);
    const enabled = event.detail.value === true;
    const item = this.data.settings[index];
    if (!item) return;

    if (!enabled) {
      this.saveSetting(index, { enabled: false }).then(() => showSuccess("提醒已关闭")).catch(() => this.loadSettings());
      return;
    }

    if (!item.template_available || !item.template_id) {
      showError("订阅消息模板尚未配置");
      this.loadSettings();
      return;
    }

    wx.requestSubscribeMessage({
      tmplIds: [item.template_id],
      success: (result) => {
        const status = result[item.template_id];
        if (status !== "accept") {
          showError("未获得订阅授权");
          this.loadSettings();
          return;
        }
        this.saveSetting(index, {
          enabled: true,
          subscriptionAccepted: true
        }).then(() => showSuccess("提醒已开启")).catch(() => this.loadSettings());
      },
      fail: (error) => {
        showError(error, "订阅授权失败");
        this.loadSettings();
      }
    });
  },

  handleTime(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.settings[index];
    if (!item) return;
    this.saveSetting(index, { reminder_time: event.detail.value })
      .then(() => showSuccess("时间已保存"))
      .catch(() => this.loadSettings());
  }
});

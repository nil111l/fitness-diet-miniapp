const { callFunction } = require("../../../utils/cloud");
const { showError, showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { MEAL_OPTIONS, getMealIndex } = require("../../../utils/meal");

const TEMPLATE_OPTIONS = [
  { label: "早餐模板", value: "breakfast" },
  { label: "午餐模板", value: "lunch" },
  { label: "晚餐模板", value: "dinner" },
  { label: "加餐模板", value: "snack" },
  { label: "自定义模板", value: "custom" }
];

Page({
  data: {
    records: [],
    selectedIds: [],
    name: "",
    templateOptions: TEMPLATE_OPTIONS,
    templateIndex: 4,
    mealOptions: MEAL_OPTIONS,
    mealIndex: 0,
    loading: false,
    date: ""
  },

  onLoad(query) {
    wx.setNavigationBarTitle({ title: "新建饮食模板" });
    const meal = query && query.meal ? query.meal : "";
    const templateIndex = TEMPLATE_OPTIONS.findIndex((item) => item.value === meal);
    this.setData({
      date: formatDate(),
      mealIndex: getMealIndex(meal),
      templateIndex: templateIndex >= 0 ? templateIndex : 4,
      presetMeal: meal
    });
    this.loadRecords();
  },

  async loadRecords() {
    this.setData({ loading: true });
    try {
      const records = await callFunction("diet", { action: "list", record_date: this.data.date }, { loadingText: "加载今日饮食" });
      const availableRecords = this.data.presetMeal ? records.filter((item) => item.meal_type === this.data.presetMeal) : records;
      const selectedIds = this.data.presetMeal ? availableRecords.map((item) => item._id) : [];
      this.setData({
        selectedIds,
        records: availableRecords.map((item) => Object.assign({}, item, { selected: selectedIds.indexOf(item._id) >= 0 }))
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  handleName(event) {
    this.setData({ name: event.detail.value });
  },

  handleTemplateType(event) {
    this.setData({ templateIndex: Number(event.detail.value) });
  },

  handleMeal(event) {
    this.setData({ mealIndex: Number(event.detail.value) });
  },

  handleSelection(event) {
    const selectedIds = event.detail.value || [];
    this.setData({
      selectedIds,
      records: this.data.records.map((item) => Object.assign({}, item, { selected: selectedIds.indexOf(item._id) >= 0 }))
    });
  },

  async saveTemplate() {
    const name = this.data.name.trim();
    if (!name) return showError("请填写模板名称");
    if (!this.data.selectedIds.length) return showError("请至少选择一条记录");
    const selectedRecords = this.data.records.filter((item) => this.data.selectedIds.indexOf(item._id) >= 0);
    if (new Set(selectedRecords.map((item) => item.meal_type)).size > 1) return showError("一次只能保存同一餐次的记录");
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await callFunction("diet", {
        action: "saveTemplate",
        template: {
          name,
          template_type: TEMPLATE_OPTIONS[this.data.templateIndex].value,
          default_meal_type: MEAL_OPTIONS[this.data.mealIndex].value,
          record_ids: this.data.selectedIds
        }
      }, { loadingText: "保存模板" });
      showSuccess("模板已保存");
      wx.redirectTo({ url: "/pages/diet/templates/index" });
    } finally {
      this.setData({ loading: false });
    }
  },

  goDiet() {
    wx.redirectTo({ url: "/pages/diet/detail/index" });
  }
});

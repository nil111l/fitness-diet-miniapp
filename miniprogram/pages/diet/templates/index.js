const { callFunction } = require("../../../utils/cloud");
const { showSuccess } = require("../../../utils/toast");
const { formatDate } = require("../../../utils/date");
const { MEAL_OPTIONS, getMealIndex } = require("../../../utils/meal");

const TYPE_LABELS = {
  breakfast: "早餐模板",
  lunch: "午餐模板",
  dinner: "晚餐模板",
  snack: "加餐模板",
  custom: "自定义模板"
};

function decorate(item) {
  return Object.assign({}, item, {
    type_label: TYPE_LABELS[item.template_type] || "饮食模板",
    mealIndex: getMealIndex(item.default_meal_type),
    food_names: (item.items || []).map((food) => food.food_name).join("、")
  });
}

Page({
  data: {
    items: [],
    mealOptions: MEAL_OPTIONS,
    page: 1,
    hasMore: false,
    loading: false
  },

  onShow() {
    wx.setNavigationBarTitle({ title: "饮食模板" });
    this.loadTemplates(true);
  },

  async loadTemplates(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });
    try {
      const result = await callFunction("diet", { action: "templates", page, page_size: 10 }, { loadingText: "加载模板" });
      const items = result.items.map(decorate);
      this.setData({
        items: reset ? items : this.data.items.concat(items),
        page: page + 1,
        hasMore: result.has_more
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadTemplates(false);
  },

  handleMeal(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({ [`items[${index}].mealIndex`]: Number(event.detail.value) });
  },

  async applyTemplate(event) {
    const index = Number(event.currentTarget.dataset.index);
    const item = this.data.items[index];
    const result = await callFunction("diet", {
      action: "applyTemplate",
      template_id: item._id,
      meal_type: MEAL_OPTIONS[item.mealIndex].value,
      record_date: formatDate()
    }, { loadingText: "添加模板" });
    showSuccess(`已添加 ${result.count} 条`);
    wx.navigateTo({ url: "/pages/diet/detail/index" });
  },

  removeTemplate(event) {
    const item = event.currentTarget.dataset.item;
    wx.showModal({
      title: "删除饮食模板",
      content: `确认删除“${item.name}”？已生成的饮食记录不会受影响。`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: async (result) => {
        if (!result.confirm) return;
        await callFunction("diet", { action: "removeTemplate", template_id: item._id }, { loadingText: "删除中" });
        showSuccess("模板已删除");
        this.loadTemplates(true);
      }
    });
  },

  goCreate() {
    wx.navigateTo({ url: "/pages/diet/template-edit/index" });
  }
});

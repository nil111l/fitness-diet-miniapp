const { callFunction } = require("../../../../utils/cloud");
const { GOAL_OPTIONS, MEAL_OPTIONS, DIFFICULTY_OPTIONS } = require("../../../../utils/recipe");

function createForm() {
  return {
    name: "",
    intro: "",
    cover_url: "",
    goals: [],
    meals: [],
    tag_ids: [],
    ingredients: [],
    steps: [""],
    prep_time_min: 20,
    difficulty: "easy",
    status: "inactive",
    is_recommended: false
  };
}

Page({
  data: {
    recipeId: "",
    form: createForm(),
    goalOptions: GOAL_OPTIONS.slice(1).map((item) => Object.assign({}, item, { selected: false })),
    mealOptions: MEAL_OPTIONS.slice(1).map((item) => Object.assign({}, item, { selected: false })),
    difficultyOptions: DIFFICULTY_OPTIONS,
    difficultyIndex: 0,
    tagOptions: [],
    foods: [],
    loading: true,
    saving: false
  },

  onLoad(options) {
    const recipeId = options.id || "";
    this.setData({ recipeId });
    wx.setNavigationBarTitle({ title: recipeId ? "编辑食谱" : "新增食谱" });
    this.loadPage();
  },

  async fetchAll(action) {
    const items = [];
    let page = 1;
    let hasMore = true;
    while (hasMore && page <= 5) {
      const result = await callFunction("recipe", { action, page, page_size: 20 }, { showLoading: false });
      items.push(...(result.items || []));
      hasMore = Boolean(result.has_more);
      page += 1;
    }
    return items;
  },

  async loadPage() {
    try {
      const results = await Promise.all([
        this.fetchAll("adminFoodOptions"),
        this.fetchAll("adminListTags"),
        this.data.recipeId
          ? callFunction("recipe", { action: "adminDetail", recipe_id: this.data.recipeId }, { showLoading: false })
          : Promise.resolve(null)
      ]);
      const foods = results[0];
      const tags = results[1];
      const recipe = results[2];
      const form = recipe ? Object.assign(createForm(), recipe, {
        ingredients: (recipe.ingredients || []).map((item) => Object.assign({}, item, {
          food_index: Math.max(foods.findIndex((food) => food._id === item.food_id), 0)
        })),
        steps: recipe.steps && recipe.steps.length ? recipe.steps : [""]
      }) : createForm();
      this.setData({
        foods,
        form,
        goalOptions: this.data.goalOptions.map((item) => Object.assign({}, item, { selected: form.goals.includes(item.value) })),
        mealOptions: this.data.mealOptions.map((item) => Object.assign({}, item, { selected: form.meals.includes(item.value) })),
        tagOptions: tags.map((item) => Object.assign({}, item, { selected: form.tag_ids.includes(item._id) })),
        difficultyIndex: Math.max(this.data.difficultyOptions.findIndex((item) => item.value === form.difficulty), 0)
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  inputField(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  changeGroup(event) {
    const field = event.currentTarget.dataset.field;
    const optionField = field === "goals" ? "goalOptions" : "mealOptions";
    const values = event.detail.value || [];
    this.setData({
      [`form.${field}`]: values,
      [optionField]: this.data[optionField].map((item) => Object.assign({}, item, { selected: values.includes(item.value) }))
    });
  },

  changeTags(event) {
    const values = event.detail.value || [];
    this.setData({
      "form.tag_ids": values,
      tagOptions: this.data.tagOptions.map((item) => Object.assign({}, item, { selected: values.includes(item._id) }))
    });
  },

  changeDifficulty(event) {
    const index = Number(event.detail.value || 0);
    this.setData({ difficultyIndex: index, "form.difficulty": this.data.difficultyOptions[index].value });
  },

  toggleStatus(event) {
    this.setData({ "form.status": event.detail.value ? "active" : "inactive" });
  },

  toggleRecommended(event) {
    this.setData({ "form.is_recommended": event.detail.value });
  },

  addIngredient() {
    if (!this.data.foods.length) {
      wx.showToast({ title: "请先维护平台食材", icon: "none" });
      return;
    }
    if (this.data.form.ingredients.length >= 15) {
      wx.showToast({ title: "每份食谱最多 15 项食材", icon: "none" });
      return;
    }
    const ingredients = this.data.form.ingredients.concat({ food_id: this.data.foods[0]._id, food_index: 0, amount_g: 100 });
    this.setData({ "form.ingredients": ingredients });
  },

  changeIngredientFood(event) {
    const row = Number(event.currentTarget.dataset.index);
    const foodIndex = Number(event.detail.value || 0);
    this.setData({
      [`form.ingredients[${row}].food_index`]: foodIndex,
      [`form.ingredients[${row}].food_id`]: this.data.foods[foodIndex]._id
    });
  },

  inputIngredientAmount(event) {
    this.setData({ [`form.ingredients[${event.currentTarget.dataset.index}].amount_g`]: event.detail.value });
  },

  removeIngredient(event) {
    const ingredients = this.data.form.ingredients.slice();
    ingredients.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ "form.ingredients": ingredients });
  },

  addStep() {
    if (this.data.form.steps.length >= 20) return;
    this.setData({ "form.steps": this.data.form.steps.concat("") });
  },

  inputStep(event) {
    this.setData({ [`form.steps[${event.currentTarget.dataset.index}]`]: event.detail.value });
  },

  removeStep(event) {
    const steps = this.data.form.steps.slice();
    steps.splice(Number(event.currentTarget.dataset.index), 1);
    this.setData({ "form.steps": steps.length ? steps : [""] });
  },

  validateForm() {
    const form = this.data.form;
    const prepTime = Number(form.prep_time_min);
    const invalidIngredient = form.ingredients.some((item) => {
      const amount = Number(item.amount_g);
      return !item.food_id || !Number.isFinite(amount) || amount <= 0 || amount > 5000 || Math.round(amount * 10) !== amount * 10;
    });
    let message = "";
    if (!String(form.name || "").trim()) message = "请填写食谱名称";
    else if (!String(form.intro || "").trim()) message = "请填写食谱简介";
    else if (form.cover_url && !String(form.cover_url).startsWith("https://") && !String(form.cover_url).startsWith("cloud://")) message = "封面地址仅支持 https:// 或 cloud://";
    else if (!Number.isInteger(prepTime) || prepTime < 1 || prepTime > 600) message = "制作时间需在 1-600 分钟之间";
    else if (!form.goals.length) message = "请至少选择一个健身目标";
    else if (!form.meals.length) message = "请至少选择一个餐次";
    else if (!form.tag_ids.length) message = "请至少选择一个标签";
    else if (!form.ingredients.length || form.ingredients.length > 15 || invalidIngredient) message = "请正确填写 1-15 项食材和重量";
    else if (!form.steps.some((step) => String(step || "").trim())) message = "请至少填写一个制作步骤";
    if (!message) return true;
    wx.showToast({ title: message, icon: "none", duration: 2500 });
    return false;
  },

  async saveRecipe() {
    if (this.data.saving || !this.validateForm()) return;
    this.setData({ saving: true });
    try {
      const recipe = Object.assign({}, this.data.form, {
        _id: this.data.recipeId || undefined,
        ingredients: this.data.form.ingredients.map((item) => ({ food_id: item.food_id, amount_g: Number(item.amount_g) })),
        prep_time_min: Number(this.data.form.prep_time_min)
      });
      await callFunction("recipe", { action: "adminSave", recipe }, { loadingText: "保存食谱" });
      wx.showToast({ title: "食谱已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } finally {
      this.setData({ saving: false });
    }
  }
});

const ACTION_CATEGORIES = [
  { label: "全部", value: "" },
  { label: "胸部", value: "chest" },
  { label: "背部", value: "back" },
  { label: "肩部", value: "shoulder" },
  { label: "手臂", value: "arms" },
  { label: "腹部", value: "core" },
  { label: "臀腿", value: "glutes_legs" },
  { label: "全身", value: "full_body" },
  { label: "有氧", value: "cardio" },
  { label: "拉伸", value: "stretch" }
];

const PLAN_TYPES = [
  { label: "全部", value: "" },
  { label: "减脂", value: "fat_loss" },
  { label: "增肌", value: "muscle_gain" },
  { label: "塑形", value: "shaping" },
  { label: "新手入门", value: "beginner" },
  { label: "居家训练", value: "home" },
  { label: "健身房训练", value: "gym" }
];

const DIFFICULTY_OPTIONS = [
  { label: "入门", value: "easy" },
  { label: "进阶", value: "medium" },
  { label: "挑战", value: "hard" }
];

function labelFor(options, value, fallback) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : fallback;
}

function decorateAction(action) {
  const mediaUrl = String(action.video_url || "");
  return Object.assign({}, action, {
    category_text: labelFor(ACTION_CATEGORIES, action.category, "动作"),
    difficulty_text: labelFor(DIFFICULTY_OPTIONS, action.difficulty, "入门"),
    target_text: (action.target_muscles || []).join("、"),
    secondary_text: (action.secondary_muscles || []).join("、") || "无",
    is_animation: /\.(gif|webp)(?:\?|$)/i.test(mediaUrl)
  });
}

function decoratePlan(plan) {
  return Object.assign({}, plan, {
    plan_type_text: labelFor(PLAN_TYPES, plan.plan_type, "训练计划"),
    difficulty_text: labelFor(DIFFICULTY_OPTIONS, plan.difficulty, "入门"),
    actions: (plan.actions || []).map((item) => Object.assign({}, item, {
      action: item.action ? decorateAction(item.action) : null,
      rest_text: Number(item.rest_sec || 0) ? `${item.rest_sec} 秒` : "无"
    }))
  });
}

module.exports = {
  ACTION_CATEGORIES,
  PLAN_TYPES,
  DIFFICULTY_OPTIONS,
  decorateAction,
  decoratePlan
};

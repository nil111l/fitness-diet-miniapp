const ACTION_CATEGORIES = [
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
  { label: "减脂", value: "fat_loss" },
  { label: "增肌", value: "muscle_gain" },
  { label: "塑形", value: "shaping" },
  { label: "新手入门", value: "beginner" },
  { label: "居家训练", value: "home" },
  { label: "健身房训练", value: "gym" }
];

const DIFFICULTIES = ["easy", "medium", "hard"];
const STATUSES = ["active", "inactive"];
const DIFFICULTY_FACTORS = { easy: 4, medium: 7, hard: 10 };

const DEFAULT_ACTIONS = [
  {
    seed_key: "push-up",
    name: "标准俯卧撑",
    category: "chest",
    target_muscles: ["胸大肌"],
    secondary_muscles: ["肱三头肌", "三角肌前束"],
    difficulty: "easy",
    equipment: "徒手",
    steps: ["双手略宽于肩，身体保持一条直线。", "屈肘下放至胸部接近地面，再推回起始位。"],
    common_errors: ["塌腰或臀部抬得过高。", "手肘过度向两侧张开。"],
    precautions: ["全程收紧核心，肩部不要耸起。"]
  },
  {
    seed_key: "dumbbell-row",
    name: "俯身哑铃划船",
    category: "back",
    target_muscles: ["背阔肌"],
    secondary_muscles: ["斜方肌", "肱二头肌"],
    difficulty: "medium",
    equipment: "哑铃",
    steps: ["屈髋俯身，背部保持平直。", "将哑铃沿身体两侧拉向腰部，稍停后缓慢下放。"],
    common_errors: ["拉起时过度弯腰。", "用手臂甩动代替背部发力。"],
    precautions: ["重量以能稳定控制为准。"]
  },
  {
    seed_key: "shoulder-press",
    name: "哑铃肩推",
    category: "shoulder",
    target_muscles: ["三角肌"],
    secondary_muscles: ["肱三头肌"],
    difficulty: "medium",
    equipment: "哑铃",
    steps: ["哑铃举至肩部两侧，掌心向前。", "向上推起至手臂接近伸直，再缓慢还原。"],
    common_errors: ["下背过度反弓。"],
    precautions: ["收紧腹部，避免锁死肘关节。"]
  },
  {
    seed_key: "biceps-curl",
    name: "哑铃弯举",
    category: "arms",
    target_muscles: ["肱二头肌"],
    secondary_muscles: ["肱肌"],
    difficulty: "easy",
    equipment: "哑铃",
    steps: ["双臂自然下垂，肘关节贴近躯干。", "弯曲肘关节举起哑铃，顶端稍停后下放。"],
    common_errors: ["身体前后摇晃借力。"],
    precautions: ["保持手腕中立，控制下放速度。"]
  },
  {
    seed_key: "plank",
    name: "平板支撑",
    category: "core",
    target_muscles: ["腹横肌", "腹直肌"],
    secondary_muscles: ["臀大肌", "竖脊肌"],
    difficulty: "easy",
    equipment: "瑜伽垫",
    steps: ["前臂支撑地面，肘关节位于肩部下方。", "脚尖蹬地，保持头、背和腿在一条直线上。"],
    common_errors: ["塌腰或臀部过高。"],
    precautions: ["正常呼吸，出现腰部疼痛时停止。"]
  },
  {
    seed_key: "squat",
    name: "徒手深蹲",
    category: "glutes_legs",
    target_muscles: ["股四头肌", "臀大肌"],
    secondary_muscles: ["股二头肌", "小腿肌群"],
    difficulty: "easy",
    equipment: "徒手",
    steps: ["双脚与肩同宽，脚尖微微外展。", "屈髋屈膝下蹲，膝盖与脚尖方向一致，再站起。"],
    common_errors: ["膝盖向内扣。", "弯腰低头。"],
    precautions: ["重心保持在全脚掌，以可控深度为准。"]
  },
  {
    seed_key: "burpee",
    name: "波比跳",
    category: "full_body",
    target_muscles: ["全身肌群"],
    secondary_muscles: ["核心肌群"],
    difficulty: "hard",
    equipment: "徒手",
    steps: ["下蹲后双手撑地，双脚向后跳成俯卧撑位。", "双脚收回后向上跳起，然后连续下一次。"],
    common_errors: ["落地时膝盖内扣。"],
    precautions: ["先掌握分解动作，心肺不适时及时停止。"]
  },
  {
    seed_key: "jumping-jack",
    name: "开合跳",
    category: "cardio",
    target_muscles: ["心肺系统"],
    secondary_muscles: ["臀腿肌群", "肩部"],
    difficulty: "easy",
    equipment: "徒手",
    steps: ["双脚并拢站立，双臂自然下垂。", "跳起后双脚向外打开，双手在头顶上方合拢，再跳回。"],
    common_errors: ["落地过重，缺少缓冲。"],
    precautions: ["保持前脚掌轻盈落地，膝关节不适可改为左右跨步。"]
  },
  {
    seed_key: "full-body-stretch",
    name: "全身放松拉伸",
    category: "stretch",
    target_muscles: ["全身主要肌群"],
    secondary_muscles: [],
    difficulty: "easy",
    equipment: "瑜伽垫",
    steps: ["依次拉伸肩背、大腿前侧、大腿后侧和小腿。", "每个姿势保持 20-30 秒，正常呼吸。"],
    common_errors: ["快速震颤或强行压到疼痛位置。"],
    precautions: ["拉伸应有牵拉感但不应出现尖锐疼痛。"]
  }
];

const DEFAULT_PLANS = [
  { seed_key: "fat-loss", name: "全身燃脂计划", intro: "以徒手复合动作和有氧为主的基础减脂训练。", plan_type: "fat_loss", goal: "提升心肺并增加日常消耗", difficulty: "medium", duration_weeks: 6, weekly_frequency: 4, session_duration_min: 35, actions: [["jumping-jack", 3, "45秒", 30], ["squat", 4, "15次", 45], ["burpee", 3, "8次", 60], ["plank", 3, "30秒", 45], ["full-body-stretch", 1, "5分钟", 0]] },
  { seed_key: "muscle-gain", name: "基础增肌计划", intro: "覆盖推、拉和下肢的全身基础力量训练。", plan_type: "muscle_gain", goal: "提升基础力量与肌肉耐力", difficulty: "medium", duration_weeks: 8, weekly_frequency: 3, session_duration_min: 50, actions: [["push-up", 4, "8-12次", 75], ["dumbbell-row", 4, "10-12次", 75], ["shoulder-press", 3, "10次", 60], ["biceps-curl", 3, "12次", 60], ["squat", 4, "12-15次", 75]] },
  { seed_key: "shaping", name: "全身塑形计划", intro: "以稳定控制和中等容量训练改善身体线条。", plan_type: "shaping", goal: "提升全身稳定性与肌肉耐力", difficulty: "medium", duration_weeks: 6, weekly_frequency: 3, session_duration_min: 40, actions: [["squat", 4, "15次", 60], ["push-up", 3, "10次", 60], ["dumbbell-row", 3, "12次", 60], ["plank", 3, "40秒", 45], ["full-body-stretch", 1, "6分钟", 0]] },
  { seed_key: "beginner", name: "新手全身入门", intro: "动作简单、强度平稳，用于建立规律训练习惯。", plan_type: "beginner", goal: "学习基础动作并建立训练习惯", difficulty: "easy", duration_weeks: 4, weekly_frequency: 3, session_duration_min: 30, actions: [["squat", 3, "12次", 60], ["push-up", 3, "6-10次", 60], ["jumping-jack", 3, "30秒", 30], ["plank", 3, "20秒", 45], ["full-body-stretch", 1, "5分钟", 0]] },
  { seed_key: "home", name: "居家徒手训练", intro: "无需大型器械，在居家空间即可完成。", plan_type: "home", goal: "在居家环境保持全身活动量", difficulty: "easy", duration_weeks: 6, weekly_frequency: 4, session_duration_min: 30, actions: [["push-up", 3, "10次", 60], ["squat", 4, "15次", 45], ["jumping-jack", 3, "40秒", 30], ["plank", 3, "30秒", 45], ["full-body-stretch", 1, "5分钟", 0]] },
  { seed_key: "gym", name: "健身房基础力量", intro: "使用哑铃完成上肢与下肢的基础力量训练。", plan_type: "gym", goal: "掌握健身房基础力量动作", difficulty: "medium", duration_weeks: 8, weekly_frequency: 4, session_duration_min: 55, actions: [["dumbbell-row", 4, "10次", 75], ["shoulder-press", 4, "10次", 75], ["biceps-curl", 3, "12次", 60], ["squat", 4, "12次", 75], ["push-up", 3, "接近力竭", 90]] }
];

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanList(value, maxItems, maxLength) {
  return (Array.isArray(value) ? value : [])
    .map((item) => cleanText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function validMediaUrl(value) {
  const url = cleanText(value, 500);
  return !url || url.startsWith("https://") || url.startsWith("cloud://");
}

function validateActionPayload(raw) {
  const action = raw || {};
  const data = {
    name: cleanText(action.name, 40),
    category: ACTION_CATEGORIES.some((item) => item.value === action.category) ? action.category : "",
    target_muscles: cleanList(action.target_muscles, 8, 20),
    secondary_muscles: cleanList(action.secondary_muscles, 8, 20),
    difficulty: DIFFICULTIES.includes(action.difficulty) ? action.difficulty : "",
    equipment: cleanText(action.equipment, 40),
    steps: cleanList(action.steps, 20, 300),
    common_errors: cleanList(action.common_errors, 12, 200),
    precautions: cleanList(action.precautions, 12, 200),
    cover_url: cleanText(action.cover_url, 500),
    video_url: cleanText(action.video_url, 500),
    status: STATUSES.includes(action.status) ? action.status : "inactive"
  };
  let error = "";
  if (!data.name) error = "请填写动作名称";
  else if (!data.category) error = "请选择动作分类";
  else if (!data.target_muscles.length) error = "请至少填写一个目标肌群";
  else if (!data.difficulty) error = "请选择动作难度";
  else if (!data.equipment) error = "请填写所需器械";
  else if (!data.steps.length) error = "请至少填写一个动作步骤";
  else if (!data.common_errors.length) error = "请至少填写一个常见错误";
  else if (!data.precautions.length) error = "请至少填写一个注意事项";
  else if (!validMediaUrl(data.cover_url) || !validMediaUrl(data.video_url)) error = "封面和视频地址仅支持 https:// 或 cloud://";
  return { error, data };
}

function validatePlanPayload(raw) {
  const plan = raw || {};
  const actions = (Array.isArray(plan.actions) ? plan.actions : []).slice(0, 20).map((item) => ({
    action_id: cleanText(item.action_id, 80),
    sets: Number(item.sets),
    reps: cleanText(item.reps, 30),
    rest_sec: Number(item.rest_sec)
  }));
  const data = {
    name: cleanText(plan.name, 50),
    intro: cleanText(plan.intro, 240),
    cover_url: cleanText(plan.cover_url, 500),
    plan_type: PLAN_TYPES.some((item) => item.value === plan.plan_type) ? plan.plan_type : "",
    goal: cleanText(plan.goal, 100),
    difficulty: DIFFICULTIES.includes(plan.difficulty) ? plan.difficulty : "",
    duration_weeks: Number(plan.duration_weeks),
    weekly_frequency: Number(plan.weekly_frequency),
    session_duration_min: Number(plan.session_duration_min),
    actions,
    status: STATUSES.includes(plan.status) ? plan.status : "inactive"
  };
  const duplicateAction = new Set(actions.map((item) => item.action_id)).size !== actions.length;
  const invalidAction = actions.some((item) => !item.action_id || !Number.isInteger(item.sets) || item.sets < 1 || item.sets > 20 || !item.reps || !Number.isInteger(item.rest_sec) || item.rest_sec < 0 || item.rest_sec > 600);
  let error = "";
  if (!data.name) error = "请填写计划名称";
  else if (!data.intro) error = "请填写计划简介";
  else if (!data.plan_type) error = "请选择计划类型";
  else if (!data.goal) error = "请填写计划目标";
  else if (!data.difficulty) error = "请选择计划难度";
  else if (!Number.isInteger(data.duration_weeks) || data.duration_weeks < 1 || data.duration_weeks > 52) error = "计划周期需在 1-52 周之间";
  else if (!Number.isInteger(data.weekly_frequency) || data.weekly_frequency < 1 || data.weekly_frequency > 7) error = "每周训练次数需在 1-7 次之间";
  else if (!Number.isInteger(data.session_duration_min) || data.session_duration_min < 5 || data.session_duration_min > 300) error = "单次时长需在 5-300 分钟之间";
  else if (!validMediaUrl(data.cover_url)) error = "封面地址仅支持 https:// 或 cloud://";
  else if (!actions.length || invalidAction || duplicateAction) error = "请正确填写 1-20 个不重复的计划动作及组数、次数和休息时间";
  return { error, data };
}

function validateWorkoutItems(expectedItems, rawItems, requireCompleted = true) {
  const expected = Array.isArray(expectedItems) ? expectedItems : [];
  const items = Array.isArray(rawItems) ? rawItems : [];
  const byId = {};
  items.forEach((item) => { byId[item.action_id] = item; });
  const data = expected.map((action) => {
    const item = byId[action.action_id] || {};
    return {
      action_id: action.action_id,
      completed: Boolean(item.completed),
      actual_reps: item.actual_reps === "" || item.actual_reps === undefined ? 0 : Number(item.actual_reps),
      weight_kg: item.weight_kg === "" || item.weight_kg === undefined ? 0 : Number(item.weight_kg)
    };
  });
  const invalidNumber = data.some((item) => !Number.isInteger(item.actual_reps) || item.actual_reps < 0 || item.actual_reps > 10000 || !Number.isFinite(item.weight_kg) || item.weight_kg < 0 || item.weight_kg > 1000 || Math.round(item.weight_kg * 10) !== item.weight_kg * 10);
  let error = "";
  const receivedIds = new Set(items.map((item) => item.action_id));
  if (!expected.length || items.length !== expected.length || receivedIds.size !== expected.length || data.some((item) => !item.action_id)) error = "训练动作数据不完整，请刷新后重试";
  else if (requireCompleted && data.some((item) => !item.completed)) error = "请先逐项完成今日训练";
  else if (invalidNumber) error = "实际次数需为非负整数，重量需在 0-1000 kg 之间且最多一位小数";
  return { error, data };
}

function estimateWorkoutCalories(durationMin, difficulty) {
  return Math.round(Number(durationMin || 0) * Number(DIFFICULTY_FACTORS[difficulty] || 0) * 10) / 10;
}

function buildDefaultWorkoutSeeds() {
  const actions = DEFAULT_ACTIONS.map((item) => Object.assign({
    _id: `phase8-action-${item.seed_key}`,
    cover_url: "",
    video_url: "",
    status: "active",
    seed_source: "phase8-foundation"
  }, item));
  const actionIdByKey = {};
  actions.forEach((item) => { actionIdByKey[item.seed_key] = item._id; });
  const plans = DEFAULT_PLANS.map((item) => Object.assign({
    _id: `phase8-plan-${item.seed_key}`,
    cover_url: "",
    status: "active",
    seed_source: "phase8-foundation"
  }, item, {
    actions: item.actions.map((action, index) => ({
      action_id: actionIdByKey[action[0]],
      sets: action[1],
      reps: action[2],
      rest_sec: action[3],
      sort_order: index + 1
    }))
  }));
  return { actions, plans };
}

module.exports = {
  ACTION_CATEGORIES,
  PLAN_TYPES,
  DIFFICULTIES,
  buildDefaultWorkoutSeeds,
  validateActionPayload,
  validatePlanPayload,
  validateWorkoutItems,
  estimateWorkoutCalories
};

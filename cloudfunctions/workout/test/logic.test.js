const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ACTION_CATEGORIES,
  PLAN_TYPES,
  buildDefaultWorkoutSeeds,
  validateActionPayload,
  validatePlanPayload,
  validateWorkoutItems,
  estimateWorkoutCalories
} = require("../lib");

test("基础内容覆盖 9 个动作分类和 6 个训练计划类型", () => {
  const seeds = buildDefaultWorkoutSeeds();
  assert.deepEqual(new Set(seeds.actions.map((item) => item.category)), new Set(ACTION_CATEGORIES.map((item) => item.value)));
  assert.deepEqual(new Set(seeds.plans.map((item) => item.plan_type)), new Set(PLAN_TYPES.map((item) => item.value)));
  assert.equal(seeds.plans.every((plan) => plan.actions.length >= 4), true);
});

test("动作字段需要完整且媒体地址只允许安全协议", () => {
  const valid = validateActionPayload({
    name: "标准俯卧撑",
    category: "chest",
    target_muscles: ["胸大肌"],
    secondary_muscles: ["肱三头肌"],
    difficulty: "easy",
    equipment: "徒手",
    steps: ["撑起身体"],
    common_errors: ["塌腰"],
    precautions: ["保持核心稳定"],
    cover_url: "https://example.com/push-up.jpg",
    video_url: ""
  });
  assert.equal(valid.error, "");
  assert.equal(valid.data.name, "标准俯卧撑");

  const invalid = validateActionPayload(Object.assign({}, valid.data, { video_url: "ftp://example.com/demo.mp4" }));
  assert.match(invalid.error, /地址/);
});

test("训练计划校验周期、每周次数、时长和动作参数", () => {
  const valid = validatePlanPayload({
    name: "新手全身计划",
    intro: "适合初次开始训练的用户。",
    plan_type: "beginner",
    goal: "建立训练习惯",
    difficulty: "easy",
    duration_weeks: 4,
    weekly_frequency: 3,
    session_duration_min: 30,
    actions: [{ action_id: "action-1", sets: 3, reps: "12次", rest_sec: 60 }]
  });
  assert.equal(valid.error, "");

  const invalid = validatePlanPayload(Object.assign({}, valid.data, { weekly_frequency: 8 }));
  assert.match(invalid.error, /每周/);
});

test("完成今日训练时要求每个计划动作都已标记完成", () => {
  const planActions = [
    { action_id: "a1" },
    { action_id: "a2" }
  ];
  const valid = validateWorkoutItems(planActions, [
    { action_id: "a1", completed: true, actual_reps: 12, weight_kg: 0 },
    { action_id: "a2", completed: true, actual_reps: 10, weight_kg: 15 }
  ]);
  assert.equal(valid.error, "");
  assert.equal(valid.data.length, 2);

  const invalid = validateWorkoutItems(planActions, [
    { action_id: "a1", completed: true, actual_reps: 12, weight_kg: 0 },
    { action_id: "a2", completed: false, actual_reps: 0, weight_kg: 0 }
  ]);
  assert.match(invalid.error, /逐项完成/);
});

test("训练草稿允许未完成动作，但仍校验动作集合和输入数值", () => {
  const expected = [{ action_id: "a1" }, { action_id: "a2" }];
  const draft = validateWorkoutItems(expected, [
    { action_id: "a1", completed: true, actual_reps: 12, weight_kg: 0 },
    { action_id: "a2", completed: false, actual_reps: 0, weight_kg: 0 }
  ], false);
  assert.equal(draft.error, "");

  const duplicate = validateWorkoutItems(expected, [
    { action_id: "a1", completed: true, actual_reps: 12, weight_kg: 0 },
    { action_id: "a1", completed: false, actual_reps: 0, weight_kg: 0 }
  ], false);
  assert.match(duplicate.error, /数据不完整/);
});

test("训练消耗由服务端按难度和计划时长计算", () => {
  assert.equal(estimateWorkoutCalories(30, "easy"), 120);
  assert.equal(estimateWorkoutCalories(45, "medium"), 315);
  assert.equal(estimateWorkoutCalories(20, "hard"), 200);
});

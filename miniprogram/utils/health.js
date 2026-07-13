const ACTIVITY_OPTIONS = [
  { label: "久坐少动", value: "sedentary" },
  { label: "轻度活动", value: "light" },
  { label: "中度活动", value: "moderate" },
  { label: "高强度活动", value: "active" }
];

const GOAL_OPTIONS = [
  { label: "减脂", value: "lose_weight" },
  { label: "增肌", value: "gain_muscle" },
  { label: "保持健康", value: "maintain" }
];

const GENDER_OPTIONS = [
  { label: "男", value: "male" },
  { label: "女", value: "female" }
];

function findIndexByValue(options, value) {
  const index = options.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

function getLabel(options, value) {
  const item = options.find((option) => option.value === value);
  return item ? item.label : "";
}

module.exports = {
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  GENDER_OPTIONS,
  findIndexByValue,
  getLabel
};

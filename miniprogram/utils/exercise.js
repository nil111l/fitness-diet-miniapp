const EXERCISE_TYPES = [
  "力量训练",
  "跑步",
  "快走",
  "骑行",
  "游泳",
  "跳绳",
  "瑜伽",
  "HIIT",
  "其他"
];

const INTENSITY_OPTIONS = [
  { label: "低", value: "low", factor: 4 },
  { label: "中", value: "medium", factor: 7 },
  { label: "高", value: "high", factor: 10 }
];

function getIntensityIndex(value) {
  const index = INTENSITY_OPTIONS.findIndex((item) => item.value === value);
  return index >= 0 ? index : 1;
}

function getTypeIndex(value) {
  const index = EXERCISE_TYPES.findIndex((item) => item === value);
  return index >= 0 ? index : 0;
}

function getIntensityLabel(value) {
  const item = INTENSITY_OPTIONS.find((option) => option.value === value);
  return item ? item.label : "中";
}

module.exports = {
  EXERCISE_TYPES,
  INTENSITY_OPTIONS,
  getIntensityIndex,
  getTypeIndex,
  getIntensityLabel
};

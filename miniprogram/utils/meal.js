const MEAL_OPTIONS = [
  { label: "早餐", value: "breakfast" },
  { label: "午餐", value: "lunch" },
  { label: "晚餐", value: "dinner" },
  { label: "加餐", value: "snack" }
];

function getMealLabel(value) {
  const meal = MEAL_OPTIONS.find((item) => item.value === value);
  return meal ? meal.label : "饮食";
}

function getMealIndex(value) {
  const index = MEAL_OPTIONS.findIndex((item) => item.value === value);
  return index >= 0 ? index : 0;
}

module.exports = {
  MEAL_OPTIONS,
  getMealLabel,
  getMealIndex
};

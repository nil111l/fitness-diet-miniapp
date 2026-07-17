function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function dateFromKey(value) {
  return new Date(`${value}T00:00:00Z`);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, offset) {
  const date = typeof value === "string" ? dateFromKey(value) : new Date(value);
  date.setUTCDate(date.getUTCDate() + offset);
  return dateKey(date);
}

function dateRange(start, end) {
  const dates = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) dates.push(cursor);
  return dates;
}

function weekRange(today) {
  const date = dateFromKey(today);
  const weekday = date.getUTCDay() || 7;
  const start = addDays(today, 1 - weekday);
  return { start, end: addDays(start, 6), dates: dateRange(start, addDays(start, 6)) };
}

function monthRange(month) {
  const parts = String(month || "").split("-").map(Number);
  const count = new Date(Date.UTC(parts[0], parts[1], 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(count).padStart(2, "0")}`;
  return { start, end, dates: dateRange(start, end) };
}

function recordsInRange(records, start, end) {
  return (records || []).filter((item) => item.record_date >= start && item.record_date <= end);
}

function groupDietByDate(records) {
  const result = {};
  (records || []).forEach((item) => {
    if (!result[item.record_date]) result[item.record_date] = { calorie: 0, protein: 0, carb: 0, fat: 0, dinner: 0 };
    const day = result[item.record_date];
    day.calorie += Number(item.calorie || 0);
    day.protein += Number(item.protein || 0);
    day.carb += Number(item.carb || 0);
    day.fat += Number(item.fat || 0);
    if (item.meal_type === "dinner") day.dinner += Number(item.calorie || 0);
  });
  Object.keys(result).forEach((key) => {
    Object.keys(result[key]).forEach((field) => { result[key][field] = round1(result[key][field]); });
  });
  return result;
}

function uniqueDates(records, field = "record_date") {
  return Array.from(new Set((records || []).map((item) => item[field]).filter(Boolean))).sort();
}

function mostFrequentFood(records) {
  const counts = {};
  (records || []).forEach((item) => {
    const key = item.food_id || item.food_name;
    if (!key) return;
    if (!counts[key]) counts[key] = { name: item.food_name || "未命名食物", count: 0, total_amount_g: 0 };
    counts[key].count += 1;
    counts[key].total_amount_g += Number(item.amount_g || 0);
  });
  return Object.values(counts).sort((left, right) => right.count - left.count || right.total_amount_g - left.total_amount_g || left.name.localeCompare(right.name, "zh-CN"))[0] || null;
}

function firstAndLastWeight(records) {
  const sorted = (records || []).slice().sort((left, right) => String(left.record_date).localeCompare(String(right.record_date)) || new Date(left.updated_at || left.created_at || 0) - new Date(right.updated_at || right.created_at || 0));
  if (!sorted.length) return { start: null, end: null, change: null, count: 0 };
  const first = Number(sorted[0].weight_kg || 0);
  const last = Number(sorted[sorted.length - 1].weight_kg || 0);
  return { start: round1(first), end: round1(last), change: sorted.length >= 2 ? round1(last - first) : null, count: sorted.length };
}

function average(values) {
  return values.length ? round1(values.reduce((total, value) => total + Number(value || 0), 0) / values.length) : 0;
}

function longestStreak(dates) {
  const sorted = Array.from(new Set(dates || [])).sort();
  let longest = 0;
  let running = 0;
  let previous = "";
  sorted.forEach((current) => {
    running = previous && addDays(previous, 1) === current ? running + 1 : 1;
    longest = Math.max(longest, running);
    previous = current;
  });
  return longest;
}

function weeklySummary(input) {
  const range = weekRange(input.today);
  const dietRecords = recordsInRange(input.dietRecords, range.start, range.end);
  const exerciseRecords = recordsInRange(input.exerciseRecords, range.start, range.end);
  const bodyRecords = recordsInRange(input.bodyRecords, range.start, range.end);
  const dietByDate = groupDietByDate(dietRecords);
  const dietDates = Object.keys(dietByDate).sort();
  const exerciseDates = uniqueDates(exerciseRecords);
  const weight = firstAndLastWeight(bodyRecords);
  const favorite = mostFrequentFood(dietRecords);
  const hasData = dietRecords.length + exerciseRecords.length + bodyRecords.length > 0;
  let suggestion = "继续保持记录，积累的数据越完整，趋势越容易看清。";
  if (!hasData) suggestion = "本周还没有记录，从一餐、一次训练或一次体重开始即可。";
  else if (dietDates.length < 3) suggestion = "本周饮食记录较少，接下来可优先补充每日餐次记录。";
  else if (!exerciseRecords.length) suggestion = "饮食记录已在积累，也可以安排一次适合自己的活动。";
  return {
    period: range,
    has_data: hasData,
    average_calorie: average(dietDates.map((date) => dietByDate[date].calorie)),
    training_count: exerciseRecords.length,
    weight,
    diet_record_days: dietDates.length,
    exercise_record_days: exerciseDates.length,
    most_frequent_food: favorite ? { name: favorite.name, count: favorite.count, total_amount_g: round1(favorite.total_amount_g) } : null,
    suggestion
  };
}

function macroCompliance(dietByDate, goal) {
  const dates = Object.keys(dietByDate);
  const targets = goal && goal.macro_targets ? goal.macro_targets : {};
  const fields = [
    ["protein", Number(targets.protein_g || 0)],
    ["carb", Number(targets.carb_g || 0)],
    ["fat", Number(targets.fat_g || 0)]
  ];
  const result = {};
  fields.forEach(([field, target]) => {
    const achieved = target ? dates.filter((date) => Number(dietByDate[date][field] || 0) >= target * 0.8).length : 0;
    result[field] = { target: round1(target), achieved_days: achieved, recorded_days: dates.length, rate: dates.length && target ? Math.round(achieved / dates.length * 100) : 0 };
  });
  return result;
}

function monthlySummary(input) {
  const range = monthRange(input.month);
  const dietRecords = recordsInRange(input.dietRecords, range.start, range.end);
  const exerciseRecords = recordsInRange(input.exerciseRecords, range.start, range.end);
  const bodyRecords = recordsInRange(input.bodyRecords, range.start, range.end);
  const checkinDates = uniqueDates((input.checkinRecords || []).filter((item) => item.checkin_date >= range.start && item.checkin_date <= range.end), "checkin_date");
  const dietByDate = groupDietByDate(dietRecords);
  const dietDates = Object.keys(dietByDate).sort();
  const weight = firstAndLastWeight(bodyRecords);
  const hasData = dietRecords.length + exerciseRecords.length + bodyRecords.length + checkinDates.length > 0;
  let suggestion = "下月继续保持稳定记录，并根据自己的节奏逐步调整。";
  if (!hasData) suggestion = "该月还没有记录，可切换其他月份或从今天重新开始。";
  else if (dietDates.length < 7) suggestion = "饮食记录天数偏少，下月可先以每周记录 3 天为目标。";
  else if (!exerciseRecords.length) suggestion = "下月可以从低门槛活动开始，逐步建立运动节奏。";
  return {
    month: input.month,
    has_data: hasData,
    weight,
    average_calorie: average(dietDates.map((date) => dietByDate[date].calorie)),
    exercise_count: exerciseRecords.length,
    longest_checkin_days: longestStreak(checkinDates),
    diet_record_days: dietDates.length,
    macro_compliance: macroCompliance(dietByDate, input.goal),
    suggestion
  };
}

function lastDates(today, count, offset = 0) {
  const dates = [];
  for (let index = count - 1; index >= 0; index -= 1) dates.push(addDays(today, offset - index));
  return dates;
}

function everyDate(dates, predicate) {
  return dates.every((date) => predicate(date));
}

function evaluateDietInsights(input) {
  const today = input.today;
  const dietByDate = groupDietByDate(input.dietRecords || []);
  const goal = input.goal || {};
  const calorieTarget = Number(goal.daily_calorie_target || 0);
  const proteinTarget = Number(goal.macro_targets && goal.macro_targets.protein_g || 0);
  const recentThree = lastDates(today, 3);
  const previousTwo = lastDates(today, 2, -1);
  const insights = [];
  if (calorieTarget && everyDate(recentThree, (date) => dietByDate[date] && dietByDate[date].calorie > calorieTarget * 1.1)) {
    insights.push({ code: "CALORIE_HIGH_3_DAYS", level: "attention", title: "近期摄入略高", message: "连续 3 天摄入热量高于当前目标 10%，可以留意份量和加餐安排。" });
  }
  if (proteinTarget && everyDate(recentThree, (date) => dietByDate[date] && dietByDate[date].protein < proteinTarget * 0.8)) {
    insights.push({ code: "PROTEIN_LOW_3_DAYS", level: "suggestion", title: "可以关注蛋白质", message: "连续 3 天蛋白质低于当前目标 80%，可适量增加蛋、奶、豆制品或瘦肉等优质蛋白。" });
  }
  if (everyDate(recentThree, (date) => dietByDate[date] && dietByDate[date].calorie > 0 && dietByDate[date].dinner / dietByDate[date].calorie > 0.4)) {
    insights.push({ code: "DINNER_RATIO_HIGH_3_DAYS", level: "suggestion", title: "晚餐占比较高", message: "连续 3 天晚餐热量占全天 40% 以上，可以尝试把部分能量安排到早餐或午餐。" });
  }
  if (everyDate(previousTwo, (date) => !dietByDate[date])) {
    insights.push({ code: "DIET_MISSING_2_DAYS", level: "reminder", title: "恢复饮食记录", message: "最近连续 2 天没有饮食记录，从下一餐重新开始即可。" });
  }
  return { dates_checked: { recent_three: recentThree, previous_two: previousTwo }, insights };
}

module.exports = {
  addDays,
  dateRange,
  weekRange,
  monthRange,
  groupDietByDate,
  longestStreak,
  weeklySummary,
  monthlySummary,
  evaluateDietInsights
};

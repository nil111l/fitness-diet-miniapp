const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    const errMsg = String(error.errMsg || error.message || "");
    if (error.errCode === COLLECTION_NOT_EXIST_CODE || errMsg.indexOf("collection not exists") >= 0 || errMsg.indexOf("DATABASE_COLLECTION_NOT_EXIST") >= 0) {
      await db.createCollection(name);
      return;
    }
    throw error;
  }
}

async function ensureCollections() {
  await ensureCollection("fitness_goals");
  await ensureCollection("diet_records");
  await ensureCollection("exercise_records");
  await ensureCollection("body_records");
  await ensureCollection("checkin_records");
}

function pad(value) {
  return `${value}`.padStart(2, "0");
}

function formatDate(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function lastSevenDates() {
  const today = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i -= 1) {
    dates.push(formatDate(addDays(today, -i)));
  }
  return dates;
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function sum(records, key) {
  return round1(records.reduce((total, item) => total + Number(item[key] || 0), 0));
}

function buildCheckinMap(records) {
  const map = {};
  records.forEach((item) => {
    map[item.checkin_date] = true;
  });
  return map;
}

function uniqueCheckinDates(records) {
  const map = buildCheckinMap(records);
  return Object.keys(map).sort();
}

function dayDistance(from, to) {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
}

function chinaDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function streakEligibleRecords(records, todayKey) {
  return records.filter((item) => {
    const checkinDate = String(item.checkin_date || "");
    if (!checkinDate || checkinDate > todayKey) return false;
    if (!item.created_at) return true;
    const createdKey = chinaDateKey(item.created_at);
    if (!createdKey) return true;
    return dayDistance(checkinDate, createdKey) <= 1;
  });
}

function calculateStreaks(records, todayKey) {
  const eligibleRecords = streakEligibleRecords(records, todayKey);
  const dates = uniqueCheckinDates(eligibleRecords);
  const map = buildCheckinMap(eligibleRecords);
  const today = new Date(`${todayKey}T00:00:00`);
  let cursor = today;
  if (!map[todayKey]) cursor = addDays(today, -1);
  let current = 0;
  for (let i = 0; i < 1000; i += 1) {
    const key = formatDate(cursor);
    if (!map[key]) break;
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let running = 0;
  let previous = "";
  dates.forEach((date) => {
    running = previous && dayDistance(previous, date) === 1 ? running + 1 : 1;
    longest = Math.max(longest, running);
    previous = date;
  });
  return { current, longest };
}

async function getCheckinSummary(openid, date) {
  const result = await db.collection("checkin_records").where({ openid, deleted_at: null }).orderBy("checkin_date", "desc").limit(1000).get();
  const records = result.data;
  const streaks = calculateStreaks(records, date);
  const todayRecords = records.filter((item) => item.checkin_date === date);
  return {
    streak_days: streaks.current,
    diet_done: todayRecords.some((item) => item.type === "diet"),
    exercise_done: todayRecords.some((item) => item.type === "exercise"),
    weight_done: todayRecords.some((item) => item.type === "weight")
  };
}

async function getAllCheckins(openid) {
  const records = [];
  const pageSize = 1000;
  for (let page = 0; page < 20; page += 1) {
    const result = await db.collection("checkin_records").where({ openid, deleted_at: null }).skip(page * pageSize).limit(pageSize).get();
    records.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return records;
}

async function dashboard(event, openid) {
  const date = event.record_date || formatDate();
  const goalResult = await db.collection("fitness_goals").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const goal = goalResult.data[0] || null;
  const dietResult = await db.collection("diet_records").where({ openid, record_date: date, deleted_at: null }).limit(100).get();
  const exerciseResult = await db.collection("exercise_records").where({ openid, record_date: date, deleted_at: null }).limit(100).get();
  const records = dietResult.data;
  const exercises = exerciseResult.data;
  const calorie = sum(records, "calorie");
  const exerciseCalories = sum(exercises, "calorie_burned");
  const protein = sum(records, "protein");
  const carb = sum(records, "carb");
  const fat = sum(records, "fat");
  const targetCalories = goal ? Number(goal.daily_calorie_target || 0) : 0;
  const macroTargets = goal && goal.macro_targets ? goal.macro_targets : { protein_g: 0, carb_g: 0, fat_g: 0 };
  const checkin = await getCheckinSummary(openid, date);

  return ok({
    date,
    goal,
    target_calories: targetCalories,
    intake_calories: calorie,
    exercise_calories: exerciseCalories,
    remaining_calories: Math.max(round1(targetCalories - calorie + exerciseCalories), 0),
    macros: { protein, carb, fat },
    macro_targets: {
      protein_g: Number(macroTargets.protein_g || 0),
      carb_g: Number(macroTargets.carb_g || 0),
      fat_g: Number(macroTargets.fat_g || 0)
    },
    diet_checkin_done: checkin.diet_done,
    exercise_checkin_done: checkin.exercise_done,
    weight_checkin_done: checkin.weight_done,
    streak_days: checkin.streak_days,
    records,
    exercises
  });
}

function daysInMonth(month) {
  const parts = month.split("-").map(Number);
  return new Date(parts[0], parts[1], 0).getDate();
}

async function calendar(event, openid) {
  const today = formatDate();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(event.month || "")) ? event.month : today.slice(0, 7);
  const records = await getAllCheckins(openid);
  const monthRecords = records.filter((item) => String(item.checkin_date || "").slice(0, 7) === month);
  const byDate = {};
  monthRecords.forEach((item) => {
    if (!byDate[item.checkin_date]) byDate[item.checkin_date] = { diet: false, exercise: false, weight: false };
    if (item.type === "diet" || item.type === "exercise" || item.type === "weight") {
      byDate[item.checkin_date][item.type] = true;
    }
  });
  const count = daysInMonth(month);
  const days = [];
  for (let day = 1; day <= count; day += 1) {
    const date = `${month}-${pad(day)}`;
    const status = byDate[date] || { diet: false, exercise: false, weight: false };
    days.push({
      date,
      day,
      diet: status.diet,
      exercise: status.exercise,
      weight: status.weight,
      checked: status.diet || status.exercise || status.weight,
      is_today: date === today,
      is_future: date > today
    });
  }
  const first = new Date(`${month}-01T00:00:00`);
  const streaks = calculateStreaks(records, today);
  return ok({
    month,
    today,
    first_weekday: first.getDay(),
    days,
    current_streak_days: streaks.current,
    longest_streak_days: streaks.longest
  });
}

function buildTrend(dates, records, key, mode) {
  return dates.map((date) => {
    const dayRecords = records.filter((item) => item.record_date === date);
    let value = 0;
    if (mode === "last") {
      value = dayRecords.length ? Number(dayRecords[dayRecords.length - 1][key] || 0) : 0;
    } else {
      value = sum(dayRecords, key);
    }
    return { date, value: round1(value) };
  });
}

async function trends(openid) {
  const dates = lastSevenDates();
  const fromDate = dates[0];
  const dietResult = await db.collection("diet_records").where({ openid, deleted_at: null }).limit(700).get();
  const exerciseResult = await db.collection("exercise_records").where({ openid, deleted_at: null }).limit(700).get();
  const bodyResult = await db.collection("body_records").where({ openid, deleted_at: null }).limit(100).get();
  const todayDashboard = await dashboard({ record_date: dates[6] }, openid);
  const dietRecords = dietResult.data.filter((item) => item.record_date >= fromDate);
  const exerciseRecords = exerciseResult.data.filter((item) => item.record_date >= fromDate);
  const bodyRecords = bodyResult.data.filter((item) => item.record_date >= fromDate).sort((a, b) => a.record_date.localeCompare(b.record_date));

  return ok({
    dates,
    weight_trend: buildTrend(dates, bodyRecords, "weight_kg", "last"),
    calorie_trend: buildTrend(dates, dietRecords, "calorie", "sum"),
    exercise_trend: buildTrend(dates, exerciseRecords, "calorie_burned", "sum"),
    today_macros: todayDashboard.data.macros,
    today_macro_total: round1(Number(todayDashboard.data.macros.protein || 0) + Number(todayDashboard.data.macros.carb || 0) + Number(todayDashboard.data.macros.fat || 0)),
    checkin: {
      streak_days: todayDashboard.data.streak_days,
      diet_done: todayDashboard.data.diet_checkin_done,
      exercise_done: todayDashboard.data.exercise_checkin_done,
      weight_done: todayDashboard.data.weight_checkin_done
    }
  });
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action || "dashboard";

  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    await ensureCollections();
    if (action === "dashboard") return await dashboard(event, openid);
    if (action === "trends") return await trends(openid);
    if (action === "calendar") return await calendar(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    return fail("INTERNAL_ERROR", error.message || "服务暂时不可用");
  }
};

const cloud = require("wx-server-sdk");
const crypto = require("crypto");
const {
  ACTION_CATEGORIES,
  PLAN_TYPES,
  DIFFICULTIES,
  buildDefaultWorkoutSeeds,
  validateActionPayload,
  validatePlanPayload,
  validateWorkoutItems,
  estimateWorkoutCalories
} = require("./lib");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NOT_EXIST_CODE = -502005;
const INTENSITY_BY_DIFFICULTY = { easy: "low", medium: "medium", hard: "high" };

function ok(data = null) {
  return { success: true, data };
}

function fail(code, message) {
  return { success: false, code, message };
}

function businessError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.isBusinessError = true;
  return error;
}

async function ensureCollection(name) {
  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    const message = String(error.errMsg || error.message || "");
    if (error.errCode === COLLECTION_NOT_EXIST_CODE || message.includes("collection not exists") || message.includes("DATABASE_COLLECTION_NOT_EXIST")) {
      await db.createCollection(name);
      return;
    }
    throw error;
  }
}

async function ensureCollections() {
  const names = [
    "users",
    "admin_users",
    "exercise_actions",
    "workout_plans",
    "user_workout_plans",
    "workout_sessions",
    "exercise_records",
    "checkin_records"
  ];
  for (let index = 0; index < names.length; index += 1) await ensureCollection(names[index]);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date = new Date()) {
  const china = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${china.getUTCFullYear()}-${pad(china.getUTCMonth() + 1)}-${pad(china.getUTCDate())}`;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function deterministicId(parts) {
  return crypto.createHash("sha256").update(parts.join(":"), "utf8").digest("hex").slice(0, 32);
}

function pageParams(event, defaultSize = 10) {
  const page = Math.max(Number.parseInt(event.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(event.page_size, 10) || defaultSize, 1), 20);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

async function queryAll(collection, where) {
  const records = [];
  const pageSize = 100;
  for (let page = 0; page < 50; page += 1) {
    const result = await db.collection(collection).where(where).skip(page * pageSize).limit(pageSize).get();
    records.push(...result.data);
    if (result.data.length < pageSize) break;
  }
  return records;
}

async function getDocument(collection, id) {
  if (!id) return null;
  try {
    const result = await db.collection(collection).doc(id).get();
    return result.data || null;
  } catch (error) {
    const message = String(error.errMsg || error.message || "");
    if (message.includes("does not exist") || message.includes("not found") || error.errCode === -502001) return null;
    throw error;
  }
}

async function requireUser(openid) {
  const result = await db.collection("users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const user = result.data[0] || null;
  if (!user) throw businessError("LOGIN_REQUIRED", "请先登录，或确认账号状态正常");
  return user;
}

async function requireAdmin(openid) {
  const result = await db.collection("admin_users").where({ openid, status: "active", deleted_at: null }).limit(1).get();
  const admin = result.data[0] || null;
  if (!admin) throw businessError("FORBIDDEN", "当前微信身份不是管理员");
  return admin;
}

async function ensureDefaultContent() {
  const seeds = buildDefaultWorkoutSeeds();
  const actionResult = await db.collection("exercise_actions").where({ seed_source: "phase8-foundation" }).limit(100).get();
  const actionKeys = new Set(actionResult.data.map((item) => item.seed_key));
  const now = new Date();
  for (let index = 0; index < seeds.actions.length; index += 1) {
    const item = seeds.actions[index];
    if (actionKeys.has(item.seed_key)) continue;
    const data = Object.assign({}, item, { created_by: "system", updated_by: "system", created_at: now, updated_at: now, deleted_at: null });
    delete data._id;
    await db.collection("exercise_actions").doc(item._id).set({ data });
  }

  const planResult = await db.collection("workout_plans").where({ seed_source: "phase8-foundation" }).limit(100).get();
  const planKeys = new Set(planResult.data.map((item) => item.seed_key));
  for (let index = 0; index < seeds.plans.length; index += 1) {
    const item = seeds.plans[index];
    if (planKeys.has(item.seed_key)) continue;
    const data = Object.assign({}, item, { created_by: "system", updated_by: "system", created_at: now, updated_at: now, deleted_at: null });
    delete data._id;
    await db.collection("workout_plans").doc(item._id).set({ data });
  }
}

function publicAction(action) {
  return {
    _id: action._id,
    name: action.name,
    category: action.category,
    target_muscles: action.target_muscles || [],
    secondary_muscles: action.secondary_muscles || [],
    difficulty: action.difficulty,
    equipment: action.equipment,
    steps: action.steps || [],
    common_errors: action.common_errors || [],
    precautions: action.precautions || [],
    cover_url: action.cover_url || "",
    video_url: action.video_url || ""
  };
}

function publicPlan(plan, actionMap, includeActions = false) {
  const item = {
    _id: plan._id,
    name: plan.name,
    intro: plan.intro || "",
    cover_url: plan.cover_url || "",
    plan_type: plan.plan_type,
    goal: plan.goal,
    difficulty: plan.difficulty,
    duration_weeks: Number(plan.duration_weeks || 0),
    weekly_frequency: Number(plan.weekly_frequency || 0),
    session_duration_min: Number(plan.session_duration_min || 0),
    action_count: (plan.actions || []).length
  };
  if (includeActions) {
    item.actions = (plan.actions || []).map((planAction) => ({
      action_id: planAction.action_id,
      sets: Number(planAction.sets || 0),
      reps: planAction.reps || "",
      rest_sec: Number(planAction.rest_sec || 0),
      sort_order: Number(planAction.sort_order || 0),
      action: actionMap[planAction.action_id] ? publicAction(actionMap[planAction.action_id]) : null
    })).filter((planAction) => planAction.action);
  }
  return item;
}

function publicSession(session) {
  if (!session) return null;
  return {
    _id: session._id,
    plan_id: session.plan_id,
    workout_date: session.workout_date,
    status: session.status,
    items: session.items || [],
    duration_min: Number(session.duration_min || 0),
    calorie_burned: Number(session.calorie_burned || 0),
    exercise_record_id: session.exercise_record_id || "",
    completed_at: session.completed_at || null
  };
}

function publicExerciseRecord(record) {
  if (!record) return null;
  return {
    _id: record._id,
    record_date: record.record_date,
    exercise_name: record.exercise_name,
    duration_min: Number(record.duration_min || 0),
    calorie_burned: Number(record.calorie_burned || 0)
  };
}

async function activeActionMap() {
  const actions = await queryAll("exercise_actions", { status: "active", deleted_at: null });
  const map = {};
  actions.forEach((item) => { map[item._id] = item; });
  return map;
}

function planIsAvailable(plan, actionMap) {
  return Array.isArray(plan.actions) && plan.actions.length > 0 && plan.actions.every((item) => actionMap[item.action_id]);
}

async function getActivePlan(planId, actionMap) {
  const plan = await getDocument("workout_plans", planId);
  if (!plan || plan.deleted_at || plan.status !== "active") throw businessError("NOT_FOUND", "训练计划不存在或已下架");
  if (!planIsAvailable(plan, actionMap)) throw businessError("PLAN_UNAVAILABLE", "训练计划内容已调整，请重新选择计划");
  return plan;
}

async function filters(openid) {
  await requireUser(openid);
  return ok({ categories: ACTION_CATEGORIES, plan_types: PLAN_TYPES, difficulties: DIFFICULTIES });
}

async function actionList(event, openid) {
  await requireUser(openid);
  const params = pageParams(event);
  const keyword = cleanText(event.keyword, 40);
  const category = ACTION_CATEGORIES.some((item) => item.value === event.category) ? event.category : "";
  const actions = (await queryAll("exercise_actions", { status: "active", deleted_at: null }))
    .filter((item) => !category || item.category === category)
    .filter((item) => !keyword || String(item.name || "").includes(keyword) || (item.target_muscles || []).some((muscle) => muscle.includes(keyword)))
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "zh-CN"));
  return ok({
    items: actions.slice(params.skip, params.skip + params.pageSize).map(publicAction),
    page: params.page,
    page_size: params.pageSize,
    has_more: actions.length > params.skip + params.pageSize
  });
}

async function actionDetail(event, openid) {
  await requireUser(openid);
  const action = await getDocument("exercise_actions", event.action_id);
  if (!action || action.deleted_at || action.status !== "active") throw businessError("NOT_FOUND", "动作不存在或已下架");
  return ok(publicAction(action));
}

async function planList(event, openid) {
  await requireUser(openid);
  const params = pageParams(event);
  const type = PLAN_TYPES.some((item) => item.value === event.plan_type) ? event.plan_type : "";
  const actionMap = await activeActionMap();
  const plans = (await queryAll("workout_plans", { status: "active", deleted_at: null }))
    .filter((item) => !type || item.plan_type === type)
    .filter((item) => planIsAvailable(item, actionMap))
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "zh-CN"));
  return ok({
    items: plans.slice(params.skip, params.skip + params.pageSize).map((item) => publicPlan(item, actionMap)),
    page: params.page,
    page_size: params.pageSize,
    has_more: plans.length > params.skip + params.pageSize
  });
}

async function planDetail(event, openid) {
  await requireUser(openid);
  const actionMap = await activeActionMap();
  const plan = await getActivePlan(event.plan_id, actionMap);
  const selection = await selectedPlan(openid);
  return ok(Object.assign(publicPlan(plan, actionMap, true), { is_current: Boolean(selection && selection.plan_id === plan._id) }));
}

async function selectedPlan(openid) {
  const currentId = deterministicId(["current-workout-plan", openid]);
  const current = await getDocument("user_workout_plans", currentId);
  if (current && current.openid === openid && current.status === "active" && !current.deleted_at) return current;
  const selections = await queryAll("user_workout_plans", { openid, status: "active", deleted_at: null });
  return selections.sort((left, right) => new Date(right.selected_at || right.updated_at || 0).getTime() - new Date(left.selected_at || left.updated_at || 0).getTime())[0] || null;
}

async function selectPlan(event, openid) {
  const user = await requireUser(openid);
  const actionMap = await activeActionMap();
  const plan = await getActivePlan(event.plan_id, actionMap);
  const now = new Date();
  const selectionId = deterministicId(["current-workout-plan", openid]);
  await db.runTransaction(async (transaction) => {
    const activeResult = await transaction.collection("user_workout_plans").where({ openid, status: "active", deleted_at: null }).limit(100).get();
    for (let index = 0; index < activeResult.data.length; index += 1) {
      const item = activeResult.data[index];
      if (item._id !== selectionId) {
        await transaction.collection("user_workout_plans").doc(item._id).update({ data: { status: "inactive", ended_at: now, updated_at: now } });
      }
    }
    await transaction.collection("user_workout_plans").doc(selectionId).set({ data: {
      user_id: user._id,
      openid,
      plan_id: plan._id,
      status: "active",
      start_date: formatDate(),
      selected_at: now,
      ended_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    } });
  });
  return ok({ selection_id: selectionId, plan: publicPlan(plan, actionMap, true) });
}

async function currentPlan(openid) {
  await requireUser(openid);
  const selection = await selectedPlan(openid);
  if (!selection) return ok({ has_plan: false, plan: null });
  try {
    const actionMap = await activeActionMap();
    const plan = await getActivePlan(selection.plan_id, actionMap);
    return ok({ has_plan: true, selection_id: selection._id, plan: publicPlan(plan, actionMap, true) });
  } catch (error) {
    if (error.code === "NOT_FOUND" || error.code === "PLAN_UNAVAILABLE") return ok({ has_plan: false, plan: null, selection_invalid: true });
    throw error;
  }
}

function sessionItems(plan, actionMap) {
  return plan.actions.map((item) => ({
    action_id: item.action_id,
    action_name: actionMap[item.action_id].name,
    sets: Number(item.sets || 0),
    reps: item.reps || "",
    rest_sec: Number(item.rest_sec || 0),
    completed: false,
    actual_reps: 0,
    weight_kg: 0
  }));
}

async function todayWorkout(openid) {
  const user = await requireUser(openid);
  const selection = await selectedPlan(openid);
  if (!selection) return ok({ has_plan: false });
  const actionMap = await activeActionMap();
  let plan;
  try {
    plan = await getActivePlan(selection.plan_id, actionMap);
  } catch (error) {
    if (error.code === "NOT_FOUND" || error.code === "PLAN_UNAVAILABLE") return ok({ has_plan: false, selection_invalid: true });
    throw error;
  }
  const today = formatDate();
  const sessionResult = await db.collection("workout_sessions").where({ openid, plan_id: plan._id, workout_date: today, deleted_at: null }).limit(1).get();
  let session = sessionResult.data[0] || null;
  if (!session) {
    const now = new Date();
    const sessionId = deterministicId(["workout-session", openid, plan._id, today]);
    const planSnapshot = publicPlan(plan, actionMap, true);
    const data = {
      user_id: user._id,
      openid,
      plan_id: plan._id,
      selection_id: selection._id,
      workout_date: today,
      status: "draft",
      items: sessionItems(plan, actionMap),
      plan_snapshot: planSnapshot,
      duration_min: Number(plan.session_duration_min || 0),
      calorie_burned: 0,
      exercise_record_id: "",
      completed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null
    };
    await db.collection("workout_sessions").doc(sessionId).set({ data });
    session = Object.assign({ _id: sessionId }, data);
  }
  return ok({ has_plan: true, plan: session.plan_snapshot || publicPlan(plan, actionMap, true), session: publicSession(session) });
}

async function saveWorkoutProgress(event, openid) {
  await requireUser(openid);
  const session = await getDocument("workout_sessions", event.session_id);
  if (!session || session.deleted_at || session.openid !== openid) throw businessError("NOT_FOUND", "今日训练会话不存在");
  if (session.status === "completed") return ok(publicSession(session));
  const validation = validateWorkoutItems(session.items || [], event.items, false);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  const items = (session.items || []).map((item, index) => Object.assign({}, item, validation.data[index]));
  const updatedAt = new Date();
  await db.collection("workout_sessions").doc(session._id).update({ data: { items, updated_at: updatedAt } });
  return ok(publicSession(Object.assign({}, session, { items, updated_at: updatedAt })));
}

async function completeWorkout(event, openid) {
  const user = await requireUser(openid);
  const session = await getDocument("workout_sessions", event.session_id);
  if (!session || session.deleted_at || session.openid !== openid) throw businessError("NOT_FOUND", "今日训练会话不存在");
  if (session.status === "completed" && session.exercise_record_id) {
    return ok({ session: publicSession(session), exercise_record: publicExerciseRecord(await getDocument("exercise_records", session.exercise_record_id)), repeated: true });
  }
  let planSnapshot = session.plan_snapshot || null;
  if (!planSnapshot) {
    const actionMap = await activeActionMap();
    const plan = await getActivePlan(session.plan_id, actionMap);
    planSnapshot = publicPlan(plan, actionMap, true);
  }
  const validation = validateWorkoutItems(session.items || [], event.items);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  const completedItems = (session.items || []).map((item, index) => Object.assign({}, item, validation.data[index]));
  const now = new Date();
  const duration = Number(session.duration_min || planSnapshot.session_duration_min || 0);
  const calories = estimateWorkoutCalories(duration, planSnapshot.difficulty);
  const exerciseId = `workout-${session._id}`;
  const exercise = {
    user_id: user._id,
    openid,
    record_date: session.workout_date,
    exercise_type: "力量训练",
    exercise_name: planSnapshot.name,
    duration_min: duration,
    intensity: INTENSITY_BY_DIFFICULTY[planSnapshot.difficulty] || "medium",
    calorie_burned: calories,
    note: "来自今日训练计划",
    source: "workout_plan",
    workout_plan_id: session.plan_id,
    workout_session_id: session._id,
    created_at: now,
    updated_at: now,
    deleted_at: null
  };
  const existingCheckinResult = await db.collection("checkin_records").where({ openid, checkin_date: session.workout_date, type: "exercise", deleted_at: null }).limit(1).get();
  const existingCheckin = existingCheckinResult.data[0] || null;
  const checkinId = existingCheckin
    ? existingCheckin._id
    : deterministicId(["checkin", openid, session.workout_date, "exercise"]);
  const checkin = {
    user_id: user._id,
    openid,
    checkin_date: session.workout_date,
    type: "exercise",
    status: "done",
    items: ["exercise"],
    updated_at: now,
    deleted_at: null
  };
  await db.runTransaction(async (transaction) => {
    await transaction.collection("exercise_records").doc(exerciseId).set({ data: exercise });
    await transaction.collection("workout_sessions").doc(session._id).update({
      data: {
        status: "completed",
        items: completedItems,
        duration_min: duration,
        calorie_burned: calories,
        exercise_record_id: exerciseId,
        completed_at: now,
        updated_at: now
      }
    });
    const checkinReference = transaction.collection("checkin_records").doc(checkinId);
    if (existingCheckin) await checkinReference.update({ data: checkin });
    else await checkinReference.set({ data: Object.assign({}, checkin, { created_at: now }) });
  });
  return ok({
    session: publicSession(Object.assign({}, session, { status: "completed", items: completedItems, duration_min: duration, calorie_burned: calories, exercise_record_id: exerciseId, completed_at: now })),
    exercise_record: publicExerciseRecord(Object.assign({ _id: exerciseId }, exercise)),
    repeated: false
  });
}

async function adminActionList(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event);
  const keyword = cleanText(event.keyword, 40);
  const actions = (await queryAll("exercise_actions", { deleted_at: null }))
    .filter((item) => !keyword || String(item.name || "").includes(keyword))
    .sort((left, right) => new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime());
  return ok({ items: actions.slice(params.skip, params.skip + params.pageSize).map((item) => Object.assign(publicAction(item), { status: item.status })), page: params.page, page_size: params.pageSize, has_more: actions.length > params.skip + params.pageSize });
}

async function adminActionDetail(event, openid) {
  await requireAdmin(openid);
  const action = await getDocument("exercise_actions", event.action_id);
  if (!action || action.deleted_at) throw businessError("NOT_FOUND", "动作不存在");
  return ok(Object.assign(publicAction(action), { status: action.status }));
}

async function adminSaveAction(event, openid) {
  const admin = await requireAdmin(openid);
  const validation = validateActionPayload(event.action);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  const now = new Date();
  const data = Object.assign({}, validation.data, { updated_by: admin._id, updated_at: now, deleted_at: null });
  const actionId = event.action && event.action._id;
  if (actionId) {
    const existing = await getDocument("exercise_actions", actionId);
    if (!existing || existing.deleted_at) throw businessError("NOT_FOUND", "动作不存在");
    await db.collection("exercise_actions").doc(actionId).update({ data });
    return ok(Object.assign({}, existing, data));
  }
  const result = await db.collection("exercise_actions").add({ data: Object.assign({}, data, { created_by: admin._id, created_at: now }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function adminUpdateActionStatus(event, openid) {
  await requireAdmin(openid);
  if (!event.action_id || !["active", "inactive"].includes(event.status)) throw businessError("VALIDATION_ERROR", "动作状态不正确");
  const action = await getDocument("exercise_actions", event.action_id);
  if (!action || action.deleted_at) throw businessError("NOT_FOUND", "动作不存在");
  await db.collection("exercise_actions").doc(action._id).update({ data: { status: event.status, updated_at: new Date() } });
  return ok({ action_id: action._id, status: event.status });
}

async function adminPlanList(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event);
  const keyword = cleanText(event.keyword, 40);
  const plans = (await queryAll("workout_plans", { deleted_at: null }))
    .filter((item) => !keyword || String(item.name || "").includes(keyword))
    .sort((left, right) => new Date(right.updated_at || 0).getTime() - new Date(left.updated_at || 0).getTime());
  return ok({ items: plans.slice(params.skip, params.skip + params.pageSize).map((item) => Object.assign(publicPlan(item, {}), { status: item.status })), page: params.page, page_size: params.pageSize, has_more: plans.length > params.skip + params.pageSize });
}

async function adminPlanDetail(event, openid) {
  await requireAdmin(openid);
  const plan = await getDocument("workout_plans", event.plan_id);
  if (!plan || plan.deleted_at) throw businessError("NOT_FOUND", "训练计划不存在");
  return ok(Object.assign(publicPlan(plan, {}, false), { actions: plan.actions || [], status: plan.status }));
}

async function adminActionOptions(event, openid) {
  await requireAdmin(openid);
  const params = pageParams(event, 20);
  const actions = (await queryAll("exercise_actions", { deleted_at: null })).sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "zh-CN"));
  return ok({
    items: actions.slice(params.skip, params.skip + params.pageSize).map((item) => ({ _id: item._id, name: item.name, category: item.category, status: item.status })),
    page: params.page,
    page_size: params.pageSize,
    has_more: actions.length > params.skip + params.pageSize
  });
}

async function validatePlanActionReferences(actions, requireActive) {
  for (let index = 0; index < actions.length; index += 1) {
    const action = await getDocument("exercise_actions", actions[index].action_id);
    if (!action || action.deleted_at || (requireActive && action.status !== "active")) {
      throw businessError("VALIDATION_ERROR", requireActive ? "上架计划只能使用已上架动作" : "计划包含不存在的动作");
    }
  }
}

async function adminSavePlan(event, openid) {
  const admin = await requireAdmin(openid);
  const validation = validatePlanPayload(event.plan);
  if (validation.error) throw businessError("VALIDATION_ERROR", validation.error);
  await validatePlanActionReferences(validation.data.actions, validation.data.status === "active");
  const now = new Date();
  const data = Object.assign({}, validation.data, {
    actions: validation.data.actions.map((item, index) => Object.assign({}, item, { sort_order: index + 1 })),
    updated_by: admin._id,
    updated_at: now,
    deleted_at: null
  });
  const planId = event.plan && event.plan._id;
  if (planId) {
    const existing = await getDocument("workout_plans", planId);
    if (!existing || existing.deleted_at) throw businessError("NOT_FOUND", "训练计划不存在");
    await db.collection("workout_plans").doc(planId).update({ data });
    return ok(Object.assign({}, existing, data));
  }
  const result = await db.collection("workout_plans").add({ data: Object.assign({}, data, { created_by: admin._id, created_at: now }) });
  return ok(Object.assign({ _id: result._id }, data));
}

async function adminUpdatePlanStatus(event, openid) {
  await requireAdmin(openid);
  if (!event.plan_id || !["active", "inactive"].includes(event.status)) throw businessError("VALIDATION_ERROR", "计划状态不正确");
  const plan = await getDocument("workout_plans", event.plan_id);
  if (!plan || plan.deleted_at) throw businessError("NOT_FOUND", "训练计划不存在");
  if (event.status === "active") await validatePlanActionReferences(plan.actions || [], true);
  await db.collection("workout_plans").doc(plan._id).update({ data: { status: event.status, updated_at: new Date() } });
  return ok({ plan_id: plan._id, status: event.status });
}

exports.main = async (event = {}) => {
  const openid = cloud.getWXContext().OPENID;
  const action = event.action || "filters";
  try {
    if (!openid) return fail("LOGIN_REQUIRED", "无法识别微信身份");
    if (action.startsWith("admin")) await requireAdmin(openid);
    else await requireUser(openid);
    await ensureCollections();
    await ensureDefaultContent();
    if (action === "filters") return await filters(openid);
    if (action === "actionList") return await actionList(event, openid);
    if (action === "actionDetail") return await actionDetail(event, openid);
    if (action === "planList") return await planList(event, openid);
    if (action === "planDetail") return await planDetail(event, openid);
    if (action === "selectPlan") return await selectPlan(event, openid);
    if (action === "currentPlan") return await currentPlan(openid);
    if (action === "todayWorkout") return await todayWorkout(openid);
    if (action === "saveWorkoutProgress") return await saveWorkoutProgress(event, openid);
    if (action === "completeWorkout") return await completeWorkout(event, openid);
    if (action === "adminActionList") return await adminActionList(event, openid);
    if (action === "adminActionDetail") return await adminActionDetail(event, openid);
    if (action === "adminSaveAction") return await adminSaveAction(event, openid);
    if (action === "adminUpdateActionStatus") return await adminUpdateActionStatus(event, openid);
    if (action === "adminPlanList") return await adminPlanList(event, openid);
    if (action === "adminPlanDetail") return await adminPlanDetail(event, openid);
    if (action === "adminActionOptions") return await adminActionOptions(event, openid);
    if (action === "adminSavePlan") return await adminSavePlan(event, openid);
    if (action === "adminUpdatePlanStatus") return await adminUpdatePlanStatus(event, openid);
    return fail("UNKNOWN_ACTION", "未知操作");
  } catch (error) {
    if (error.isBusinessError) return fail(error.code, error.message);
    console.error("workout function failed", error);
    return fail("INTERNAL_ERROR", "服务暂时不可用，请稍后重试");
  }
};

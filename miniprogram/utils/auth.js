const USER_KEY = "mvp_user";
const PROFILE_KEY = "mvp_health_profile";
const GOAL_KEY = "mvp_fitness_goal";

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function setUser(user) {
  wx.setStorageSync(USER_KEY, user);
}

function getProfile() {
  return wx.getStorageSync(PROFILE_KEY) || null;
}

function setProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile);
}

function getGoal() {
  return wx.getStorageSync(GOAL_KEY) || null;
}

function setGoal(goal) {
  wx.setStorageSync(GOAL_KEY, goal);
}

function clearSession() {
  wx.removeStorageSync(USER_KEY);
  wx.removeStorageSync(PROFILE_KEY);
  wx.removeStorageSync(GOAL_KEY);
}

function requireLogin() {
  const user = getUser();
  if (!user) {
    wx.navigateTo({
      url: "/pages/login/index"
    });
    return false;
  }
  return true;
}

module.exports = {
  getUser,
  setUser,
  getProfile,
  setProfile,
  getGoal,
  setGoal,
  clearSession,
  requireLogin
};

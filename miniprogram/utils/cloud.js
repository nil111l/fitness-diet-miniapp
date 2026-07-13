const { showLoading, hideLoading, showError } = require("./toast");

const CLOUD_PERMISSION_ERROR_CODE = -601034;
const FUNCTION_NOT_FOUND_CODE = -501000;

function normalizeCloudResponse(result) {
  if (!result) {
    return null;
  }

  if (result.success === false) {
    const error = new Error(result.message || "云函数调用失败");
    error.code = result.code;
    throw error;
  }

  return result.data === undefined ? result : result.data;
}

function normalizeCloudError(error, functionName) {
  const errMsg = String((error && error.errMsg) || "");
  const errCode = error && error.errCode;

  if (errCode === CLOUD_PERMISSION_ERROR_CODE || errMsg.indexOf(String(CLOUD_PERMISSION_ERROR_CODE)) >= 0) {
    error.message = "云开发未开通或当前环境无权限。请在微信开发者工具中开通云开发，并确认当前 AppID 已绑定云环境。";
    return error;
  }

  if (errCode === FUNCTION_NOT_FOUND_CODE || errMsg.indexOf("FUNCTION_NOT_FOUND") >= 0) {
    error.message = `云函数 ${functionName} 还没有部署。请在微信开发者工具的 cloudfunctions/${functionName} 目录右键，选择“上传并部署：云端安装依赖”。`;
    return error;
  }

  if (!error.message) {
    error.message = "云函数调用失败，请稍后重试";
  }

  return error;
}

async function callFunction(name, data = {}, options = {}) {
  const { loadingText = "加载中", showLoading: shouldShowLoading = true, silent = false } = options;

  try {
    const app = getApp();
    if (!app.globalData || !app.globalData.cloudReady) {
      throw new Error("当前基础库不支持云开发，请检查调试基础库版本");
    }

    if (shouldShowLoading) {
      showLoading(loadingText);
    }

    const response = await wx.cloud.callFunction({
      name,
      data
    });

    return normalizeCloudResponse(response.result);
  } catch (error) {
    normalizeCloudError(error, name);

    if (!silent) {
      showError(error);
    }
    throw error;
  } finally {
    if (shouldShowLoading) {
      hideLoading();
    }
  }
}

module.exports = {
  callFunction
};

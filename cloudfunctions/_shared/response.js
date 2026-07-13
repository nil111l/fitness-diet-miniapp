function ok(data = null) {
  return {
    success: true,
    data
  };
}

function fail(code = "INTERNAL_ERROR", message = "服务暂时不可用") {
  return {
    success: false,
    code,
    message
  };
}

module.exports = {
  ok,
  fail
};

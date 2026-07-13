function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getYesterday(date = new Date()) {
  const value = new Date(date);
  value.setDate(value.getDate() - 1);
  return formatDate(value);
}

module.exports = {
  formatDate,
  getYesterday
};

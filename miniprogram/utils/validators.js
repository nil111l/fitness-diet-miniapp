function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isPositiveNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
}

function inRange(value, min, max) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= min && numberValue <= max;
}

module.exports = {
  isRequired,
  isPositiveNumber,
  inRange
};

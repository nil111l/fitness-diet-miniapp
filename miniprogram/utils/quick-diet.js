function toSelectedFood(item) {
  return {
    _id: item.food_id || item._id,
    name: item.food_name || item.name,
    source: item.food_source || item.source,
    calorie_per_100g: Number(item.calorie_per_100g || 0),
    protein_per_100g: Number(item.protein_per_100g || 0),
    carb_per_100g: Number(item.carb_per_100g || 0),
    fat_per_100g: Number(item.fat_per_100g || 0)
  };
}

function startQuickDiet(item, mealType) {
  const food = toSelectedFood(item);
  wx.removeStorageSync("editing_diet_record");
  wx.setStorageSync("selected_food", food);
  wx.setStorageSync("selected_food_amount", Number(item.last_amount_g || item.default_amount_g || 100));
  const meal = mealType || item.last_meal_type || "breakfast";
  wx.navigateTo({ url: `/pages/diet/add/index?meal=${meal}&quick=1` });
}

module.exports = {
  toSelectedFood,
  startQuickDiet
};

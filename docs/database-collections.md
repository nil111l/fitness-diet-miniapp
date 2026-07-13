# 数据库集合与字段说明

所有业务集合建议包含：

- `_id`：云数据库自动生成。
- `created_at`：创建时间。
- `updated_at`：更新时间。
- `deleted_at`：软删除时间，正常数据为 `null`。

用户私有数据必须包含：

- `user_id`：系统内用户 ID。
- `openid`：云函数上下文中的微信用户标识。

## users

用户账号基础信息。

- `openid`
- `nick_name`
- `avatar_url`
- `gender`
- `status`：`active`、`disabled`、`cancelled`
- `last_login_at`
- `cancelled_at`

## health_profiles

健康档案。

- `user_id`
- `openid`
- `birthday`
- `birth_month`
- `age`
- `gender`
- `height_cm`
- `current_weight_kg`
- `target_weight_kg`
- `activity_level`
- `goal_type`
- `diet_preference`
- `allergies`
- `water_target_ml`

## fitness_goals

目标与推荐热量。

- `user_id`
- `openid`
- `goal_type`
- `target_weight_kg`
- `bmr`
- `tdee`
- `daily_calorie_target`
- `macro_targets.protein_g`
- `macro_targets.fat_g`
- `macro_targets.carb_g`
- `status`
- `start_date`

## food_categories

食材分类。

- `name`
- `sort_order`
- `status`：`active`、`inactive`、`deleted`

## foods

平台食材和用户自定义食物。

- `name`
- `category_id`
- `source`：`system`、`custom`
- `user_id`
- `openid`
- `calorie_per_100g`
- `protein_per_100g`
- `fat_per_100g`
- `carb_per_100g`
- `status`：`active`、`inactive`、`deleted`

## diet_records

饮食记录。

- `user_id`
- `openid`
- `food_id`
- `food_name`
- `meal_type`：`breakfast`、`lunch`、`dinner`、`snack`
- `amount_g`
- `calorie`
- `protein`
- `fat`
- `carb`
- `record_date`
- `food_source`
- `calorie_per_100g`
- `protein_per_100g`
- `carb_per_100g`
- `fat_per_100g`
- `note`

## exercise_records

运动记录。

- `user_id`
- `openid`
- `record_date`
- `exercise_type`
- `exercise_name`
- `duration_min`
- `intensity`
- `calorie_burned`
- `note`

## body_records

体重记录，同一用户同一天只保留一条有效记录。

- `user_id`
- `openid`
- `weight_kg`
- `body_fat_rate`
- `record_date`
- `note`

## checkin_records

每日打卡记录。

- `user_id`
- `openid`
- `checkin_date`
- `type`：`diet`、`exercise`、`weight`
- `items`

## feedbacks

意见反馈。

- `user_id`
- `openid`
- `feedback_type`
- `content`
- `images`
- `contact`
- `status`：`pending`、`processing`、`resolved`、`closed`
- `admin_reply`
- `processed_at`

## admin_users

管理员身份。

- `openid`
- `role`
- `status`
- `last_login_at`

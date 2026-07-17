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
- `recipe_id`：由食谱加入时记录来源食谱 ID，普通手工记录可为空。
- `recipe_name`
- `recipe_servings`

## recipe_categories

食谱筛选标签，由管理员维护。

- `name`
- `sort_order`
- `status`：`active`、`inactive`

## recipes

平台免费食谱。每份营养由后台绑定的已上架平台食材按克数计算，小程序端不提交营养结果。

- `name`
- `intro`
- `cover_url`：可选，仅支持 `https://` 或 `cloud://`
- `goals`：`lose_weight`、`gain_muscle`、`maintain`
- `meals`：`breakfast`、`lunch`、`dinner`、`snack`
- `tag_ids`
- `tags`：标签名称快照
- `ingredients`：平台食材 ID、名称、每份重量和每百克营养快照
- `steps`
- `prep_time_min`
- `difficulty`：`easy`、`medium`、`hard`
- `calorie`
- `protein`
- `carb`
- `fat`
- `base_servings`：第一版固定为 `1`
- `is_recommended`
- `status`：`active`、`inactive`
- `created_by`
- `updated_by`

一日饮食计划由 `recipe` 云函数按目标、热量区间和餐次即时匹配，不保存为用户私有集合。加入计划时会重新校验食谱和食材状态，并生成实际 `diet_records`。

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
- `source`：普通手工记录可为空，训练计划生成时为 `workout_plan`。
- `workout_plan_id`：由今日训练生成时记录来源计划。
- `workout_session_id`：由今日训练生成时记录来源会话。

## exercise_actions

平台动作库，公开读取和后台写入统一通过 `workout` 云函数。

- `name`
- `category`：`chest`、`back`、`shoulder`、`arms`、`core`、`glutes_legs`、`full_body`、`cardio`、`stretch`。
- `target_muscles`
- `secondary_muscles`
- `difficulty`：`easy`、`medium`、`hard`。
- `equipment`
- `steps`
- `common_errors`
- `precautions`
- `cover_url`
- `video_url`
- `status`：`active`、`inactive`。
- `created_by`
- `updated_by`

## workout_plans

平台免费训练计划。第一版将动作编排作为 `actions` 快照内嵌保存，不单独建立 `workout_plan_actions` 集合。

- `name`
- `intro`
- `cover_url`
- `plan_type`：`fat_loss`、`muscle_gain`、`shaping`、`beginner`、`home`、`gym`。
- `goal`
- `difficulty`：`easy`、`medium`、`hard`。
- `duration_weeks`
- `weekly_frequency`
- `session_duration_min`
- `actions`：`action_id`、`sets`、`reps`、`rest_sec`、`sort_order`。
- `status`：`active`、`inactive`。
- `created_by`
- `updated_by`

## user_workout_plans

用户当前训练计划，仅允许对应用户通过云函数读写。

- `user_id`
- `openid`
- `plan_id`
- `status`：`active`、`inactive`。
- `start_date`
- `selected_at`
- `ended_at`

## workout_sessions

用户每日执行训练计划的会话。

- `user_id`
- `openid`
- `plan_id`
- `selection_id`
- `workout_date`
- `status`：`draft`、`completed`。
- `plan_snapshot`：开始训练时的计划与动作快照，避免后台后续编辑影响当日训练。
- `items`：动作名称、计划组数/次数/休息、完成状态、实际次数和重量。
- `duration_min`
- `calorie_burned`
- `exercise_record_id`
- `completed_at`

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

连续打卡只统计当天正常记录或最晚在次日补记的数据；更早日期的补录仍可展示，但不回写历史连续天数。

## favorite_foods

用户常吃食物，仅允许对应用户通过云函数访问。

- `user_id`
- `openid`
- `food_id`
- `food_name`
- `food_source`
- `default_amount_g`
- `calorie_per_100g`
- `protein_per_100g`
- `carb_per_100g`
- `fat_per_100g`
- `last_used_at`

## diet_templates

用户饮食模板。应用模板时复制 `items` 生成新记录，不修改模板本身。

- `user_id`
- `openid`
- `name`
- `template_type`：`breakfast`、`lunch`、`dinner`、`snack`、`custom`
- `default_meal_type`
- `items`：食物 ID、名称、重量、餐次和备注快照
- `item_count`

## reminder_settings

用户订阅消息提醒设置，不存储营销标签或无关个人信息。

- `user_id`
- `openid`
- `reminder_type`：`breakfast`、`lunch`、`dinner`、`water`、`exercise`、`weight`
- `reminder_time`：`HH:mm`
- `enabled`
- `authorization_status`：`not_requested`、`accept`、`long_term`、`consumed`
- `template_id`
- `authorized_at`
- `last_sent_date`
- `last_sent_at`

## health_articles

健康文章。用户端只读取已上架且未删除的数据，维护操作仅允许管理员通过 `content` 云函数执行。

- `title`
- `summary`
- `category`：`diet`、`training`、`recording`、`faq`
- `cover_url`
- `content`：正文段落数组
- `status`：`active`、`inactive`
- `is_recommended`
- `sort_order`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at`

## food_corrections

用户对平台食材提交的纠错记录。记录提交时会保存食材快照，管理员确认修改后同时保留处理结果和修改后的快照。

- `user_id`
- `openid`
- `food_id`
- `food_name`
- `correction_type`：`name`、`calorie`、`protein`、`carb`、`fat`、`category`、`other`
- `description`
- `suggested_value`
- `food_snapshot`
- `status`：`pending`、`processing`、`resolved`、`rejected`
- `admin_note`
- `applied_food_update`
- `food_snapshot_after`
- `processed_by`
- `processed_at`
- `created_at`
- `updated_at`
- `deleted_at`

## Phase 9 实时统计说明

周总结、月总结、饮食洞察和目标进度不建立 `weekly_summaries`、`monthly_summaries` 或 `insight_rules` 持久化副本。`insights` 云函数每次按当前用户、日期范围，从 `diet_records`、`exercise_records`、`body_records`、`checkin_records` 和 `fitness_goals` 实时聚合，确保编辑或删除原始记录后结果立即一致。

## 权限建议

- `health_profiles`、`fitness_goals`、`diet_records`、`exercise_records`、`body_records`、`checkin_records`、`favorite_foods`、`diet_templates`、`reminder_settings`、`recipes`、`recipe_categories`、`exercise_actions`、`workout_plans`、`user_workout_plans`、`workout_sessions`、`health_articles`、`food_corrections`、`feedbacks`、`admin_users` 均关闭小程序端直接读写，仅由云函数访问。
- 云函数从微信上下文获取 `openid`，用户私有查询和写入必须附带该 `openid` 条件。
- `foods`、`food_categories` 的平台数据也优先通过 `food` 云函数读取，管理写操作仅允许 `admin` 云函数执行。
- `recipes`、`recipe_categories` 的公开读取和管理写入统一通过 `recipe` 云函数；管理动作必须校验 `admin_users`，公开动作只返回 `status=active` 且未删除的数据。
- `exercise_actions`、`workout_plans` 的用户端读取和管理写入统一通过 `workout` 云函数；管理动作必须校验 `admin_users`，用户端只返回已上架且未删除的完整内容。
- `health_articles`、`food_corrections` 统一通过 `content` 云函数访问；用户只能读取已上架文章和自己的纠错记录，后台操作必须校验 `admin_users`。

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

# Phase 0 Spec: 项目基础与数据模型

## 目标

把当前微信云开发 quickstart 项目整理成健身饮食小程序项目基础，为后续功能开发提供稳定目录、数据集合和公共工具。

## 必做功能

- 清理或隔离 quickstart 示例页面
- 建立小程序页面目录规划
- 建立云函数目录规划
- 建立基础云数据库集合
- 建立统一的请求封装
- 建立统一的错误提示方式
- 建立全局样式变量或基础样式

## 小程序端

需要准备：

- `pages/home/index`
- `pages/record/index`
- `pages/stats/index`
- `pages/me/index`
- `pages/login/index`

`app.json` 需要配置 4 个底部 Tab：

- 首页
- 记录
- 数据
- 我的

## 云数据库集合

第一版需要准备：

- `users`
- `health_profiles`
- `fitness_goals`
- `food_categories`
- `foods`
- `diet_records`
- `exercise_records`
- `body_records`
- `checkin_records`
- `feedbacks`
- `admin_users`

## 基础字段约定

所有业务集合尽量包含：

- `_id`
- `created_at`
- `updated_at`
- `deleted_at`，需要软删除时使用

用户私有数据必须包含：

- `user_id`
- `openid`

## 云函数规划

建议建立：

- `auth`
- `profile`
- `goal`
- `food`
- `diet`
- `exercise`
- `body`
- `stats`
- `checkin`
- `feedback`
- `admin`

## 验收标准

- 小程序可以正常启动
- 4 个底部 Tab 可正常切换
- quickstart 示例不再作为主要页面出现
- 云函数目录规划清晰
- 数据集合字段文档清晰
- 后续阶段可以直接在此基础上开发


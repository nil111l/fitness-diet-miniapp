# AGENTS.md

本文件是健身饮食微信小程序项目的协作总说明。所有后续开发、测试、评审、文档补充都应先阅读本文件，再根据当前阶段读取 `.agents/specs/` 下对应的阶段 spec，并按 `.agents/skills/` 中的技能流程推进。

## 1. 项目定位

本项目第一版是一个微信小程序 MVP，核心目标是让用户可以完成：

- 微信登录
- 填写健康档案
- 设置健身目标
- 查看首页热量仪表盘
- 搜索食材并记录饮食
- 添加自定义食物
- 记录运动
- 记录体重
- 查看简单数据趋势
- 完成基础打卡
- 通过基础后台维护食材、用户和反馈

第一版只做高频刚需闭环，不做会员、支付、AI、社区、教练咨询、课程、智能设备同步等扩展功能。

## 2. 当前技术基线

当前仓库是微信云开发小程序项目：

- 小程序根目录：`miniprogram/`
- 云函数目录：`cloudfunctions/`
- 项目配置：`project.config.json`
- 产品需求基准：`健身饮食微信小程序MVP开发版需求文档.md`

除非用户明确要求迁移技术栈，否则优先沿用微信小程序原生开发和微信云开发能力。

## 3. 协作推进方式

项目采用 `AGENTS.md + skills + specs` 的方式推进：

- `AGENTS.md`：项目总约束、范围、工程规则
- `.agents/skills/`：不同类型任务的执行方法
- `.agents/specs/`：每个阶段要完成的功能、数据、页面、验收标准

每次开始任务时：

1. 阅读本文件
2. 阅读相关 skill
3. 阅读当前阶段 spec
4. 只实现当前阶段范围
5. 完成后按 spec 的验收标准自查

## 4. 阶段划分

### Phase 0: 项目基础与数据模型

目标：清理 quickstart 示例，建立项目目录、云数据库集合、基础工具和全局样式。

Spec：`.agents/specs/00-foundation.spec.md`

### Phase 1: 登录、隐私协议、健康档案、目标

目标：完成用户进入小程序后的首次使用闭环。

Spec：`.agents/specs/01-login-profile-goal.spec.md`

### Phase 2: 食材库、饮食记录、首页仪表盘

目标：完成第一版最核心的饮食记录和热量反馈闭环。

Spec：`.agents/specs/02-food-diet-home.spec.md`

### Phase 3: 运动、体重、数据趋势、打卡

目标：补齐运动和身体反馈，让用户形成每日记录习惯。

Spec：`.agents/specs/03-exercise-weight-stats-checkin.spec.md`

### Phase 4: 我的页面、设置、反馈、基础后台

目标：完成用户管理入口和运营后台基础能力。

Spec：`.agents/specs/04-profile-settings-admin.spec.md`

### Phase 5: 联调、验收、发布准备

目标：按 MVP 验收标准完成测试、修复和交付文档。

Spec：`.agents/specs/05-acceptance-release.spec.md`

### Phase 6: 留存、提醒、记录效率

目标：上线后提升连续记录习惯和高频饮食记录效率。

Spec：`.agents/specs/06-retention-reminders-efficiency.spec.md`

### Phase 7: 食谱推荐与饮食计划

目标：提供免费食谱推荐和基于目标、热量区间的简单一日饮食计划。

Spec：`.agents/specs/07-recipes-meal-plans.spec.md`

## 5. 第一版禁止扩展范围

以下功能不要在 MVP 阶段实现，除非用户重新确认：

- 会员套餐
- 微信支付
- 订单系统
- 退款系统
- AI 拍照识别
- 扫码识别
- 社区动态
- 教练或营养师咨询
- 课程购买
- 周报、月报自动生成
- 健康报告导出
- 智能穿戴设备同步

如果开发中发现需要为未来扩展预留字段，可以保留轻量字段，但不要做完整业务闭环。

## 6. 工程规则

- 保持小程序端、云函数、数据模型职责清晰
- 小程序端不保存 AppSecret、session_key 等敏感信息
- 所有用户私有数据必须按 `user_id` 或 `openid` 做权限隔离
- 首页和统计页数据必须来自同一套记录数据，不能写死
- 删除、编辑记录后，首页和统计数据必须同步变化
- 所有列表接口需要分页
- 所有表单必须做前端校验和服务端校验
- 用户提交失败时，应尽量保留已输入内容
- 空状态需要给出下一步入口

## 7. 设计规则

- 第一版 UI 以实用、清晰、轻量为主
- 首页优先展示今日热量、已摄入、剩余、运动消耗
- 记录饮食流程不超过 3 步
- 常用入口放在首页和底部 Tab
- 图表第一版只做近 7 天简单趋势
- 不做营销型首页，不做复杂视觉装饰

## 8. 数据规则

第一版核心集合建议：

- `users`
- `health_profiles`
- `fitness_goals`
- `foods`
- `food_categories`
- `diet_records`
- `exercise_records`
- `body_records`
- `checkin_records`
- `feedbacks`
- `admin_users`

字段定义以 `.agents/specs/00-foundation.spec.md` 和 MVP 需求文档为准。

## 9. 验收规则

每个阶段完成后必须满足：

- 当前阶段 spec 中的页面可访问
- 当前阶段 spec 中的数据可创建、读取、更新或删除
- 核心业务规则可执行
- 失败状态、空状态、加载状态可见
- 不引入第一版禁止扩展功能
- 不破坏已完成阶段功能

## 10. 文档维护规则

如果实现过程中发现需求需要调整：

- 优先更新对应 `.agents/specs/*.spec.md`
- 涉及总范围变化时，再更新本 `AGENTS.md`
- 不要只改代码不改 spec

## 11. UI 规范

所有后续页面、组件和交互样式必须遵守 `.agents/specs/ui-style.spec.md`。

- 整体风格保持清爽、健康、专业，服务健身饮食记录工具，不做营销型视觉。
- 首页优先突出今日推荐热量、已摄入、剩余热量、运动消耗和三大营养素进度。
- 新页面优先复用 `miniprogram/app.wxss` 中的颜色、字体层级、卡片、按钮、表单、列表、空状态和加载状态基础类。
- 不引入大面积渐变、复杂装饰、装饰光斑、无意义插画或 MVP 外业务入口。

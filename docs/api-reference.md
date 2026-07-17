# 接口说明

所有接口均通过 `wx.cloud.callFunction` 调用。返回结构统一为：

```js
{ success: true, data }
{ success: false, code, message }
```

## auth

- `login`：微信登录，返回 `user`、`profile`、`goal`。禁用用户返回 `ACCOUNT_DISABLED`。
- `cancelAccount`：注销账号，需要 `confirm: true`，注销后用户状态为 `cancelled`，并软删除或匿名化私有数据。

## profile

- `get`：读取当前用户健康档案。
- `save`：保存健康档案。

## goal

- `get`：读取当前目标。
- `save`：保存目标并计算推荐热量与三大营养素目标。

## food

- `categories`：食材分类列表。
- `search`：搜索平台食材和自己的自定义食物，支持 `keyword`、`category_id`、分页。
- `createCustom`：新增自定义食物。
- `listCustom`：我的自定义食物列表。
- `get`：读取食物详情。

## diet

- `list`：按日期读取饮食记录。
- `upsert`：新增或编辑饮食记录，可通过 `add_to_favorites` 同时加入常吃。
- `remove`：删除饮食记录。
- `copyYesterday`：复制昨日饮食到今日。
- `favorites`、`setFavorite`：分页读取、添加或取消当前用户的常吃食物。
- `recentFoods`：读取最近 20 种不重复食物并带回最近一次重量。
- `quickOptions`：读取首页快捷记录候选。
- `saveTemplate`、`templates`、`removeTemplate`：保存、分页读取和删除饮食模板。
- `applyTemplate`：复制模板内容，生成指定日期与餐次的新饮食记录。

## exercise

- `list`：按日期读取运动记录。
- `save`：新增或编辑运动记录。
- `remove`：删除运动记录。

## body

- `get`：读取某天体重记录。
- `save`：新增或更新某天体重记录。

## stats

- `dashboard`：首页仪表盘数据。
- `trends`：近 7 天体重、热量摄入、运动消耗、营养素占比。
- `calendar`：读取指定月份三类打卡状态、当前连续天数和最长连续天数。

## reminder

- `get`：读取六类提醒设置、授权状态和订阅模板可用状态。
- `save`：保存单类提醒时间和开关；开启前必须已由用户主动授权。
- 定时触发：云函数每分钟检查到期提醒，同一类型同一天最多发送一次；一次性订阅发送后自动关闭。

## feedback

- `submit`：提交意见反馈，支持类型、内容、图片附件和联系方式。

## admin

所有管理接口都会校验 `admin_users` 中当前 openid 是否为有效管理员。

- `login`：管理员登录。首次环境中 `admin_users` 为空时，会把当前 openid 初始化为超级管理员。
- `overview`：数据概览。
- `listUsers`：用户列表与搜索。
- `updateUserStatus`：禁用或恢复用户。
- `listCategories`、`saveCategory`、`deleteCategory`：食材分类管理。
- `listFoods`、`saveFood`、`updateFoodStatus`、`deleteFood`：食材管理。
- `listFeedbacks`、`updateFeedback`：反馈处理。

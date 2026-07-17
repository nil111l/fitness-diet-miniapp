# 部署说明

## 云开发环境

1. 使用微信开发者工具打开项目根目录。
2. 进入“云开发”，为当前 AppID 创建或选择云环境。
3. 确认 `project.private.config.json` 中存在：

```json
{
  "cloudfunctionRoot": "cloudfunctions/"
}
```

4. 如果开发者工具没有自动绑定默认云环境，可在 `miniprogram/app.js` 的 `globalData.env` 填入环境 ID。

## 需要部署的云函数

按以下顺序右键目录，选择“上传并部署：云端安装依赖”：

- `auth`
- `profile`
- `goal`
- `food`
- `diet`
- `stats`
- `exercise`
- `body`
- `feedback`
- `reminder`
- `recipe`
- `admin`

也可以使用项目根目录的脚本：

```powershell
.\uploadCloudFunction.ps1 -InstallPath "微信开发者工具 cli 路径" -EnvId "云环境 ID"
```

## Windows 依赖安装

如果 PowerShell 执行 `npm install` 提示脚本策略限制，请进入对应云函数目录后使用：

```powershell
npm.cmd install
```

## Phase 6 提醒配置

1. 在微信公众平台申请与早餐、午餐、晚餐、喝水、运动、体重记录相符的订阅消息模板。
2. 在云函数 `reminder` 的环境变量中配置 `REMINDER_TEMPLATE_CONFIG`。示例：

```json
{
  "breakfast": {
    "template_id": "模板ID",
    "long_term": false,
    "page": "pages/home/index",
    "data": {
      "thing1": "早餐记录提醒",
      "time2": "{{time}}"
    }
  }
}
```

3. 字段名必须与所选订阅模板完全一致；其余五类按相同结构配置。`long_term` 仅在平台实际授予长期订阅能力时设为 `true`。
4. 上传 `reminder` 云函数时保留 `config.json` 中每分钟执行的 `reminder-dispatch` 定时触发器，并确认云函数具有订阅消息发送权限。
5. 未配置模板时，小程序会显示“订阅消息模板尚未配置”，不会伪装成已开启。

新增集合 `favorite_foods`、`diet_templates`、`reminder_settings` 可由云函数首次运行时创建；建议在云开发控制台将客户端权限设置为不可直接读写。

## Phase 7 食谱配置

1. 上传并部署 `recipe` 云函数，选择“云端安装依赖”。
2. 在云开发控制台确认 `recipes`、`recipe_categories` 已创建，并把小程序端权限设置为不可直接读写。
3. 先通过后台“食材管理”维护并上架平台食材，再进入“食谱管理”维护标签和食谱。
4. 食谱保存时云函数会按平台食材每百克营养和克数计算每份营养；食谱下架后公开列表、详情、加入餐次和饮食计划都会拒绝继续使用。
5. 首次读取食谱标签时会初始化“高蛋白、低脂、低碳”三个基础标签，管理员可继续新增或停用。

## 常见问题

- `FUNCTION_NOT_FOUND`：对应云函数尚未部署，重新上传并部署。
- `DATABASE_COLLECTION_NOT_EXIST`：首次运行会自动创建集合；如权限不足，先在云开发控制台手动创建集合。
- 云函数 `CreateFailed`：在云开发控制台删除失败状态的函数，再重新“上传并部署：云端安装依赖”。
- 上传依赖后仍旧报旧代码：清除微信开发者工具缓存并重新编译。

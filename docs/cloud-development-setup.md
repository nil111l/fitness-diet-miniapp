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

## 常见问题

- `FUNCTION_NOT_FOUND`：对应云函数尚未部署，重新上传并部署。
- `DATABASE_COLLECTION_NOT_EXIST`：首次运行会自动创建集合；如权限不足，先在云开发控制台手动创建集合。
- 云函数 `CreateFailed`：在云开发控制台删除失败状态的函数，再重新“上传并部署：云端安装依赖”。
- 上传依赖后仍旧报旧代码：清除微信开发者工具缓存并重新编译。

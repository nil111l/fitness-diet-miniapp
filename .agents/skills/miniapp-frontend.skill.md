# Skill: Miniapp Frontend

用于推进微信小程序端页面、组件、交互和状态管理。

## 使用场景

- 开发小程序页面
- 调整 `miniprogram/app.json`
- 编写 WXML、WXSS、JS
- 实现表单、列表、图表、空状态、加载状态

## 执行步骤

1. 读取当前阶段 spec 的页面清单
2. 确认页面路径和 Tab 结构
3. 先搭页面结构，再接数据
4. 表单同时做必填、范围、格式校验
5. 所有异步请求提供 loading、success、fail 状态
6. 新增、编辑、删除数据后刷新相关页面

## 页面约定

底部 Tab 第一版使用：

- `pages/home/index`
- `pages/record/index`
- `pages/stats/index`
- `pages/me/index`

建议功能页面：

- `pages/login/index`
- `pages/profile/edit`
- `pages/goal/edit`
- `pages/diet/add`
- `pages/diet/detail`
- `pages/food/search`
- `pages/food/custom`
- `pages/exercise/add`
- `pages/weight/index`
- `pages/feedback/index`
- `pages/settings/index`

## UI 要求

- 信息密度适中，优先让用户快速记录
- 首页核心数据一屏内可见
- 饮食记录流程不超过 3 步
- 不做复杂营销页
- 空状态必须提供行动入口


# 染心 · 微信小程序（三人 AI 协作版）

> 仓库类型：**Public**（演示/比赛用途，请勿提交 token、密钥、服务账号密码）。

## 项目简介
7 天比赛演示版 / MVP 快速交付。产品主线：MBTI → 轻游戏 → 纹样收集 → 个性化 DIY 创作。

## 快速启动
1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 导入本目录为小程序项目（如用测试号，`project.config.json` 中 `appid` 设为 `touristappid`；正式开发替换为你们的 AppID）。
3. 工具内编译预览。

## 团队 Owners（责任域，请勿越界）
| 角色 | 负责模块 | 验收标准 |
|---|---|---|
| A｜产品前端 | pages/index、pages/mbti、pages/works | 看得到、点得通、视觉一致 |
| B｜核心交互 | pages/game、pages/collection、pages/diy | 玩得了、做得出作品 |
| C｜后端与技术 | cloudfunctions、utils/api.js、数据库、登录/保存/发布、GitHub 合并与发布 | 数据不丢、接口稳定、最终能跑 |

## 分支模型
- `main`：稳定版（仅允许 PR 合并，禁止直接 push）
- `a` / `b` / `c`：A / B / C 各自的长期开发分支
- 流程：在自己的分支开发 → 开 PR 到 main → C（或仓库 Owner）review 后合并

详见 [ONBOARDING.md](./ONBOARDING.md) 与 [docs/ENGINEERING.md](./docs/ENGINEERING.md)。

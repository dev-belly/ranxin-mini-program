# 云函数（Owner: C｜后端与技术）

本目录为「染心」小程序的云端能力，**由 C 负责维护**，A/B 请勿修改。

## 接口清单（对应《研发规范 V1.0》附录 A）

| 云函数 | 对应接口 | 说明 |
| --- | --- | --- |
| `login` | 1/8 login | 登录，返回用户信息 |
| `getPatterns` | 2/8 getPatterns | 获取纹样列表 |
| `unlockPattern` | 3/8 unlockPattern | 解锁纹样 |
| `saveMbtiResult` | 4/8 saveMbtiResult | 保存情绪/MBTI 测试结果 |
| `saveDraft` | 5/8 saveDraft | 保存创作草稿 |
| `saveWork` | 6/8 saveWork | 保存/发布作品 |
| `getMyWorks` | 7/8 getMyWorks | 我的作品列表 |
| `submitGame` | 8/8 submitGame | 提交游戏成绩 |

## 本地 Mock 与真后端的切换

前端统一通过 `utils/api.js` 调用，由 `USE_MOCK` 控制：
- `USE_MOCK = true`（当前）：接口走 `wx` 本地存储兜底，**无需部署云函数即可跑通全流程**。
- `USE_MOCK = false`（C 接好后）：`utils/api.js` 改为 `wx.cloud.callFunction`，本目录的 8 个云函数即为真实实现。

## 部署

每个子目录是一个独立云函数，在微信开发者工具中右键「上传并部署」即可。
共享数据见 `shared/patterns.js`（与 `utils/api.js` 的 `MOCK_PATTERNS` 保持一致）。

## 数据库 Schema

见 `../docs/db-schema.md`。

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

`getPatterns` 每次按业务纹样 `id` 补齐缺失的种子记录，保留已经存在的记录和人工维护字段。
新种子使用保留的固定文档 `_id=seed-<纹样 id>`；并发首次加载写入同一文档，中途失败后重试可继续补齐。
初始化错误会向调用方返回失败，不再悄悄返回残缺目录。旧环境的随机文档 ID 继续可用；已经存在的重复记录不自动删除，需管理员核对后处理。
`shared/utils.js` 与三个云函数内的 `shared/utils.js` 必须一起更新；每个云函数独立上传，不能引用目录外的文件。

个人记录的 `_openid` 由云函数从 `cloud.getWXContext().OPENID` 获取并显式写入，
不接受客户端传入的所有者。管理端数据库写入不会自动补齐这个字段。
缺少微信身份时，作品查询返回空列表，个人写入被拒绝；纹样主数据仍可读取。
更新现有环境时需重新部署登录、保存、作品查询和游戏/解锁函数。
作品分页的 `page` 为正整数，`pageSize` 为 1—100 的整数，省略时分别为 1、10；
Mock 与云函数均拒绝字符串、负数、小数、零及溢出页码，避免存储切片与数据库分页口径不同。
旧记录若缺少所有者，不能仅凭标题或纹样自动认领，应由管理员核对来源后补齐。

## 数据库 Schema

见 `../docs/db-schema.md`。

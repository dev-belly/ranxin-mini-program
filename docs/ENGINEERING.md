# ENGINEERING.md（工程规则，源自《研发规范》）

## 人与 AI 的职责边界
- 人：决定做什么、优先级、验收标准；做边界与验收测试。
- AI（WorkBuddy / Codex）：代码生成、修改、检查、解释。
- 禁止：以「AI 说没问题」替代人工验收。

## 模块边界（严格）
- A 只改 pages/index、pages/mbti、pages/works。
- B 只改 pages/game、pages/collection、pages/diy；不直接访问云数据库。
- C 负责 cloudfunctions、数据库 Schema、utils/api.js、登录/保存/发布、GitHub 合并与发布。
- 涉及他人模块先说明，不要擅自重构。

## 分支与协作
- main（稳定）+ a/b/c 长期分支；各自只在自己分支开发。
- 完成可用功能后通过 PR 合并到 main；禁止直接在 main 上开发。
- 禁止三人通过微信互传代码压缩包作为主协作方式。

## 安全与隐私
- 仓库 Public：不要提交个人 token、密钥、服务账号密码；环境 ID 可配置化。
- 关键写操作需 openid 校验用户身份，尽量幂等。

## 提交前自检（让 AI 准备提交）
1. 修改摘要（≤5 条） 2. 风险 3. 是否建议合并（是/否）

# 试用与问题反馈 / Support

先按 [README](README.md) 导入微信开发者工具。当前 `utils/api.js` 默认使用本地 Mock；工具内交互、真实云函数与数据库仍须分别验收。

使用 Node.js 22 可运行 README 中的离线检查：

```bash
node --test tests/*.test.cjs
```

检查通过不代表微信交互、云端登录、保存或发布已完成验收。

在[项目 Issues](https://github.com/dev-belly/ranxin-mini-program/issues)提供 commit、开发者工具版本、页面或云函数、Mock / 云端模式、操作步骤和脱敏日志。游戏或 DIY 问题可附不含个人信息的输入与截图，云端问题使用虚构用户资料。

团队修改继续遵守 [ONBOARDING](ONBOARDING.md)、[工程约定](docs/ENGINEERING.md) 与现有 `CODEOWNERS`；按已有责任域和 PR 审核流程提交，不直接推送 main。凭据或安全问题先查看 [Security](SECURITY.md)。

State whether the issue occurs in Mock mode or a cloud integration. Preserve the existing team ownership and review process.

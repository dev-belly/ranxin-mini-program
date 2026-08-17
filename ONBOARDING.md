#  onboarding —— A / C 如何把代码上传到 GitHub

> 仓库为 **Public**，克隆和提交都不会暴露凭证；但**永远不要提交 token / 密钥 / 服务账号密码**。

## 前置
- 安装 Git：https://git-scm.com/downloads
- 登录方式二选一：
  - HTTPS：push 时用户名填 GitHub 账号，**密码栏填 Personal Access Token（PAT）**（不是账号密码）。
  - 或安装 GitHub CLI：`brew install gh` → `gh auth login`。
- 让仓库 Owner（B）在 GitHub → Settings → Collaborators 里邀请你，权限 **Write**。

## 上传步骤
```bash
# 1. 克隆
git clone https://github.com/<组织或账号>/ranxin-mini-program.git
cd ranxin-mini-program

# 2. 切到自己的分支（已在远端建好）
git fetch origin
git checkout a        # A 用 a；C 用 c（B 已在 b 上）

# 3. 把代码放进对应目录，不要动别人目录
#    A: pages/index, pages/mbti, pages/works
#    C: cloudfunctions/, utils/api.js, 数据库 / 登录 / 保存 / 发布
#    B: pages/game, pages/collection, pages/diy

# 4. 提交
git add .
git commit -m "feat: A 完成首页与 MBTI 页面"

# 5. 推送自己的分支
git push -u origin a        # C 推 c

# 6. GitHub 网页 → Pull requests → New PR（从 a/c 合到 main）
#    由 C 或 Owner review 通过后合并，不要自己直接合 main
```

## 每天开工
先 `git checkout main && git pull` 同步，再 `git checkout a`（或 c）继续。

## 接口约定
后端接口由 C 在 `utils/api.js` 统一封装；A/B 通过它访问数据，先用 Mock。字段变更必须通知 A/B。

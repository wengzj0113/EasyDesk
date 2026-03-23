# Git 助手

你是 Git 专家，帮助处理版本控制相关任务。

---

## 1. 提交规范 (Conventional Commits)

### 1.1 提交信息格式

```
<类型>(<范围>): <简短描述>

<详细描述（可选）>

<脚注（可选）>
```

### 1.2 类型 (Type)

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat: 添加用户登录功能` |
| fix | 修复 bug | `fix: 修复登录页面样式错位` |
| docs | 文档更新 | `docs: 更新 README` |
| style | 代码格式 | `style: 格式化代码` |
| refactor | 重构 | `refactor: 简化认证逻辑` |
| perf | 性能优化 | `perf: 优化数据库查询` |
| test | 测试 | `test: 添加单元测试` |
| chore | 构建/工具 | `chore: 升级依赖` |
| build | 构建系统 | `build: 配置 Docker` |
| ci | CI/CD | `ci: 配置 GitHub Actions` |
| revert | 回退 | `revert: 回退上次提交` |

### 1.3 范围 (Scope)

使用项目或模块名作为范围：

```
feat(auth): 添加 OAuth 登录
fix(api): 修复用户列表接口超时
refactor(db): 优化连接池管理
```

### 1.4 提交示例

```bash
# 简单提交
git commit -m "fix: 修复设备注册安全漏洞"

# 详细提交
git commit -m "feat(auth): 添加 WebSocket JWT 认证

- 实现 request-auth 接口验证设备所有权
- 添加临时 token 机制防止认证泄漏
- 修复设备被其他用户覆盖注册的漏洞

Closes #123"

# 多文件提交
git add src/services/socketService.js src/models/User.js src/routes/vip.js
git commit -m "fix: 修复高优先级安全问题

- WebSocket 连接添加 JWT 认证
- 支付回调添加幂等性检查
- 修复设备注册安全漏洞
"
```

---

## 2. 分支管理

### 2.1 分支命名规范

```
<类型>/<描述>
<类型>/<编号>-<描述>
```

示例：
```bash
feat/user-authentication
fix/123-login-timeout
refactor/payment-module
hotfix/security-vulnerability
release/v1.2.0
```

### 2.2 常用分支操作

```bash
# 创建并切换
git checkout -b feat/new-feature

# 切换分支
git checkout main

# 删除分支
git branch -d feat/old-feature

# 重命名分支
git branch -m old-name new-name

# 列出所有分支
git branch -a

# 查看分支追踪关系
git branch -vv
```

---

## 3. 冲突解决

### 3.1 解决流程

1. **理解冲突**：查看冲突标记 `<<<<<<<`, `=======`, `>>>>>>>`
2. **分析原因**：与相关人员沟通确认预期行为
3. **选择方案**：
   - 保留当前修改 (`git checkout --ours`)
   - 保留传入修改 (`git checkout --theirs`)
   - 手动合并
4. **测试验证**：确保合并后代码功能正常
5. **提交解决**：添加文件后提交

### 3.2 解决命令

```bash
# 进入冲突文件后
git add <resolved-file>

# 标记所有冲突已解决
git add .

# 继续变基/合并
git rebase --continue
git merge --continue

# 放弃变基
git rebase --abort

# 中止合并
git merge --abort
```

### 3.3 常见冲突场景

| 场景 | 推荐策略 |
|------|----------|
| 同一文件不同行修改 | 自动合并 |
| 同一文件同一行修改 | 手动解决 |
| 删除 vs 修改 | 根据业务决定 |
| 功能分支合并 | 优先保留新功能 |

---

## 4. 常用命令参考

### 4.1 基本操作

```bash
# 查看状态
git status
git status -s  # 简洁格式

# 查看差异
git diff
git diff --staged  # 暂存区
git diff HEAD~1    # 与上次提交对比

# 暂存文件
git add file.js
git add .          # 当前目录
git add -A         # 所有文件
git add -p         # 交互式暂存

# 提交
git commit -m "message"
git commit -am "message"  # 暂存并提交已跟踪文件

# 查看历史
git log
git log --oneline
git log --graph --oneline --all
git log -n 5 --author="name"
```

### 4.2 远程操作

```bash
# 克隆
git clone url
git clone --depth 1 url  # 浅克隆

# 拉取
git pull
git pull --rebase        # 变基拉取

# 推送
git push
git push -u origin branch  # 首次推送
git push --force-with-lease  # 安全强制推送

# 远程管理
git remote -v
git remote add origin url
git remote remove origin
```

### 4.3 撤销操作

```bash
# 撤销工作区修改
git checkout -- file
git restore file

# 撤销暂存
git reset HEAD file
git restore --staged file

# 撤销提交（保留修改）
git reset --soft HEAD~1
git reset --mixed HEAD~1  # 默认

# 撤销提交（丢弃修改）
git reset --hard HEAD~1

# 回退到指定版本
git revert <commit-hash>

# 暂存工作区
git stash
git stash pop
git stash list
git stash drop
```

---

## 5. 代码审查流程

### 5.1 创建 Pull Request

```bash
# 1. 确保分支是最新的
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feat/feature-name

# 3. 提交代码
git add .
git commit -m "feat: 描述"

# 4. 推送
git push -u origin feat/feature-name

# 5. 使用 gh 创建 PR
gh pr create --title "feat: 新功能" --body "$(cat <<'EOF'
## 功能描述
描述新功能

## 变更内容
- 变更1
- 变更2

## 测试计划
- [ ] 测试功能A
- [ ] 测试功能B

🤖 Generated with Claude Code
EOF
)"
```

### 5.2 PR 模板

```markdown
## Summary
简要描述变更

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Refactor
- [ ] Documentation

## Test Plan
- [ ] 已本地测试
- [ ] 已添加单元测试

## Screenshots (if applicable)
截图
```

---

## 6. 标签管理

```bash
# 创建标签
git tag v1.0.0
git tag -a v1.0.0 -m "版本说明"

# 推送标签
git push origin v1.0.0
git push origin --tags

# 查看标签
git tag
git tag -l "v1.*"

# 删除标签
git tag -d v1.0.0
git push origin --delete v1.0.0

# 查看标签详情
git show v1.0.0
```

---

## 7. 常见场景

### 7.1 场景：提交后发现漏了文件

```bash
git add forgotten-file.js
git commit --amend --no-edit
```

### 7.2 场景：修改最后一次提交信息

```bash
git commit --amend -m "新的提交信息"
```

### 7.3 场景：暂存当前修改，处理紧急任务

```bash
git stash
# ... 处理紧急任务
git stash pop
```

### 7.4 场景：更新远程仓库的 fork

```bash
git remote add upstream original-repo-url
git fetch upstream
git merge upstream/main
```

### 7.5 场景：查看谁修改了某行代码

```bash
git blame file.js
git log -p -S "搜索内容" -- file.js
```

### 7.6 场景：清理本地无效分支

```bash
git fetch --prune
git branch -vv  # 查看已删除远程的本地分支
git remote prune origin
```

---

## 8. 安全操作规范

### 8.1 禁止操作

- ❌ 禁止强制推送到 main/master
- ❌ 禁止在没有备份的情况下执行 `git reset --hard`
- ❌ 禁止提交敏感信息（密钥、密码、Token）
- ❌ 禁止使用 `--no-verify` 跳过 hooks

### 8.2 安全推送

```bash
# 使用 --force-with-lease 替代 --force
git push --force-with-lease origin branch
```

### 8.3 敏感信息处理

已提交敏感信息时：

```bash
# 1. 从历史中移除
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# 2. 或使用 BFG
bfg --delete-files .env

# 3. 通知团队轮换凭据
```

---

## 9. 工作流程建议

### 9.1 Feature Branch Workflow

```
main ─────────────────────────────────────
        │        │
        │    feat/xxx
        │    ↗────┘
        │    │    │
        │    │  merge (PR)
        │    │    │
        ▼    ▼    ▼
      main ◄────┘
```

### 9.2 操作原则

1. **频繁提交**：小步提交，便于追踪和回退
2. **清晰信息**：提交信息描述"为什么"而非"做了什么"
3. **及时推送**：每天结束前推送代码
4. **代码审查**：所有变更通过 PR 审查合并
5. **保持同步**：合并前先 rebase main

---

## 10. 注意事项

1. 提交前先 `git status` 确认变更
2. 提交前先 `git diff --staged` 确认暂存内容
3. 使用 `git log --oneline` 保持提交历史整洁
4. 合并前确保本地测试通过
5. 推送前确保远端没有冲突
6. 谨慎使用强制推送，优先使用变基

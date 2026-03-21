# EasyDesk 发布专家

## 角色

你是 EasyDesk 项目发布专家，负责自动化完成版本发布流程。

## 触发条件

当用户请求以下操作时自动触发：
- 使用 `/publish` 命令
- 请求发布新版本
- 请求创建 Release
- 请求构建安装包

## 发布流程

### 1. 版本号检查

自动检查：
- 读取 `frontend/package.json` 中的 version
- 搜索代码中硬编码的版本号（如 v1.0.0）
- 确保版本号一致

### 2. 代码提交

执行：
```bash
git status
git diff
git add <files>
git commit -m "<message>"
git push
```

### 3. 构建安装包

```bash
cd frontend
npm run build
npm run electron:build
```

### 4. Git Tag

```bash
git tag -a v<version> -m "EasyDesk v<version} 发布"
git push origin v<version>
```

### 5. GitHub Release

```bash
gh release create v<version> --title "EasyDesk v<version}" --generate-notes
gh release upload v<version} "release/EasyDesk Setup <version}.exe"
```

## 版本号规则

- 补丁版本: v1.0.0 → v1.0.1 (Bug 修复)
- 次版本: v1.0.0 → v1.1.0 (新功能)
- 主版本: v1.0.0 → v2.0.0 (重大变更)

## 前置条件

确保以下条件满足：
1. GitHub CLI 已登录 (`gh auth status`)
2. Node.js 和 npm 已安装
3. 代码无语法错误

## 执行模式

当用户触发此技能时：
1. 检查版本号是否需要更新
2. 如果需要更新版本号，先修改再构建
3. 执行完整发布流程
4. 返回发布结果

## 输出格式

```
## 发布完成

**版本**: vX.X.X
**Release**: [链接]
**下载**: [安装包名称]

✅ 代码已提交
✅ 已推送
✅ Release 已创建
✅ 安装包已上传
```

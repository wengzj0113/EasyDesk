# EasyDesk 发布技能

## 技能说明

自动完成 EasyDesk 项目发布到 GitHub 的完整流程，包括：
1. 提交源代码更改
2. 创建并推送 Git tag
3. 构建 Electron 安装包
4. 上传到 GitHub Release

## 使用方法

当用户请求发布新版本时，使用此技能。

## 前置条件

1. GitHub CLI 已登录 (`gh auth login`)
2. Git LFS 已初始化 (`git lfs install`)
3. 所有代码更改已保存

## 发布流程

### 1. 检查状态

```bash
git status
git remote -v
gh auth status
```

### 2. 提交源代码

如果有待提交的更改：
```bash
git add -A
git commit -m "feat: 发布 v{version}"
```

### 3. 创建 Tag

```bash
git tag -a v{version} -m "EasyDesk v{version} 发布"
git push origin v{version}
```

### 4. 创建 Release

```bash
gh release create v{version} --title "EasyDesk v{version}" --generate-notes
```

### 5. 构建安装包

```bash
cd frontend
npm run electron:build
```

### 6. 上传安装包

```bash
cd frontend
gh release upload v{version} "release/EasyDesk Setup {version}.exe"
```

## 版本号规则

- 补丁版本: v1.0.0 -> v1.0.1 (Bug 修复)
- 次版本: v1.0.0 -> v1.1.0 (新功能)
- 主版本: v1.0.0 -> v2.0.0 (重大变更)

## 注意事项

- 首次发布需要配置 Git LFS 处理大文件
- 确保 GitHub CLI 已登录
- 构建前检查代码无语法错误

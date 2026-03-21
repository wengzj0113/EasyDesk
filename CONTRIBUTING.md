# 贡献指南

感谢你对 EasyDesk 项目的兴趣！我们欢迎任何形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 完善文档
- 💻 提交代码
- 🌐 翻译文档
- 📢 推广项目

## 开发环境设置

### 前置要求

- Node.js 18+
- MongoDB 4.4+
- Redis 6.0+

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/wengzj0113/EasyDesk.git
cd EasyDesk

# 2. 启动后端
cd backend
cp .env.example .env
# 编辑 .env 文件，配置数据库连接
npm install
npm run dev

# 3. 启动前端 (新终端)
cd frontend
npm install
npm start
```

### Docker 开发

```bash
# 使用 Docker Compose 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 代码规范

### Git 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型 (type):
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat(auth): 添加邮箱登录功能

- 支持邮箱+密码登录
- 添加忘记密码功能

Closes #123
```

### 代码风格

- 使用 ESLint + Prettier
- TypeScript 启用严格模式
- 组件使用函数式组件 + Hooks

## Pull Request 流程

1. **创建分支**: 从 `main` 创建功能分支
2. **开发**: 在本地完成开发并测试
3. **提交**: 遵循 commit 规范
4. **推送**: 推送到你的 Fork
5. **PR**: 创建 Pull Request
6. **Review**: 等待代码 review
7. **合并**: Review 通过后合并

## 项目结构

```
EasyDesk/
├── backend/              # Node.js 后端
│   ├── src/
│   │   ├── config/     # 配置文件
│   │   ├── middleware/ # 中间件
│   │   ├── models/     # 数据模型
│   │   ├── routes/    # 路由
│   │   └── services/  # 服务
│   └── package.json
├── frontend/           # React 前端
│   ├── src/
│   │   ├── components/ # 组件
│   │   ├── pages/     # 页面
│   │   ├── services/  # API 服务
│   │   └── store/     # 状态管理
│   ├── electron/       # Electron 桌面端
│   └── package.json
├── docs/              # 文档
└── scripts/           # 脚本
```

## 文档翻译

欢迎翻译文档到其他语言！

1. 复制 `README.md` 为 `README_XX.md`
2. 翻译内容
3. 在主 README 中添加语言链接

## 问题反馈

请使用 [GitHub Issues](https://github.com/wengzj0113/EasyDesk/issues) 报告问题。

报告时请包含：
- 清晰的标题和描述
- 复现步骤
- 预期 vs 实际行为
- 截图（如适用）
- 环境信息

## 行为准则

请阅读并遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。

---

感谢你的贡献！ 🎉

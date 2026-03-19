# EasyDesk - 极简远程桌面应用

EasyDesk 是一款专注流畅、极简易用的远程控制工具，专为个人远程办公设计。

## 项目简介

- **产品定位**：打开即用的远程桌面工具，支持免登录快速连接
- **核心价值**：零门槛、极简易用、流畅稳定、安全可控
- **技术架构**：前后端分离 + WebSocket实时通信 + WebRTC点对点连接

## 功能特性

### 核心功能
- ✅ **免登录连接**：6位设备码+密码，直接远程连接
- ✅ **设备管理**：登录后绑定自己的设备，一键直连
- ✅ **实时控制**：流畅的远程桌面操作体验
- ✅ **文件传输**：安全的文件传输功能
- ✅ **VIP服务**：专属线路、超清画质、不限速传输

### 安全特性
- 🔒 端到端加密传输
- 🔒 连接实时提示，用户完全控制
- 🔒 多重身份验证
- 🔒 异常连接监控

## 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **UI组件**：Ant Design
- **状态管理**：Zustand
- **路由**：React Router v6
- **实时通信**：Socket.io Client
- **远程桌面**：WebRTC

### 后端
- **框架**：Node.js + Express
- **数据库**：MongoDB + Mongoose
- **缓存**：Redis
- **实时通信**：Socket.io
- **认证**：JWT
- **安全**：Helmet + Rate Limiting

## 项目结构

```
EasyDesk/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── controllers/    # 控制器
│   │   ├── middleware/     # 中间件
│   │   ├── models/         # 数据模型
│   │   ├── routes/         # 路由定义
│   │   ├── services/       # 业务服务
│   │   └── utils/          # 工具函数
│   ├── tests/              # 测试文件
│   ├── package.json
│   └── .env
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── components/     # 通用组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API服务
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   └── styles/         # 样式文件
│   ├── public/             # 静态资源
│   ├── package.json
│   └── .env
├── docs/                    # 项目文档
│   ├── api/                # API接口文档
│   ├── database/           # 数据库设计
│   └── design/             # 设计文档
├── database/               # 数据库脚本
└── scripts/                # 部署脚本
```

## 快速开始

### 环境要求

- Node.js >= 16.0.0
- MongoDB >= 4.4
- Redis >= 6.0
- npm >= 8.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/EasyDesk.git
cd EasyDesk
```

2. **安装后端依赖**
```bash
cd backend
npm install
```

3. **配置后端环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息
```

4. **启动后端服务**
```bash
npm run dev
```

5. **安装前端依赖**
```bash
cd ../frontend
npm install
```

6. **配置前端环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置API地址
```

7. **启动前端服务**
```bash
npm start
```

### 访问应用

- 前端地址：http://localhost:3000
- 后端API：http://localhost:3001
- API文档：http://localhost:3001/api-docs

## 开发指南

### 后端开发

#### 启动开发服务器
```bash
cd backend
npm run dev  # 使用nodemon自动重启
```

#### 运行测试
```bash
npm test
```

#### 数据库迁移
```bash
npm run migrate
```

### 前端开发

#### 启动开发服务器
```bash
cd frontend
npm start
```

#### 构建生产版本
```bash
npm run build
```

#### 代码检查
```bash
npm run lint
```

## API文档

详细的API接口文档请参考：[docs/api/README.md](docs/api/README.md)

主要接口包括：
- 用户认证（注册、登录、登出）
- 设备管理（获取设备码、绑定/解绑设备）
- 远程连接（建立连接、断开连接、连接状态）
- VIP服务（VIP状态、支付订单）

## 数据库设计

数据库设计文档请参考：[docs/database/schema.md](docs/database/schema.md)

主要数据表：
- users（用户表）
- devices（设备表）
- connections（连接记录表）

## 部署说明

### 后端部署

1. **构建Docker镜像**
```bash
cd backend
docker build -t easydesk-backend .
```

2. **运行容器**
```bash
docker run -p 3001:3001 easydesk-backend
```

### 前端部署

1. **构建生产版本**
```bash
cd frontend
npm run build
```

2. **部署到Nginx**
```bash
# 将 build/ 目录内容复制到 Nginx 静态文件目录
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 联系方式

- 项目主页：https://github.com/yourusername/EasyDesk
- 问题反馈：https://github.com/yourusername/EasyDesk/issues
- 邮箱：support@easydesk.com

## 致谢

感谢所有为这个项目做出贡献的开发者。

---

**EasyDesk - 简单远控，高效办公**

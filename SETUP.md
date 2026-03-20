# EasyDesk 环境搭建指南

## 方案一：手动安装MongoDB和Redis（推荐）

### 1. 安装MongoDB

**Windows系统：**
1. 下载MongoDB Community Server: https://www.mongodb.com/try/download/community
2. 选择Windows版本，下载MSI安装包
3. 运行安装程序，选择"Complete"安装
4. 安装时勾选"Install MongoDB as a Service"
5. 默认端口：27017

**验证安装：**
```bash
mongod --version
```

**启动MongoDB服务：**
```bash
# Windows
net start MongoDB

# 或者直接运行
mongod
```

### 2. 安装Redis

**Windows系统：**
1. 下载Redis for Windows: https://github.com/microsoftarchive/redis/releases
2. 或者使用WSL2安装Linux版本的Redis
3. 解压到指定目录
4. 运行 `redis-server.exe`

**使用WSL2安装Redis（推荐）：**
```bash
# 在WSL2中运行
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

**验证安装：**
```bash
redis-cli ping
# 应该返回 PONG
```

## 方案二：使用Docker

### 1. 启动Docker Desktop

确保Docker Desktop已启动并正在运行。

### 2. 启动服务容器

```bash
# Windows
scripts\docker.bat start

# Linux/Mac
bash scripts/docker.sh start
```

或直接使用 docker-compose：

```bash
docker-compose up -d
```

### 3. 验证服务

```bash
# 检查MongoDB
docker exec easydesk-mongodb mongod --version

# 检查Redis
docker exec easydesk-redis redis-cli ping
```

## 安装项目依赖

### 后端依赖安装

```bash
cd backend
npm install
```

### 前端依赖安装

```bash
cd frontend
npm install
```

## 配置环境变量

### 后端配置

1. 复制环境变量模板：
```bash
cd backend
cp .env.example .env
```

2. 编辑 `.env` 文件，根据实际情况修改配置：
```env
PORT=3001
NODE_ENV=development

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/easydesk

# Redis配置
REDIS_URL=redis://localhost:6379

# JWT密钥（生产环境请修改）
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=7d

# CORS配置
CORS_ORIGIN=http://localhost:3000

# WebRTC配置
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302

# 文件上传配置
MAX_FILE_SIZE=104857600
```

### 前端配置

1. 复制环境变量模板：
```bash
cd frontend
cp .env.example .env
```

2. 编辑 `.env` 文件：
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001
REACT_APP_WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
```

## 启动服务

### 方式一：使用启动脚本

```bash
# Windows
scripts\dev.bat

# Linux/Mac
bash scripts/dev.sh
```

### 方式二：手动启动

#### 启动后端服务

```bash
cd backend
npm run dev
```

后端将在 http://localhost:3001 启动

### 启动前端服务（新终端）

```bash
cd frontend
npm start
```

前端将在 http://localhost:3000 启动

## 验证安装

### 检查后端API

访问：http://localhost:3001/health

应该返回：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### 检查前端页面

访问：http://localhost:3000

应该看到EasyDesk应用界面

## 常见问题

### MongoDB连接失败

**错误信息：** `MongoNetworkError: failed to connect to server`

**解决方案：**
1. 确保MongoDB服务正在运行
2. 检查端口27017是否被占用
3. 验证MONGODB_URI配置是否正确

### Redis连接失败

**错误信息：** `Redis connection to localhost:6379 failed`

**解决方案：**
1. 确保Redis服务正在运行
2. 检查端口6379是否被占用
3. 验证REDIS_URL配置是否正确

### 端口冲突

如果端口被占用，可以修改 `.env` 文件中的端口号。

### 依赖安装失败

清除npm缓存并重新安装：
```bash
npm cache clean --force
npm install
```

## 下一步

环境搭建完成后，你可以：

1. 查看API文档：`docs/api/README.md`
2. 查看数据库设计：`docs/database/schema.md`
3. 开始开发：参考项目README.md

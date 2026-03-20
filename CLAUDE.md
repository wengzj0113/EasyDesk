# EasyDesk 项目指南

## 项目概述

EasyDesk 是一个极简远程桌面应用，使用 React + Node.js + MongoDB + Redis 技术栈。

## 项目结构

```
EasyDesk/
├── backend/          # 后端服务 (Node.js + Express + Socket.io)
├── frontend/         # 前端应用 (React + TypeScript + Ant Design)
├── docs/            # 项目文档
├── database/        # 数据库脚本
└── scripts/         # 部署脚本
```

## 常用命令

### 后端
```bash
cd backend
npm run dev          # 启动开发服务器
npm start            # 启动生产服务器
```

### 前端
```bash
cd frontend
npm start            # 启动开发服务器
npm run build        # 构建生产版本
```

### Docker
```bash
docker-compose up -d     # 启动所有服务
docker-compose down     # 停止所有服务
```

## 调试功能

当用户需要调试 EasyDesk 应用时，可以使用以下诊断步骤：

### 1. 检查服务状态

**后端健康检查:**
```bash
curl http://localhost:3001/health
```

**检查进程:**
```bash
tasklist | findstr node
```

**检查端口占用:**
```bash
netstat -ano | findstr 3001
```

### 2. 检查数据库

**MongoDB 状态:**
```bash
docker ps | findstr mongo
```

**Redis 状态:**
```bash
docker ps | findstr redis
```

### 3. 常见问题

- **连接失败**: 检查 MongoDB 和 Redis 是否运行
- **API 错误**: 检查后端服务是否启动，端口 3001 是否被占用
- **前端问题**: 检查前端是否正常运行在端口 3000

### 4. 完整诊断流程

当用户请求调试时，按以下顺序执行：
1. 询问用户遇到的具体问题
2. 检查后端服务状态 (curl localhost:3001/health)
3. 检查数据库容器状态
4. 检查端口占用情况
5. 根据错误信息分析问题原因
6. 提供具体的解决方案

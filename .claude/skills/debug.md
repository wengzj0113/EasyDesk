# EasyDesk 调试技能

## 技能说明

这是一个专门用于调试 EasyDesk 远程桌面应用的技能。

## 使用方法

当用户使用 `/debug` 命令或请求调试帮助时，此技能将被激活。

## 调试能力

### 1. 后端调试
- 检查 MongoDB 连接状态
- 检查 Redis 连接状态
- 检查 API 端点是否正常
- 检查 Socket.io 连接
- 查看服务器日志

### 2. 前端调试
- 检查 React 组件渲染
- 检查 API 请求/响应
- 检查 WebRTC 连接状态
- 检查 Socket.io 客户端连接

### 3. 常见问题诊断
- 连接失败问题
- 认证问题
- 数据库连接问题
- WebSocket 连接问题

## 调试命令

### 后端健康检查
```bash
curl http://localhost:3001/health
```

### 检查进程
```bash
tasklist | findstr node
```

### 检查端口占用
```bash
netstat -ano | findstr 3001
```

### 查看 MongoDB 状态
```bash
docker ps | findstr mongo
```

### 查看 Redis 状态
```bash
docker ps | findstr redis
```

## 自动诊断流程

1. 首先检查服务是否运行
2. 检查数据库连接
3. 检查 API 端点
4. 检查 WebSocket 连接
5. 分析错误日志

## 注意事项

- 调试前确认用户遇到的具体问题
- 提供具体的错误信息给用户
- 给出可执行的解决方案

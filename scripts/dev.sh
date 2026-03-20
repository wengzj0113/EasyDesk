#!/bin/bash

# EasyDesk 开发环境启动脚本

echo "========================================"
echo "  EasyDesk 开发环境启动"
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

# 检查 MongoDB
echo "检查 MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "警告: 未找到 MongoDB，请确保 MongoDB 已运行"
fi

# 检查 Redis
echo "检查 Redis..."
if ! command -v redis-server &> /dev/null; then
    echo "警告: 未找到 Redis，请确保 Redis 已运行"
fi

# 安装后端依赖
echo ""
echo "安装后端依赖..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "后端依赖已安装"
fi
cd ..

# 安装前端依赖
echo ""
echo "安装前端依赖..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "前端依赖已安装"
fi
cd ..

# 启动后端服务
echo ""
echo "启动后端服务 (端口 3001)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端服务
echo ""
echo "启动前端服务 (端口 3000)..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "  服务启动完成!"
echo "========================================"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止服务"

# 捕获 Ctrl+C 停止所有服务
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# 等待
wait

#!/bin/bash

# EasyDesk Docker 部署脚本

echo "========================================"
echo "  EasyDesk Docker 部署"
echo "========================================"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "错误: 未找到 Docker，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "错误: 未找到 Docker Compose，请先安装"
    exit 1
fi

# 解析命令
COMMAND=${1:-start}

case $COMMAND in
    start)
        echo "启动所有服务..."
        docker-compose up -d
        echo ""
        echo "服务启动中..."
        sleep 5
        echo ""
        echo "========================================"
        echo "  服务启动完成!"
        echo "========================================"
        echo "  前端: http://localhost:3000"
        echo "  后端: http://localhost:3001"
        echo "  MongoDB: localhost:27017"
        echo "  Redis: localhost:6379"
        echo "========================================"
        ;;
    stop)
        echo "停止所有服务..."
        docker-compose down
        ;;
    restart)
        echo "重启所有服务..."
        docker-compose restart
        ;;
    logs)
        echo "查看日志..."
        docker-compose logs -f
        ;;
    build)
        echo "构建镜像..."
        docker-compose build
        ;;
    *)
        echo "用法: $0 {start|stop|restart|logs|build}"
        echo ""
        echo "  start   - 启动所有服务"
        echo "  stop    - 停止所有服务"
        echo "  restart - 重启所有服务"
        echo "  logs    - 查看日志"
        echo "  build   - 构建镜像"
        exit 1
        ;;
esac

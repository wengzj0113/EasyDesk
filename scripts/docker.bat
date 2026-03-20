@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   EasyDesk Docker 部署
echo ========================================

REM 检查 Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到 Docker，请先安装 Docker
    pause
    exit /b 1
)

REM 解析命令
set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=start

if "%COMMAND%"=="start" (
    echo 启动所有服务...
    docker-compose up -d
    echo.
    echo 服务启动中...
    timeout /t 5 /nobreak >nul
    echo.
    echo ========================================
    echo   服务启动完成
    echo ========================================
    echo   前端: http://localhost:3000
    echo   后端: http://localhost:3001
    echo   MongoDB: localhost:27017
    echo   Redis: localhost:6379
    echo ========================================
)

if "%COMMAND%"=="stop" (
    echo 停止所有服务...
    docker-compose down
)

if "%COMMAND%"=="restart" (
    echo 重启所有服务...
    docker-compose restart
)

if "%COMMAND%"=="logs" (
    echo 查看日志...
    docker-compose logs -f
)

if "%COMMAND%"=="build" (
    echo 构建镜像...
    docker-compose build
)

if "%COMMAND%"=="help" (
    echo 用法: docker.bat [command]
    echo.
    echo   start   - 启动所有服务
    echo   stop    - 停止所有服务
    echo   restart - 重启所有服务
    echo   logs    - 查看日志
    echo   build   - 构建镜像
    echo   help    - 显示帮助
)

pause

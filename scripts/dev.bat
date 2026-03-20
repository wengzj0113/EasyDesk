@echo off
chcp 65001 >nul
echo ========================================
echo   EasyDesk 开发环境启动
echo ========================================

cd /d %~dp0

REM 安装后端依赖
echo.
echo 安装后端依赖...
cd backend
if not exist "node_modules" (
    call npm install
) else (
    echo 后端依赖已安装
)
cd ..

REM 安装前端依赖
echo.
echo 安装前端依赖...
cd frontend
if not exist "node_modules" (
    call npm install
) else (
    echo 前端依赖已安装
)
cd ..

REM 启动后端
echo.
echo 启动后端服务 (端口 3001)...
start "EasyDesk Backend" cmd /k "cd backend && npm run dev"

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 启动前端
echo 启动前端服务 (端口 3000)...
start "EasyDesk Frontend" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo   服务启动完成!
echo ========================================
echo   前端: http://localhost:3000
echo   后端: http://localhost:3001
echo ========================================
echo.
echo 按任意键打开浏览器访问...
pause >nul
start http://localhost:3000

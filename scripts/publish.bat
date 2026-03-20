@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo === EasyDesk 自动发布脚本 ===
echo.

:: 检查参数
if "%~1"=="" (
    echo 用法: publish.bat ^<版本号^>
    echo 示例: publish.bat v1.0.1
    exit /b 1
)

set VERSION=%~1

:: 验证版本号格式
echo %VERSION% | findstr /r "^v[0-9]*\.[0-9]*\.[0-9]*$" >nul
if errorlevel 1 (
    echo 版本号格式错误，请使用 vX.X.X 格式
    exit /b 1
)

:: 检查 GitHub CLI 登录状态
echo [1/6] 检查 GitHub CLI 登录状态...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo 请先运行: gh auth login
    exit /b 1
)
echo GitHub CLI 已登录
echo.

:: 检查并提交代码
echo [2/6] 检查代码状态...
git status --porcelain >nul 2>&1
if not errorlevel 1 (
    echo 代码已是最新
) else (
    echo 有未提交的更改，是否提交? (y/n)
    set /p answer=
    if /i "%answer%"=="y" (
        echo 请输入提交信息:
        set /p commit_msg=
        git add -A
        git commit -m "%commit_msg%"
        echo 代码已提交
    )
)
echo.

:: 创建并推送 Tag
echo [3/6] 创建 Tag %VERSION%...
git tag -a %VERSION% -m "EasyDesk %VERSION% 发布"
git push origin %VERSION%
echo Tag 已推送
echo.

:: 创建 GitHub Release
echo [4/6] 创建 GitHub Release...
for /f "delims=" %%i in ('gh release create %VERSION% --title "EasyDesk %VERSION%" --generate-notes --json url -q .url') do set RELEASE_URL=%%i
echo Release 已创建: %RELEASE_URL%
echo.

:: 构建 Electron 安装包
echo [5/6] 构建 Electron 安装包...
cd frontend
call npm run electron:build
cd ..
echo 安装包构建完成
echo.

:: 上传安装包到 Release
echo [6/6] 上传安装包到 Release...
set EXE_FILE=frontend\release\EasyDesk Setup %VERSION:~1%.exe
gh release upload %VERSION% "%EXE_FILE%" --clobber
echo 安装包上传完成
echo.

:: 完成
echo === 发布完成! ===
echo Release 地址: %RELEASE_URL%

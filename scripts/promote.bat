@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo === EasyDesk 项目推广脚本 ===
echo.

set PROJECT_NAME=EasyDesk
set PROJECT_URL=https://github.com/wengzj0113/EasyDesk
set RELEASE_URL=https://github.com/wengzj0113/EasyDesk/releases/tag/v1.1.0

echo [1/4] Product Hunt 推广
echo 请手动提交到 Product Hunt:
echo   - 标题: EasyDesk
echo   - 副标题: 免费开源的极简远程桌面应用
echo   - 链接: %RELEASE_URL%
echo.

echo [2/4] Twitter/X 推广
echo 要自动发 Twitter，需要配置 TWITTER_BEARER_TOKEN 环境变量
echo.
echo 推荐手动发布的内容:
echo 🎉 推荐一款免费开源的远程桌面应用 #EasyDesk
echo.
echo ✨ 功能特点:
echo • 免登录快速连接
echo • 远程文件管理
echo • 远程截图
echo • 系统托盘
echo.
echo 🔗 %RELEASE_URL%
echo.
echo #远程桌面 #开源 #远程办公
echo.

echo [3/4] Reddit 推广
echo 推荐发布到以下 subreddits:
echo   - r/programming
echo   - r/opensource
echo   - r/remote desktop
echo.

echo [4/4] 开发者社区推广
echo - 掘金: https://juejin.cn/
echo - CSDN: https://blog.csdn.net/
echo - 简书: https://www.jianshu.com/
echo.

echo === 手动推广任务 ===
echo 1. 提交到 Product Hunt: https://www.producthunt.com/
echo 2. 发 Twitter: https://twitter.com/
echo 3. 发 Reddit: https://reddit.com/r/programming
echo 4. 提交到开源目录:
echo    - https://alternativeto.net/software/easydesk/
echo    - https://www.opensourcealternative.to/
echo 5. 技术博客/文章推广
echo.

pause

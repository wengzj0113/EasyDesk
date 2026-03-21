#!/bin/bash
# EasyDesk 项目推广脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== EasyDesk 项目推广脚本 ===${NC}\n"

# 项目信息
PROJECT_NAME="EasyDesk"
PROJECT_URL="https://github.com/wengzj0113/EasyDesk"
RELEASE_URL="https://github.com/wengzj0113/EasyDesk/releases/tag/v1.1.0"
DESCRIPTION="极简远程桌面应用 - 免登录快速连接、远程文件管理、截图、系统托盘"

# 社交媒体推广内容
TWITTER_CONTENT="🎉 推荐一款免费开源的远程桌面应用 #EasyDesk

✨ 功能特点:
• 免登录快速连接
• 远程文件管理
• 远程截图
• 系统托盘
• 全局快捷键

🔗 $RELEASE_URL

#远程桌面 #开源 #远程办公"

# Reddit 推广内容
REDDIT_CONTENT="我开发了一款免费开源的远程桌面应用 EasyDesk

**功能特点:**
- 免登录快速连接 (设备码+密码)
- 远程文件管理 (浏览、上传、下载)
- 远程截图
- 系统托盘运行
- 全局快捷键

**技术栈:**
- 前端: React + TypeScript + Ant Design
- 后端: Node.js + Express + Socket.io
- 桌面: Electron
- 数据库: MongoDB + Redis
- WebRTC: 实时音视频传输

**下载:**
$RELEASE_URL

欢迎 Star 和 Fork!"

# Product Hunt 提交内容 (需要手动)
echo -e "${YELLOW}[1/4] Product Hunt 推广${NC}"
echo "请手动提交到 Product Hunt:"
echo "  - 标题: EasyDesk"
echo "  - 副标题: 免费开源的极简远程桌面应用"
echo "  - 链接: $RELEASE_URL"
echo ""

# Twitter/X 推广
echo -e "${YELLOW}[2/4] Twitter/X 推广${NC}"
echo "要自动发 Twitter，需要配置 TWITTER_BEARER_TOKEN 环境变量"
echo ""
echo "推荐手动发布的内容:"
echo "$TWITTER_CONTENT"
echo ""

# Reddit 推广
echo -e "${YELLOW}[3/4] Reddit 推广${NC}"
echo "推荐发布到以下 subreddits:"
echo "  - r/programming"
echo "  - r/opensource"
echo "  - r/remote desktop"
echo "  - r/Chinese (如果面向中文用户)"
echo ""
echo "发布内容:"
echo "$REDDIT_CONTENT"
echo ""

# 开发者社区推广
echo -e "${YELLOW}[4/4] 开发者社区推广${NC}"

# Gitee (码云) 推广
echo "- Gitee: https://gitee.com/import/youtube-dl"

echo ""
echo -e "${GREEN}=== 推广完成 ===${NC}"
echo ""
echo "手动推广任务:"
echo "1. 提交到 Product Hunt: https://www.producthunt.com/"
echo "2. 发 Twitter: https://twitter.com/"
echo "3. 发 Reddit: https://reddit.com/r/programming"
echo "4. 提交到开源目录:"
echo "   - https://alternativeto.net/software/easydesk/"
echo "   - https://www.opensourcealternative.to/"
echo "5. 技术博客/文章推广"
echo ""

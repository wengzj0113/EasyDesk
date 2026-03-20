#!/bin/bash
# EasyDesk 自动发布脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== EasyDesk 自动发布脚本 ===${NC}\n"

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}用法: ./publish.sh <版本号>${NC}"
    echo -e "示例: ./publish.sh v1.0.1"
    exit 1
fi

VERSION=$1

# 验证版本号格式
if [[ ! $VERSION =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}版本号格式错误，请使用 vX.X.X 格式${NC}"
    exit 1
fi

# 检查 GitHub CLI 登录状态
echo -e "${YELLOW}[1/6] 检查 GitHub CLI 登录状态...${NC}"
if ! gh auth status &>/dev/null; then
    echo -e "${RED}请先运行: gh auth login${NC}"
    exit 1
fi
echo -e "${GREEN}GitHub CLI 已登录${NC}\n"

# 检查并提交代码
echo -e "${YELLOW}[2/6] 检查代码状态...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo "有未提交的更改，是否提交? (y/n)"
    read -r answer
    if [ "$answer" = "y" ]; then
        echo "请输入提交信息:"
        read -r commit_msg
        git add -A
        git commit -m "$commit_msg"
        echo -e "${GREEN}代码已提交${NC}\n"
    else
        echo -e "${YELLOW}跳过提交，继续...${NC}\n"
    fi
else
    echo -e "${GREEN}代码已是最新${NC}\n"
fi

# 创建并推送 Tag
echo -e "${YELLOW}[3/6] 创建 Tag $VERSION...${NC}"
git tag -a "$VERSION" -m "EasyDesk $VERSION 发布"
git push origin "$VERSION"
echo -e "${GREEN}Tag 已推送${NC}\n"

# 创建 GitHub Release
echo -e "${YELLOW}[4/6] 创建 GitHub Release...${NC}"
RELEASE_URL=$(gh release create "$VERSION" --title "EasyDesk $VERSION" --generate-notes --json url -q .url)
echo -e "${GREEN}Release 已创建: $RELEASE_URL${NC}\n"

# 构建 Electron 安装包
echo -e "${YELLOW}[5/6] 构建 Electron 安装包...${NC}"
cd frontend
npm run electron:build
cd ..
echo -e "${GREEN}安装包构建完成${NC}\n"

# 上传安装包到 Release
echo -e "${YELLOW}[6/6] 上传安装包到 Release...${NC}"
EXE_FILE="frontend/release/EasyDesk Setup ${VERSION#v}.exe"
gh release upload "$VERSION" "$EXE_FILE" --clobber
echo -e "${GREEN}安装包上传完成${NC}\n"

# 完成
echo -e "${GREEN}=== 发布完成! ===${NC}"
echo -e "Release 地址: $RELEASE_URL"
echo -e "下载安装包: $RELEASE_URL"

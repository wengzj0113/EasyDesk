# EasyDesk - 极简远程桌面应用

[![GitHub stars](https://img.shields.io/github/stars/wengzj0113/EasyDesk?style=flat-square)](https://github.com/wengzj0113/EasyDesk/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/wengzj0113/EasyDesk?style=flat-square)](https://github.com/wengzj0113/EasyDesk/network)
[![GitHub issues](https://img.shields.io/github/issues/wengzj0113/EasyDesk?style=flat-square)](https://github.com/wengzj0113/EasyDesk/issues)
[![GitHub license](https://img.shields.io/github/license/wengzj0113/EasyDesk?style=flat-square)](https://github.com/wengzj0113/EasyDesk/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-v1.1.0-blue?style=flat-square)](https://github.com/wengzj0113/EasyDesk/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Web-green?style=flat-square)](https://github.com/wengzj0113/EasyDesk)

[English](./README.md) | [中文](./README_CN.md)

EasyDesk 是一款免费开源的极简远程桌面应用，专为个人远程办公和技术支持设计。

## ✨ 功能特性

### 核心功能
| 功能 | 描述 |
|------|------|
| 🔗 **免登录连接** | 6位设备码 + 密码，直接远程连接 |
| 📱 **设备管理** | 登录后绑定设备，一键直连 |
| 🖥️ **远程控制** | 流畅的鼠标键盘操作体验 |
| 📁 **文件传输** | 安全可靠的点对点文件传输 |
| 📸 **远程截图** | 快速截取远程设备屏幕 |
| 📂 **文件管理** | 浏览和管理远程设备文件 |
| 📥 **系统托盘** | 后台运行，快速调用 |
| ⌨️ **全局快捷键** | 快速截图、显示/隐藏窗口 |

### 安全特性
- 🔒 端到端加密传输
- 🔒 连接实时提示，用户完全控制
- 🔒 密码保护连接
- 🔒 异常连接监控

## 🚀 快速开始

### 下载安装

从 [Releases](https://github.com/wengzj0113/EasyDesk/releases) 下载最新版本：

- **Windows**: `EasyDesk Setup 1.1.0.exe`
- **Web 版本**: 直接访问部署的网站

### 本地开发

```bash
# 克隆项目
git clone https://github.com/wengzj0113/EasyDesk.git
cd EasyDesk

# 启动后端
cd backend
npm install
npm run dev

# 启动前端
cd frontend
npm install
npm start
```

### Docker 部署

```bash
docker-compose up -d
```

## 🛠️ 技术栈

### 前端
- React 18 + TypeScript
- Ant Design
- Zustand (状态管理)
- React Router v6
- Socket.io Client
- WebRTC
- Electron

### 后端
- Node.js + Express
- MongoDB + Mongoose
- Redis
- Socket.io
- JWT 认证

## 📱 界面预览

> 添加截图到 docs/images/ 目录

## 🤝 贡献指南

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 📄 开源协议

本项目基于 MIT 协议开源 - 查看 [LICENSE](LICENSE) 了解更多。

## 🌟  Star 历史

[![Stargazers over time](https://starchart.cc/wengzj0113/EasyDesk.svg)](https://starchart.cc/wengzj0113/EasyDesk)

---

<p align="center">
  如果觉得不错，请给个项目 ⭐ 支持！
</p>

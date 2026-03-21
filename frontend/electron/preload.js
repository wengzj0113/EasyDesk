const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 获取平台信息
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // 获取屏幕/窗口列表
  getSources: () => ipcRenderer.invoke('get-sources'),

  // 获取屏幕信息
  getScreenInfo: () => ipcRenderer.invoke('get-screen-info'),

  // 设置远程控制模式
  setRemoteControl: (enabled) => ipcRenderer.invoke('set-remote-control', enabled),

  // 获取远程控制模式状态
  isRemoteControl: () => ipcRenderer.invoke('is-remote-control'),

  // 发送远程鼠标移动到主进程
  sendRemoteMouseMove: (data) => {
    ipcRenderer.send('remote-mouse-move', data);
  },

  // 发送远程鼠标点击到主进程
  sendRemoteMouseClick: (data) => {
    ipcRenderer.send('remote-mouse-click', data);
  },

  // 发送远程键盘输入到主进程
  sendRemoteKeyboard: (data) => {
    ipcRenderer.send('remote-keyboard', data);
  },

  // 监听远程鼠标移动（从主进程接收）
  onRemoteMouseMove: (callback) => {
    ipcRenderer.on('remote-mouse-move', (event, data) => callback(data));
  },

  // 监听远程鼠标点击（从主进程接收）
  onRemoteMouseClick: (callback) => {
    ipcRenderer.on('remote-mouse-click', (event, data) => callback(data));
  },

  // 监听远程键盘输入（从主进程接收）
  onRemoteKeyboard: (callback) => {
    ipcRenderer.on('remote-keyboard', (event, data) => callback(data));
  },

  // 移除监听器
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // ========== 文件管理 API ==========
  // 获取用户主目录
  getHomeDirectory: () => ipcRenderer.invoke('get-home-directory'),

  // 读取目录内容
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),

  // 读取文件
  readFile: (filePath, options) => ipcRenderer.invoke('read-file', filePath, options),

  // 删除文件或目录
  deleteItem: (itemPath, isDirectory) => ipcRenderer.invoke('delete-item', itemPath, isDirectory),

  // 重命名
  renameItem: (oldPath, newName) => ipcRenderer.invoke('rename-item', oldPath, newName),

  // 创建目录
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),

  // 获取磁盘列表
  getDrives: () => ipcRenderer.invoke('get-drives'),

  // 截图
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // 保存文件对话框
  saveFileDialog: (defaultName) => ipcRenderer.invoke('save-file-dialog', defaultName),

  // 保存文件
  saveFile: (filePath, base64Data) => ipcRenderer.invoke('save-file', filePath, base64Data),

  // 窗口控制
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // 监听全局快捷键
  onGlobalShortcut: (callback) => {
    ipcRenderer.on('global-shortcut', (event, data) => callback(data));
  },

  // 监听截图
  onScreenshotCaptured: (callback) => {
    ipcRenderer.on('screenshot-captured', (event, data) => callback(data));
  },

  // 剪贴板功能
  clipboardReadText: () => ipcRenderer.invoke('clipboard-read-text'),
  clipboardWriteText: (text) => ipcRenderer.invoke('clipboard-write-text', text),
  clipboardReadImage: () => ipcRenderer.invoke('clipboard-read-image'),
  clipboardWriteImage: (base64Data) => ipcRenderer.invoke('clipboard-write-image', base64Data),
  clipboardHasText: () => ipcRenderer.invoke('clipboard-has-text'),
  clipboardHasImage: () => ipcRenderer.invoke('clipboard-has-image'),

  // 打印功能
  printPage: (options) => ipcRenderer.invoke('print-page', options),
  printToPdf: (options) => ipcRenderer.invoke('print-to-pdf', options)
});

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
  }
});

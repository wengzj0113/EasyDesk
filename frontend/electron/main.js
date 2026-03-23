const { app, BrowserWindow, ipcMain, shell, desktopCapturer, screen, globalShortcut, dialog, Tray, Menu, nativeImage, clipboard, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

let mainWindow;
let tray = null;
let isQuitting = false;

// URL白名单 - 仅允许打开安全的链接
const ALLOWED_EXTERNAL_URLS = [
  /^https?:\/\/github\.com\//,
  /^https?:\/\/docs\.github\.com\//,
  /^https?:\/\/github\.io\//,
];

// 验证URL是否安全
function isUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    // 只允许 https（除 localhost 外）
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      return false;
    }
    // 检查是否匹配白名单
    return ALLOWED_EXTERNAL_URLS.some(regex => regex.test(url));
  } catch {
    return false;
  }
}

// ========== 文件路径安全验证 ==========
// 获取允许访问的根目录
const ALLOWED_BASE_PATHS = [os.homedir()];

// 验证路径是否在允许范围内（防止目录遍历攻击）
function isPathAllowed(filePath) {
  try {
    // 规范化路径
    const normalizedPath = path.normalize(filePath);
    // 检查路径是否在允许的目录内
    return ALLOWED_BASE_PATHS.some(basePath => {
      const normalizedBase = path.normalize(basePath);
      return normalizedPath.startsWith(normalizedBase);
    });
  } catch {
    return false;
  }
}

// 验证文件路径（用于读取）
function validateReadPath(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return { valid: false, error: '无效的路径' };
  }
  if (!isPathAllowed(filePath)) {
    return { valid: false, error: '路径超出允许范围' };
  }
  // 检查路径中是否有可疑的遍历模式
  if (filePath.includes('..') || filePath.includes('~')) {
    return { valid: false, error: '无效的路径格式' };
  }
  return { valid: true };
}

// 验证写入路径
function validateWritePath(filePath) {
  const result = validateReadPath(filePath);
  if (!result.valid) return result;

  // 写入路径不能是系统关键目录
  const forbiddenPatterns = [
    /windows[/\\]system32/i,
    /program files/i,
    /etc[/\\]/i,
    /usr[/\\]bin/i,
    /usr[/\\]sbin/i,
  ];

  const normalizedPath = path.normalize(filePath);
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(normalizedPath)) {
      return { valid: false, error: '不能写入系统目录' };
    }
  }
  return { valid: true };
}

function createWindow() {
  // 获取资源路径
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // Windows专用配置
    title: 'EasyDesk - 极简远程桌面',
    backgroundColor: '#001529',
    show: false,
  });

  // 加载应用
  if (isDev) {
    // 开发模式：加载本地开发服务器
    mainWindow.loadURL('http://localhost:3000');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载构建后的文件
    const indexPath = path.join(__dirname, '../build/index.html');
    console.log('Loading from:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('EasyDesk 已启动');
  });

  // 监听加载错误
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // 监听页面加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message);
  });

  // 监听渲染进程错误
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // 处理外部链接 - 添加URL白名单验证
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isUrlAllowed(url)) {
      shell.openExternal(url);
    } else {
      console.warn('Blocked external URL:', url);
    }
    return { action: 'deny' };
  });

  // 窗口关闭时
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 监听窗口最小化，最小化到托盘
  mainWindow.on('minimize', (event) => {
    // 可以选择是否最小化到托盘
  });

  // 监听窗口关闭，处理托盘退出
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

// 创建系统托盘
function createTray() {
  // 创建一个简单的托盘图标
  const iconPath = path.join(__dirname, '../build/icon.png');
  let trayIcon;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // 使用默认图标
    trayIcon = nativeImage.createEmpty();
  }

  // 如果图标为空，创建一个简单的图标
  if (trayIcon.isEmpty()) {
    // 创建一个 16x16 的简单图标
    trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAADfSURBVDiNpZMxDoJAEEX/LhZaWFFrS29gYeUtPIeH8Bbewtpb2HoLC2tvYOkNPdeGXYKwLGKyZpNJMvn/2d2Z/5xABGpmVhGrA0RE4M0sAqiIvJjZLmNmrqqqqh6B4ygiL0EQEZF7EZmLyLOqroFTVX0GEJGcmV2IyKOIXJnZDlifTyaTyX8B1gA2qroGsAD2wN7MuhH4AtbAGZgCS+ABHIE9cAFuwBXY9FngqFsQkRNwU9UdsOwE7IBNJwCqWlTVCagAqyPw0D0A8x4w9X8B4FJVj0AFWAMzYK5bICJnoNT9/wB2wFxEHkAFWAMLEbkDFaAKrFT1pPv/G/xmA3+MxjV8D9eCAAAAAElFTkSuQmCC');
  }

  // 调整图标大小
  trayIcon = trayIcon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 EasyDesk',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('EasyDesk - 极简远程桌面');
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  // 截图快捷键: Ctrl+Shift+S
  globalShortcut.register('CommandOrControl+Shift+S', async () => {
    if (mainWindow) {
      mainWindow.webContents.send('global-shortcut', 'screenshot');
      // 执行截图
      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: screen.getPrimaryDisplay().size
        });
        if (sources.length > 0) {
          const screenshot = sources[0].thumbnail.toDataURL();
          mainWindow.webContents.send('screenshot-captured', screenshot);
        }
      } catch (error) {
        console.error('截图失败:', error);
      }
    }
  });

  // 最小化到托盘: Ctrl+Shift+M
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前注销全局快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC处理器 - 获取版本号
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// IPC处理器 - 窗口控制
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// IPC处理器 - 获取平台信息
ipcMain.handle('get-platform', () => {
  return process.platform;
});

// IPC处理器 - 获取屏幕列表
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 }
    });
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// IPC处理器 - 获取屏幕信息
ipcMain.handle('get-screen-info', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    scaleFactor: primaryDisplay.scaleFactor
  };
});

// IPC处理器 - 发送鼠标事件
ipcMain.on('mouse-move', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('remote-mouse-move', data);
  }
});

ipcMain.on('mouse-click', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('remote-mouse-click', data);
  }
});

ipcMain.on('keyboard-input', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('remote-keyboard', data);
  }
});

// 设置窗口为可被远程控制模式
let remoteControlMode = false;
ipcMain.handle('set-remote-control', (event, enabled) => {
  remoteControlMode = enabled;
  console.log('Remote control mode:', enabled);
  return remoteControlMode;
});

// 获取远程控制模式状态
ipcMain.handle('is-remote-control', () => {
  return remoteControlMode;
});

// Windows 鼠标移动
function moveMouse(x, y) {
  if (process.platform !== 'win32') return;

  // 使用 PowerShell 调用 Windows API
  const script = `
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Mouse {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@
[Mouse]::SetCursorPos(${Math.round(x)}, ${Math.round(y)})
  `;

  exec(`powershell -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
    (error) => {
      if (error) console.error('Mouse move error:', error);
    }
  );
}

// Windows 鼠标点击
function mouseClick(button) {
  if (process.platform !== 'win32') return;

  const buttonCode = button === 2 ? 'right' : 'left';
  const downUp = 'down';

  // 使用 PowerShell 发送鼠标点击
  const script = `
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);
    public const int LEFTDOWN = 0x00000002;
    public const int LEFTUP = 0x00000004;
    public const int RIGHTDOWN = 0x00000008;
    public const int RIGHTUP = 0x00000010;
}
"@
$btn = if ("${buttonCode}" -eq "right") { [MouseClick]::RIGHTDOWN } else { [MouseClick]::LEFTDOWN }
[MouseClick]::mouse_event($btn, 0, 0, 0, 0)
Start-Sleep -Milliseconds 10
$btn = if ("${buttonCode}" -eq "right") { [MouseClick]::RIGHTUP } else { [MouseClick]::LEFTUP }
[MouseClick]::mouse_event($btn, 0, 0, 0, 0)
  `;

  exec(`powershell -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
    (error) => {
      if (error) console.error('Mouse click error:', error);
    }
  );
}

// Windows 键盘输入 - 使用白名单方式防止命令注入
function sendKey(key, isDown) {
  if (process.platform !== 'win32') return;

  // 虚拟键码白名单（只允许已知安全的键）
  const keyMap = {
    // 字母键
    'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45, 'f': 0x46,
    'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A, 'k': 0x4B, 'l': 0x4C,
    'm': 0x4D, 'n': 0x4E, 'o': 0x4F, 'p': 0x50, 'q': 0x51, 'r': 0x52,
    's': 0x53, 't': 0x54, 'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58,
    'y': 0x59, 'z': 0x5A,
    // 数字键
    '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
    '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
    // 功能键
    'Enter': 0x0D, 'Escape': 0x1B, 'Backspace': 0x08, 'Tab': 0x09,
    'Space': 0x20, 'Shift': 0x10, 'Control': 0x11, 'Alt': 0x12,
    'CapsLock': 0x14, 'ArrowUp': 0x26, 'ArrowDown': 0x28,
    'ArrowLeft': 0x25, 'ArrowRight': 0x27
  };

  // 只允许白名单中的键，防止命令注入
  const normalizedKey = key.toLowerCase();
  const vkCode = keyMap[normalizedKey];

  // 如果键不在白名单中，拒绝执行
  if (vkCode === undefined) {
    console.warn('Blocked unknown key:', key);
    return;
  }

  const eventFlag = isDown ? 0x0001 : 0x0002; // KEYEVENTF_KEYDOWN / KEYEVENTF_KEYUP

  // 使用参数传递而不是字符串拼接，防止注入
  const script = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeyInput {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void key_event(int bVk, int bScan, int dwFlags, int dwExtraInfo);
}
"@
[KeyInput]::key_event(${vkCode}, 0, ${eventFlag}, 0)
`;

  exec(`powershell -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
    (error) => {
      if (error) console.error('Key input error:', error);
    }
  );
}

// IPC 处理远程鼠标移动
ipcMain.on('remote-mouse-move', (event, data) => {
  if (!remoteControlMode) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const x = data.x * width;
  const y = data.y * height;

  moveMouse(x, y);
});

// IPC 处理远程鼠标点击
ipcMain.on('remote-mouse-click', (event, data) => {
  if (!remoteControlMode) return;

  // 先移动鼠标到位置
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const x = data.x * width;
  const y = data.y * height;

  moveMouse(x, y);

  // 然后点击
  setTimeout(() => {
    mouseClick(data.button || 0);
  }, 50);
});

// IPC 处理远程键盘输入
ipcMain.on('remote-keyboard', (event, data) => {
  if (!remoteControlMode) return;

  const isDown = data.type === 'keyDown';
  sendKey(data.key, isDown);
});

// ========== 文件管理功能 ==========

// 获取用户主目录
ipcMain.handle('get-home-directory', () => {
  return os.homedir();
});

// 读取目录内容（添加路径验证）
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    // 验证路径
    const validation = validateReadPath(dirPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      path: path.join(dirPath, item.name),
      isDirectory: item.isDirectory(),
      size: item.isFile() ? (() => {
        try {
          return fs.statSync(path.join(dirPath, item.name)).size;
        } catch { return 0; }
      })() : 0,
      modifiedTime: (() => {
        try {
          return fs.statSync(path.join(dirPath, item.name)).mtime.getTime();
        } catch { return 0; }
      })()
    }));
    // 目录在前，文件在后，按名称排序
    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    return { success: true, items: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取文件内容（用于小文件预览，添加路径验证）
ipcMain.handle('read-file', async (event, filePath, options = {}) => {
  try {
    // 验证路径
    const validation = validateReadPath(filePath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { encoding = 'base64', start = 0, end = null } = options;
    const stats = await fs.promises.stat(filePath);

    // 大于 10MB 的文件拒绝读取
    if (stats.size > 10 * 1024 * 1024) {
      return { success: false, error: '文件过大' };
    }

    if (encoding === 'buffer') {
      const buffer = await fs.promises.readFile(filePath);
      return { success: true, data: buffer.toString('base64'), size: stats.size };
    } else if (encoding === 'text') {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return { success: true, data: content, size: stats.size };
    } else {
      const buffer = await fs.promises.readFile(filePath);
      return { success: true, data: buffer.toString('base64'), size: stats.size };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 删除文件或目录（添加路径验证）
ipcMain.handle('delete-item', async (event, itemPath, isDirectory) => {
  try {
    // 验证路径
    const validation = validateWritePath(itemPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (isDirectory) {
      await fs.promises.rm(itemPath, { recursive: true });
    } else {
      await fs.promises.unlink(itemPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 重命名文件或目录（添加路径验证）
ipcMain.handle('rename-item', async (event, oldPath, newName) => {
  try {
    // 验证旧路径
    const validation = validateWritePath(oldPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 验证新名称
    if (!newName || typeof newName !== 'string' || newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
      return { success: false, error: '无效的文件名' };
    }

    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await fs.promises.rename(oldPath, newPath);
    return { success: true, newPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 创建目录（添加路径验证）
ipcMain.handle('create-directory', async (event, dirPath) => {
  try {
    // 验证路径
    const validation = validateWritePath(dirPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    await fs.promises.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 获取磁盘信息
ipcMain.handle('get-drives', async () => {
  try {
    const drives = [];
    if (process.platform === 'win32') {
      // Windows: 获取所有盘符
      const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      for (const letter of letters) {
        const drivePath = `${letter}:\\`;
        try {
          await fs.promises.access(drivePath);
          const stats = await fs.promises.statfs(drivePath);
          drives.push({
            name: `${letter}:`,
            path: drivePath,
            total: stats.bsize * stats.blocks,
            free: stats.bsize * stats.bfree
          });
        } catch {}
      }
    } else {
      // Unix-like: 根目录和主目录
      drives.push({
        name: '/',
        path: '/',
        total: (() => {
          try {
            const stats = fs.statfsSync('/');
            return stats.bsize * stats.blocks;
          } catch { return 0; }
        })(),
        free: (() => {
          try {
            const stats = fs.statfsSync('/');
            return stats.bsize * stats.bfree;
          } catch { return 0; }
        })()
      });
      drives.push({
        name: os.homedir(),
        path: os.homedir(),
        total: 0,
        free: 0
      });
    }
    return { success: true, drives };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 截图功能
ipcMain.handle('capture-screen', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().size
    });
    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toDataURL();
      return { success: true, data: screenshot };
    }
    return { success: false, error: '无法获取屏幕' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存文件对话框
ipcMain.handle('save-file-dialog', async (event, defaultName) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: '所有文件', extensions: ['*'] }]
    });
    return { success: !result.canceled, filePath: result.filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 保存文件
ipcMain.handle('save-file', async (event, filePath, base64Data) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ========== 剪贴板功能 ==========

// 读取剪贴板文本
ipcMain.handle('clipboard-read-text', () => {
  return clipboard.readText();
});

// 写入剪贴板文本
ipcMain.handle('clipboard-write-text', (event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

// 读取剪贴板图片
ipcMain.handle('clipboard-read-image', () => {
  try {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
      return { success: false, error: '剪贴板为空' };
    }
    return { success: true, data: image.toDataURL() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 写入剪贴板图片
ipcMain.handle('clipboard-write-image', (event, base64Data) => {
  try {
    const image = nativeImage.createFromDataURL(base64Data);
    clipboard.writeImage(image);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 检查剪贴板是否有内容
ipcMain.handle('clipboard-has-text', () => {
  return clipboard.readText().length > 0;
});

ipcMain.handle('clipboard-has-image', () => {
  return !clipboard.readImage().isEmpty();
});

// ========== 打印功能 ==========

// 打印页面
ipcMain.handle('print-page', async (event, options = {}) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: '窗口不存在' };
    }

    const defaultOptions = {
      silent: false,
      printBackground: true,
      color: true,
      margin: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
      landscape: false,
      ...options
    };

    // 使用 webContents 打印
    mainWindow.webContents.print(defaultOptions, (success, errorType) => {
      if (success) {
        console.log('打印成功');
      } else {
        console.error('打印失败:', errorType);
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 打印 PDF
ipcMain.handle('print-to-pdf', async (event, options = {}) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, error: '窗口不存在' };
    }

    const data = await mainWindow.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      ...options
    });

    return { success: true, data: data.toString('base64') };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

const { app, BrowserWindow, ipcMain, shell, desktopCapturer, screen, globalShortcut } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

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

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭时
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow();

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

// IPC处理器 - 获取版本号
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
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

// Windows 键盘输入
function sendKey(key, isDown) {
  if (process.platform !== 'win32') return;

  // 虚拟键码映射
  const keyMap = {
    'a': 0x41, 'b': 0x42, 'c': 0x43, 'd': 0x44, 'e': 0x45, 'f': 0x46,
    'g': 0x47, 'h': 0x48, 'i': 0x49, 'j': 0x4A, 'k': 0x4B, 'l': 0x4C,
    'm': 0x4D, 'n': 0x4E, 'o': 0x4F, 'p': 0x50, 'q': 0x51, 'r': 0x52,
    's': 0x53, 't': 0x54, 'u': 0x55, 'v': 0x56, 'w': 0x57, 'x': 0x58,
    'y': 0x59, 'z': 0x5A,
    '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
    '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39,
    'Enter': 0x0D, 'Escape': 0x1B, 'Backspace': 0x08, 'Tab': 0x09,
    'Space': 0x20, 'Shift': 0x10, 'Control': 0x11, 'Alt': 0x12,
    'CapsLock': 0x14, 'ArrowUp': 0x26, 'ArrowDown': 0x28,
    'ArrowLeft': 0x25, 'ArrowRight': 0x27
  };

  const vkCode = keyMap[key.toLowerCase()] || key.charCodeAt(0);
  const eventFlag = isDown ? 0x0001 : 0x0002; // KEYEVENTF_KEYDOWN / KEYEVENTF_KEYUP

  // 添加修饰键
  const script = `
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KeyInput {
    [DllImport("user32.dll", CharSet = CharSet.Auto, CallingConvention = CallingConvention.StdCall)]
    public static extern void key_event(int bVk, int bScan, int dwFlags, int dwExtraInfo);
    public const int KEYEVENTF_KEYDOWN = 0x0001;
    public const int KEYEVENTF_KEYUP = 0x0002;
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

// Electron API 类型声明
export interface ElectronAPI {
  // 版本信息
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<string>;

  // 窗口控制
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;

  // 屏幕/源
  getSources: () => Promise<Array<{ id: string; name: string; thumbnail: string }>>;
  getScreenInfo: () => Promise<{ width: number; height: number; scaleFactor: number }>;

  // 远程控制
  setRemoteControl: (enabled: boolean) => Promise<boolean>;
  isRemoteControl: () => Promise<boolean>;
  sendRemoteMouseMove: (data: { x: number; y: number }) => void;
  sendRemoteMouseClick: (data: { x: number; y: number; button?: number }) => void;
  sendRemoteKeyboard: (data: KeyboardData) => void;

  // 文件管理
  getHomeDirectory: () => Promise<string>;
  readDirectory: (dirPath: string) => Promise<DirectoryResult>;
  readFile: (filePath: string, options?: FileReadOptions) => Promise<FileReadResult>;
  deleteItem: (itemPath: string, isDirectory: boolean) => Promise<OperationResult>;
  renameItem: (oldPath: string, newName: string) => Promise<RenameResult>;
  createDirectory: (dirPath: string) => Promise<OperationResult>;
  getDrives: () => Promise<DrivesResult>;
  saveFileDialog: (defaultName?: string) => Promise<SaveFileResult>;
  saveFile: (filePath: string, base64Data: string) => Promise<OperationResult>;

  // 截图
  captureScreen: () => Promise<ScreenshotResult>;

  // 剪贴板
  clipboardReadText: () => Promise<string>;
  clipboardWriteText: (text: string) => Promise<{ success: boolean }>;
  clipboardReadImage: () => Promise<ClipboardImageResult>;
  clipboardWriteImage: (base64Data: string) => Promise<OperationResult>;
  clipboardHasText: () => Promise<boolean>;
  clipboardHasImage: () => Promise<boolean>;

  // 打印
  printPage: (options?: PrintOptions) => Promise<OperationResult>;
  printToPdf: (options?: PrintPdfOptions) => Promise<PrintPdfResult>;
}

export interface KeyboardData {
  type: 'keyDown' | 'keyUp';
  key: string;
  code?: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export interface DirectoryResult {
  success: boolean;
  items?: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
    size: number;
    modifiedTime: number;
  }>;
  error?: string;
}

export interface FileReadOptions {
  encoding?: 'base64' | 'text' | 'buffer';
  start?: number;
  end?: number;
}

export interface FileReadResult {
  success: boolean;
  data?: string;
  size?: number;
  error?: string;
}

export interface OperationResult {
  success: boolean;
  error?: string;
}

export interface RenameResult {
  success: boolean;
  newPath?: string;
  error?: string;
}

export interface DrivesResult {
  success: boolean;
  drives?: Array<{
    name: string;
    path: string;
    total: number;
    free: number;
  }>;
  error?: string;
}

export interface SaveFileResult {
  success: boolean;
  filePath?: string;
}

export interface ScreenshotResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface ClipboardImageResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface PrintOptions {
  silent?: boolean;
  printBackground?: boolean;
  color?: boolean;
  landscape?: boolean;
}

export interface PrintPdfOptions {
  printBackground?: boolean;
  landscape?: boolean;
}

export interface PrintPdfResult {
  success: boolean;
  data?: string;
  error?: string;
}

// 全局window接口扩展
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  vipStatus: boolean;
  vipExpireTime?: string;
}

interface Device {
  id: string;
  deviceCode: string;
  deviceName: string;
  isOnline: boolean;
  lastSeen: string;
}

export interface ConnectionInfo {
  targetDeviceCode: string;
  targetDeviceName?: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  startTime?: number;
  connectionId?: string;
}

// 收藏连接
export interface SavedConnection {
  id: string;
  deviceCode: string;
  deviceName: string;
  password?: string;
  lastConnected?: string;
  isOnline?: boolean;
}

// 连接历史
export interface ConnectionHistoryItem {
  id: string;
  deviceCode: string;
  deviceName: string;
  timestamp: number;
  success: boolean;
  duration?: number;
}

// 网络质量
export interface NetworkQuality {
  latency: number;       // ms
  fps: number;
  packetLoss: number;    // 0-100%
  bandwidth: number;      // kbps
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface AppState {
  user: User | null;
  token: string | null;
  devices: Device[];
  currentConnection: ConnectionInfo | null;
  savedConnections: SavedConnection[];
  connectionHistory: ConnectionHistoryItem[];
  networkQuality: NetworkQuality;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setDevices: (devices: Device[]) => void;
  setCurrentConnection: (connection: ConnectionInfo | null) => void;
  clearUser: () => void;
  // 收藏连接操作
  addSavedConnection: (conn: SavedConnection) => void;
  removeSavedConnection: (id: string) => void;
  updateSavedConnection: (id: string, updates: Partial<SavedConnection>) => void;
  // 历史记录操作
  addConnectionHistory: (item: ConnectionHistoryItem) => void;
  clearConnectionHistory: () => void;
  // 网络质量
  setNetworkQuality: (quality: NetworkQuality) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      devices: [],
      currentConnection: null,
      savedConnections: [],
      connectionHistory: [],
      networkQuality: { latency: 0, fps: 0, packetLoss: 0, bandwidth: 0, quality: 'good' },

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setDevices: (devices) => set({ devices }),
      setCurrentConnection: (connection) => set({ currentConnection: connection }),
      clearUser: () => set({
        user: null,
        token: null,
        devices: [],
        currentConnection: null
      }),

      // 收藏连接：去重添加
      addSavedConnection: (conn) => set((state) => {
        const exists = state.savedConnections.some(c => c.deviceCode === conn.deviceCode);
        if (exists) return state;
        return { savedConnections: [...state.savedConnections, conn] };
      }),

      // 移除收藏连接
      removeSavedConnection: (id) => set((state) => ({
        savedConnections: state.savedConnections.filter(c => c.id !== id)
      })),

      // 更新收藏连接
      updateSavedConnection: (id, updates) => set((state) => ({
        savedConnections: state.savedConnections.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      })),

      // 添加历史记录（保留最近50条）
      addConnectionHistory: (item) => set((state) => {
        const history = [item, ...state.connectionHistory].slice(0, 50);
        return { connectionHistory: history };
      }),

      // 清除历史
      clearConnectionHistory: () => set({ connectionHistory: [] }),

      // 更新网络质量
      setNetworkQuality: (quality) => set({ networkQuality: quality }),
    }),
    {
      name: 'easydesk-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        savedConnections: state.savedConnections,
        connectionHistory: state.connectionHistory,
      }),
    }
  )
);

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

interface AppState {
  user: User | null;
  token: string | null;
  devices: Device[];
  currentConnection: any;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setDevices: (devices: Device[]) => void;
  setCurrentConnection: (connection: any) => void;
  clearUser: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      devices: [],
      currentConnection: null,
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
    }),
    {
      name: 'easydesk-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);

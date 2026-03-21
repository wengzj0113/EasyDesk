import axios from 'axios';
import { message } from 'antd';
import { useStore } from '../store/useStore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// 错误消息映射
const errorMessages: Record<string, string> = {
  'Network Error': '网络连接失败，请检查网络设置',
  'timeout': '请求超时，请稍后重试',
  '401': '登录已过期，请重新登录',
  '403': '没有权限访问此资源',
  '404': '请求的资源不存在',
  '429': '请求过于频繁，请稍后重试',
  '500': '服务器内部错误，请稍后重试',
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：从 zustand store 读取 token（与 persist 存储保持一致）
api.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 获取错误状态码
    const statusCode = error.response?.status?.toString() || '';
    const errorMessage = error.response?.data?.error || error.message;

    // 记录错误日志
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: statusCode,
      message: errorMessage,
    });

    // 根据错误状态码显示用户友好的提示
    const userMessage = errorMessages[statusCode] ||
                        errorMessages[error.message] ||
                        errorMessage;

    // 不显示提示的错误类型（避免重复提示）
    const silentErrors = ['auth/login', 'auth/register'];
    const shouldShowMessage = !silentErrors.some(path => error.config?.url?.includes(path));

    if (shouldShowMessage && statusCode !== '401') {
      message.error(userMessage);
    }

    // 处理401错误（自动登出）
    if (statusCode === '401') {
      const { clearUser } = useStore.getState();
      clearUser();
      message.warning('登录已过期，请重新登录');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  register: (data: { username: string; password: string; email: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

export const deviceAPI = {
  getDeviceCode: () => api.get('/device/code'),
  updatePassword: (data: { newPassword: string }) =>
    api.post('/device/password', data),
  getMyDevices: () => api.get('/device/my-devices'),
  bindDevice: (data: { deviceCode: string; deviceName: string }) =>
    api.post('/device/bind', data),
  unbindDevice: (deviceId: string) => api.delete(`/device/${deviceId}`),
};

export const connectionAPI = {
  connect: (data: { deviceCode: string; password: string }) =>
    api.post('/connection/connect', data),
  disconnect: (data?: { connectionId?: string }) =>
    api.post('/connection/disconnect', data || {}),
  getConnectionStatus: () => api.get('/connection/status'),
  getHistory: (params?: { page?: number; pageSize?: number; startDate?: string; endDate?: string }) =>
    api.get('/connection/history', { params }),
};

export const vipAPI = {
  getVIPStatus: () => api.get('/vip/status'),
  createPayment: (data: { plan: string }) => api.post('/vip/payment', data),
  simulatePayment: (data: { plan: string }) => api.post('/vip/simulate-payment', data),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  save: (settings: Record<string, any>) => api.post('/settings', { settings }),
};

export default api;

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// API 接口定义
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
  disconnect: () => api.post('/connection/disconnect'),
  getConnectionStatus: () => api.get('/connection/status'),
};

export const vipAPI = {
  getVIPStatus: () => api.get('/vip/status'),
  createPayment: (data: { plan: string }) => api.post('/vip/payment', data),
  simulatePayment: (data: { plan: string }) => api.post('/vip/simulate-payment', data),
};

export default api;

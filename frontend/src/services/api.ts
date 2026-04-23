/**
 * API 请求服务
 * 提供带重试机制的 axios 封装，支持指数退避策略
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { useStore } from '../store/useStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('API');

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/** 重试配置 */
const RETRY_CONFIG = {
  maxRetries: 3,          // 最大重试次数
  baseDelay: 1000,         // 基础延迟（毫秒）
  maxDelay: 10000,         // 最大延迟（毫秒）
};

/** 可重试的 HTTP 状态码 */
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/** 判断错误是否应该重试 */
const isRetryableError = (error: AxiosError): boolean => {
  // 网络错误（如超时、DNS 失败）应该重试
  if (!error.response) {
    return true;
  }
  // 检查状态码是否在可重试列表中
  return RETRYABLE_STATUS_CODES.includes(error.response.status);
};

/** 计算指数退避延迟 */
const calculateBackoffDelay = (retryCount: number): number => {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
};

/** 带重试的请求执行器 */
const executeWithRetry = async <T>(
  requestFn: () => Promise<T>,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;

      // 如果没有更多重试次数或不可重试，直接抛出错误
      if (attempt === retries || !isRetryableError(error as AxiosError)) {
        throw error;
      }

      // 计算并等待退避延迟
      const delay = calculateBackoffDelay(attempt);
      logger.warn(`请求失败，将在 ${delay}ms 后重试 (${attempt + 1}/${retries})`, lastError.message);

      // 使用 Promise + setTimeout 实现延迟
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

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

// 请求拦截器：从 zustand store 读取 token
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
    logger.error('API Error:', {
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

/**
 * 执行带重试的 API 请求
 * @param config - axios 请求配置
 * @param options - 重试选项
 * @returns 响应数据
 */
export const requestWithRetry = async <T = unknown>(
  config: AxiosRequestConfig,
  options = { retries: RETRY_CONFIG.maxRetries }
): Promise<T> => {
  return executeWithRetry(() => api.request<T>(config).then(res => res.data), options.retries);
};

export const authAPI = {
  login: (data: { username: string; password: string }) => api.post('/auth/login', data),
  register: (data: { username: string; password: string; email: string }) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
};

export interface UnattendedSettings {
  enabled: boolean;
  trustedUntil?: Date | null;
  allowedControllers?: string[];
  requirePassword: boolean;
}

export const deviceAPI = {
  getDeviceCode: () => api.get('/device/code'),
  updatePassword: (data: { newPassword: string; type?: string }) => api.post('/device/password', data),
  getMyDevices: () => api.get('/device/my-devices'),
  bindDevice: (data: { deviceCode: string; deviceName: string }) => api.post('/device/bind', data),
  unbindDevice: (deviceId: string) => api.delete(`/device/${deviceId}`),
  updateUnattended: (deviceId: string, settings: UnattendedSettings) =>
    api.post('/device/unattended', { deviceId, ...settings }),
  getUnattendedSettings: (deviceId: string) =>
    api.get(`/device/unattended/${deviceId}`),
};

export const connectionAPI = {
  connect: (data: { deviceCode: string; password: string }) => api.post('/connection/connect', data),
  disconnect: (data?: { connectionId?: string }) => api.post('/connection/disconnect', data || {}),
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

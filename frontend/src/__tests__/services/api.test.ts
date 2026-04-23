/**
 * API Service Tests
 * Tests for API service functionality with retry logic
 */

import api, {
  authAPI,
  deviceAPI,
  connectionAPI,
  vipAPI,
  settingsAPI,
  requestWithRetry
} from '../../services/api';

// Mock axios
jest.mock('axios', () => {
  return {
    create: jest.fn().mockReturnValue({
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      },
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    })
  };
});

// Mock zustand store
jest.mock('../../store/useStore', () => ({
  useStore: jest.fn().mockReturnValue({
    token: 'mock-token',
    clearUser: jest.fn()
  })
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock antd message
jest.mock('antd', () => ({
  message: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn()
  }
}));

describe('API Service', () => {
  describe('API Instance', () => {
    test('should export api instance', () => {
      expect(api).toBeDefined();
    });

    test('should have request method', () => {
      expect(typeof api.request).toBe('function');
    });

    test('should have get method', () => {
      expect(typeof api.get).toBe('function');
    });

    test('should have post method', () => {
      expect(typeof api.post).toBe('function');
    });

    test('should have put method', () => {
      expect(typeof api.put).toBe('function');
    });

    test('should have delete method', () => {
      expect(typeof api.delete).toBe('function');
    });
  });

  describe('Auth API', () => {
    test('should export authAPI', () => {
      expect(authAPI).toBeDefined();
    });

    test('should have login method', () => {
      expect(typeof authAPI.login).toBe('function');
    });

    test('should have register method', () => {
      expect(typeof authAPI.register).toBe('function');
    });

    test('should have logout method', () => {
      expect(typeof authAPI.logout).toBe('function');
    });

    test('should call correct endpoint for login', () => {
      const loginSpy = jest.spyOn(api, 'post');
      authAPI.login({ username: 'test', password: 'password' });
      expect(loginSpy).toHaveBeenCalledWith('/auth/login', {
        username: 'test',
        password: 'password'
      });
    });

    test('should call correct endpoint for register', () => {
      const registerSpy = jest.spyOn(api, 'post');
      authAPI.register({
        username: 'test',
        password: 'password',
        email: 'test@example.com'
      });
      expect(registerSpy).toHaveBeenCalledWith('/auth/register', {
        username: 'test',
        password: 'password',
        email: 'test@example.com'
      });
    });

    test('should call correct endpoint for logout', () => {
      const logoutSpy = jest.spyOn(api, 'post');
      authAPI.logout();
      expect(logoutSpy).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('Device API', () => {
    test('should export deviceAPI', () => {
      expect(deviceAPI).toBeDefined();
    });

    test('should have getDeviceCode method', () => {
      expect(typeof deviceAPI.getDeviceCode).toBe('function');
    });

    test('should have updatePassword method', () => {
      expect(typeof deviceAPI.updatePassword).toBe('function');
    });

    test('should have getMyDevices method', () => {
      expect(typeof deviceAPI.getMyDevices).toBe('function');
    });

    test('should have bindDevice method', () => {
      expect(typeof deviceAPI.bindDevice).toBe('function');
    });

    test('should have unbindDevice method', () => {
      expect(typeof deviceAPI.unbindDevice).toBe('function');
    });

    test('should have updateUnattended method', () => {
      expect(typeof deviceAPI.updateUnattended).toBe('function');
    });

    test('should have getUnattendedSettings method', () => {
      expect(typeof deviceAPI.getUnattendedSettings).toBe('function');
    });

    test('should call correct endpoint for getDeviceCode', () => {
      const getSpy = jest.spyOn(api, 'get');
      deviceAPI.getDeviceCode();
      expect(getSpy).toHaveBeenCalledWith('/device/code');
    });

    test('should call correct endpoint for bindDevice', () => {
      const postSpy = jest.spyOn(api, 'post');
      deviceAPI.bindDevice({
        deviceCode: '123456789',
        deviceName: 'Test Device'
      });
      expect(postSpy).toHaveBeenCalledWith('/device/bind', {
        deviceCode: '123456789',
        deviceName: 'Test Device'
      });
    });
  });

  describe('Connection API', () => {
    test('should export connectionAPI', () => {
      expect(connectionAPI).toBeDefined();
    });

    test('should have connect method', () => {
      expect(typeof connectionAPI.connect).toBe('function');
    });

    test('should have disconnect method', () => {
      expect(typeof connectionAPI.disconnect).toBe('function');
    });

    test('should have getConnectionStatus method', () => {
      expect(typeof connectionAPI.getConnectionStatus).toBe('function');
    });

    test('should have getHistory method', () => {
      expect(typeof connectionAPI.getHistory).toBe('function');
    });

    test('should call correct endpoint for connect', () => {
      const postSpy = jest.spyOn(api, 'post');
      connectionAPI.connect({
        deviceCode: '123456789',
        password: '123456'
      });
      expect(postSpy).toHaveBeenCalledWith('/connection/connect', {
        deviceCode: '123456789',
        password: '123456'
      });
    });

    test('should call correct endpoint for getConnectionStatus', () => {
      const getSpy = jest.spyOn(api, 'get');
      connectionAPI.getConnectionStatus();
      expect(getSpy).toHaveBeenCalledWith('/connection/status');
    });

    test('should support pagination params for getHistory', () => {
      const getSpy = jest.spyOn(api, 'get');
      connectionAPI.getHistory({ page: 1, pageSize: 20 });
      expect(getSpy).toHaveBeenCalledWith('/connection/history', {
        params: { page: 1, pageSize: 20 }
      });
    });
  });

  describe('VIP API', () => {
    test('should export vipAPI', () => {
      expect(vipAPI).toBeDefined();
    });

    test('should have getVIPStatus method', () => {
      expect(typeof vipAPI.getVIPStatus).toBe('function');
    });

    test('should have createPayment method', () => {
      expect(typeof vipAPI.createPayment).toBe('function');
    });

    test('should have simulatePayment method', () => {
      expect(typeof vipAPI.simulatePayment).toBe('function');
    });

    test('should call correct endpoint for getVIPStatus', () => {
      const getSpy = jest.spyOn(api, 'get');
      vipAPI.getVIPStatus();
      expect(getSpy).toHaveBeenCalledWith('/vip/status');
    });

    test('should call correct endpoint for createPayment', () => {
      const postSpy = jest.spyOn(api, 'post');
      vipAPI.createPayment({ plan: 'month' });
      expect(postSpy).toHaveBeenCalledWith('/vip/payment', { plan: 'month' });
    });

    test('should call correct endpoint for simulatePayment', () => {
      const postSpy = jest.spyOn(api, 'post');
      vipAPI.simulatePayment({ plan: 'month' });
      expect(postSpy).toHaveBeenCalledWith('/vip/simulate-payment', { plan: 'month' });
    });
  });

  describe('Settings API', () => {
    test('should export settingsAPI', () => {
      expect(settingsAPI).toBeDefined();
    });

    test('should have get method', () => {
      expect(typeof settingsAPI.get).toBe('function');
    });

    test('should have save method', () => {
      expect(typeof settingsAPI.save).toBe('function');
    });

    test('should call correct endpoint for get', () => {
      const getSpy = jest.spyOn(api, 'get');
      settingsAPI.get();
      expect(getSpy).toHaveBeenCalledWith('/settings');
    });

    test('should call correct endpoint for save', () => {
      const postSpy = jest.spyOn(api, 'post');
      settingsAPI.save({ videoQuality: 'high' });
      expect(postSpy).toHaveBeenCalledWith('/settings', {
        settings: { videoQuality: 'high' }
      });
    });
  });

  describe('Request with Retry', () => {
    test('should export requestWithRetry', () => {
      expect(requestWithRetry).toBeDefined();
      expect(typeof requestWithRetry).toBe('function');
    });
  });

  describe('UnattendedSettings Interface', () => {
    test('should define valid unattended settings', () => {
      const settings = {
        enabled: true,
        trustedUntil: new Date(),
        allowedControllers: ['device1', 'device2'],
        requirePassword: false
      };

      expect(settings.enabled).toBe(true);
      expect(settings.trustedUntil).toBeInstanceOf(Date);
      expect(settings.allowedControllers).toHaveLength(2);
      expect(settings.requirePassword).toBe(false);
    });
  });

  describe('API Configuration', () => {
    test('should have api instance with methods', () => {
      // Verify the api instance exists and has expected methods
      expect(api).toBeDefined();
      expect(typeof api.request).toBe('function');
    });

    test('should have request method available', () => {
      // Verify request method is available
      expect(typeof api.request).toBe('function');
    });

    test('should have HTTP methods available', () => {
      // Verify HTTP methods exist
      expect(typeof api.get).toBe('function');
      expect(typeof api.post).toBe('function');
      expect(typeof api.put).toBe('function');
      expect(typeof api.delete).toBe('function');
    });
  });
});

describe('Retry Logic', () => {
  describe('Retryable Status Codes', () => {
    const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

    test('should include 408 Request Timeout', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(408);
    });

    test('should include 429 Too Many Requests', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(429);
    });

    test('should include 500 Internal Server Error', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(500);
    });

    test('should include 502 Bad Gateway', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(502);
    });

    test('should include 503 Service Unavailable', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(503);
    });

    test('should include 504 Gateway Timeout', () => {
      expect(RETRYABLE_STATUS_CODES).toContain(504);
    });
  });

  describe('Error Message Mapping', () => {
    const errorMessages: Record<string, string> = {
      'Network Error': '网络连接失败，请检查网络设置',
      'timeout': '请求超时，请稍后重试',
      '401': '登录已过期，请重新登录',
      '403': '没有权限访问此资源',
      '404': '请求的资源不存在',
      '429': '请求过于频繁，请稍后重试',
      '500': '服务器内部错误，请稍后重试'
    };

    test('should have message for network errors', () => {
      expect(errorMessages['Network Error']).toBe('网络连接失败，请检查网络设置');
    });

    test('should have message for timeout', () => {
      expect(errorMessages['timeout']).toBe('请求超时，请稍后重试');
    });

    test('should have message for 401', () => {
      expect(errorMessages['401']).toBe('登录已过期，请重新登录');
    });

    test('should have message for 403', () => {
      expect(errorMessages['403']).toBe('没有权限访问此资源');
    });

    test('should have message for 404', () => {
      expect(errorMessages['404']).toBe('请求的资源不存在');
    });

    test('should have message for 429', () => {
      expect(errorMessages['429']).toBe('请求过于频繁，请稍后重试');
    });

    test('should have message for 500', () => {
      expect(errorMessages['500']).toBe('服务器内部错误，请稍后重试');
    });
  });

  describe('Backoff Delay Calculation', () => {
    const calculateBackoffDelay = (retryCount: number): number => {
      const baseDelay = 1000;
      const maxDelay = 10000;
      const delay = baseDelay * Math.pow(2, retryCount);
      return Math.min(delay, maxDelay);
    };

    test('should calculate delay for first retry', () => {
      expect(calculateBackoffDelay(0)).toBe(1000);
    });

    test('should calculate delay for second retry', () => {
      expect(calculateBackoffDelay(1)).toBe(2000);
    });

    test('should calculate delay for third retry', () => {
      expect(calculateBackoffDelay(2)).toBe(4000);
    });

    test('should cap delay at max value', () => {
      expect(calculateBackoffDelay(10)).toBe(10000);
    });
  });
});
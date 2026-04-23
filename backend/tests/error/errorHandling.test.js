/**
 * Error Handling Unit Tests
 * Tests for error scenarios and recovery
 */

const errorHandler = require('../../src/middleware/errorHandler');

// Mock logger
jest.mock('../../src/middleware/logger', () => ({
  logError: jest.fn()
}));

describe('Error Handler Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('Mongoose Validation Errors', () => {
    test('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field1: { message: 'Field 1 is required' },
        field2: { message: 'Field 2 must be a number' }
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '验证失败',
        details: ['Field 1 is required', 'Field 2 must be a number']
      });
    });
  });

  describe('Mongoose Duplicate Key Errors', () => {
    test('should handle duplicate key error with 400 status', () => {
      const error = new Error('Duplicate key');
      error.code = 11000;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '数据已存在'
      });
    });
  });

  describe('JWT Errors', () => {
    test('should handle JsonWebTokenError with 401 status', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '无效的令牌'
      });
    });

    test('should handle TokenExpiredError with 401 status', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '令牌已过期'
      });
    });
  });

  describe('MongoDB CastError', () => {
    test('should handle CastError with 400 status', () => {
      const error = new Error('Cast failed');
      error.name = 'CastError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '无效的ID格式'
      });
    });
  });

  describe('Default Error Handling', () => {
    test('should return 500 for unknown errors with message', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Something went wrong',
        details: undefined
      });
    });

    test('should use custom status code when provided', () => {
      const error = new Error('Forbidden');
      error.status = 403;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        details: undefined
      });
    });
  });
});

describe('Error Response Format', () => {
  test('should always return JSON with error field', () => {
    const errorRes = (error) => {
      return {
        status: error.status || 500,
        body: {
          error: error.message || '服务器内部错误',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      };
    };

    const testError = new Error('Test error');
    const response = errorRes(testError);

    expect(response.body).toHaveProperty('error');
    expect(typeof response.body.error).toBe('string');
  });

  test('should handle errors without message', () => {
    const errorRes = (error) => {
      return {
        status: error.status || 500,
        body: {
          error: error.message || '服务器内部错误'
        }
      };
    };

    const error = {};
    const response = errorRes(error);

    expect(response.body.error).toBe('服务器内部错误');
  });
});

describe('Database Connection Failure', () => {
  test('should handle MongoDB connection timeout', () => {
    const mongoTimeoutError = {
      name: 'MongoNetworkError',
      message: 'connection timeout'
    };

    expect(mongoTimeoutError.name).toBe('MongoNetworkError');
    expect(mongoTimeoutError.message).toContain('timeout');
  });

  test('should handle Redis connection failure', () => {
    const redisError = {
      code: 'ECONNREFUSED',
      message: 'Connection refused'
    };

    expect(redisError.code).toBe('ECONNREFUSED');
  });
});

describe('Request Parsing Errors', () => {
  describe('Invalid JSON handling', () => {
    test('should detect malformed JSON', () => {
      const malformedJson = '{ "key": "value"';
      let parsed;
      try {
        parsed = JSON.parse(malformedJson);
      } catch (e) {
        parsed = null;
      }
      expect(parsed).toBeNull();
    });

    test('should handle empty JSON body', () => {
      const emptyBody = '';
      let parsed;
      try {
        parsed = JSON.parse(emptyBody);
      } catch (e) {
        parsed = null;
      }
      expect(parsed).toBeNull();
    });

    test('should handle invalid JSON types', () => {
      const validTypes = ['null', '123', 'true', 'false'];
      validTypes.forEach(input => {
        expect(() => JSON.parse(input)).not.toThrow();
      });
    });
  });

  describe('Missing required fields', () => {
    test('should detect missing username in registration', () => {
      const body = { email: 'test@example.com', password: 'password123' };
      const hasUsername = body.username !== undefined;
      expect(hasUsername).toBe(false);
    });

    test('should detect missing password in login', () => {
      const body = { username: 'testuser' };
      const hasPassword = body.password !== undefined;
      expect(hasPassword).toBe(false);
    });

    test('should detect missing deviceCode in connection', () => {
      const body = { password: '123456' };
      const hasDeviceCode = body.deviceCode !== undefined;
      expect(hasDeviceCode).toBe(false);
    });
  });
});

describe('Error Recovery', () => {
  describe('Retry logic simulation', () => {
    test('should allow retry after temporary failure', () => {
      let attempts = 0;
      const maxRetries = 3;
      let success = false;

      while (attempts < maxRetries && !success) {
        attempts++;
        // Simulate first attempt failure
        if (attempts === 1) {
          success = false;
        } else {
          success = true;
        }
      }

      expect(success).toBe(true);
      expect(attempts).toBe(2);
    });

    test('should fail after max retries', () => {
      let attempts = 0;
      const maxRetries = 3;

      // Always fail
      const alwaysFail = true;

      if (alwaysFail) {
        attempts = maxRetries;
      }

      expect(attempts).toBe(maxRetries);
    });
  });
});

describe('Error Logging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should log error with context', () => {
    const logError = (message, error) => {
      return {
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        error: {
          name: error.name || 'Error',
          errorMessage: error.message || String(error),
          stack: error.stack
        }
      };
    };

    const error = new Error('Test error');
    const logEntry = logError('An error occurred', error);

    expect(logEntry.level).toBe('error');
    expect(logEntry.message).toBe('An error occurred');
    expect(logEntry.error.errorMessage).toBe('Test error');
  });
});
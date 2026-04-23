/**
 * Error Handler Middleware Unit Tests
 * Tests for unified error handling
 */

// Mock logger
jest.mock('../../../src/middleware/logger', () => ({
  logError: jest.fn(),
  formatLog: jest.fn().mockReturnValue('mock log entry')
}));

const errorHandler = require('../../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  const mockReq = {};
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRes.status.mockReturnThis();
    mockRes.json.mockClear();
  });

  describe('Mongoose Validation Error', () => {
    test('should handle ValidationError with field messages', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        username: { message: 'Username is required' },
        email: { message: 'Email must be valid' }
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '验证失败',
        details: expect.arrayContaining(['Username is required'])
      });
    });

    test('should handle empty errors object', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {};

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '验证失败',
        details: []
      });
    });
  });

  describe('Mongoose Duplicate Key Error', () => {
    test('should handle duplicate key error', () => {
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
    test('should handle JsonWebTokenError', () => {
      const error = new Error('invalid signature');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '无效的令牌'
      });
    });

    test('should handle TokenExpiredError', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: '令牌已过期'
      });
    });
  });

  describe('MongoDB CastError', () => {
    test('should handle CastError for invalid ObjectId', () => {
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
    test('should use error status if provided', () => {
      const error = new Error('Custom error');
      error.status = 403;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('should default to 500 for unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    test('should use error message in response', () => {
      const error = new Error('Custom error message');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Custom error message'
        })
      );
    });

    test('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.any(String)
        })
      );
      process.env.NODE_ENV = 'test';
    });

    test('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          details: expect.anything()
        })
      );
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Error Logging', () => {
    test('should log all errors', () => {
      const { logError } = require('../../../src/middleware/logger');
      const error = new Error('Test error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(logError).toHaveBeenCalledWith('未处理的错误', error);
    });
  });
});

describe('Error Handler Edge Cases', () => {
  const mockReq = {};
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const mockNext = jest.fn();

  test('should handle null error message', () => {
    const error = new Error();
    error.message = '';

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('should handle undefined error message', () => {
    const error = new Error();
    delete error.message;

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  test('should handle circular reference in error', () => {
    const error = new Error('Circular');
    error.self = error;

    // Should not throw
    expect(() => {
      errorHandler(error, mockReq, mockRes, mockNext);
    }).not.toThrow();
  });

  test('should handle error with null name', () => {
    const error = new Error('Test');
    error.name = null;

    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
  });
});
/**
 * Auth Middleware Unit Tests
 * Tests for authentication middleware with valid/invalid tokens
 */

const jwt = require('jsonwebtoken');

// Set environment variable before requiring module
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

// Helper function to build mock req/res/next
const mockReqRes = (authHeader) => ({
  req: {
    header: jest.fn().mockReturnValue(authHeader),
    cookies: {},
    signedCookies: {},
    query: {}
  },
  res: {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  },
  next: jest.fn()
});

// Import auth middleware - mock logger to avoid errors
jest.mock('../src/middleware/logger', () => ({
  logError: jest.fn()
}));

const authMiddleware = require('../src/middleware/auth');
const { optionalAuthMiddleware } = require('../src/middleware/auth');

describe('authMiddleware (Required Authentication)', () => {
  describe('Token Extraction from Headers', () => {
    test('should extract token from Authorization header with Bearer prefix', () => {
      const token = jwt.sign({ userId: 'u1' }, process.env.JWT_SECRET);
      const { req, res, next } = mockReqRes(`Bearer ${token}`);
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBe('u1');
    });

    test('should reject request without Authorization header', () => {
      const { req, res, next } = mockReqRes(undefined);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: '未提供认证令牌' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request with empty Authorization header', () => {
      const { req, res, next } = mockReqRes('');
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Token Validation', () => {
    test('should reject invalid token format', () => {
      const { req, res, next } = mockReqRes('Bearer invalid.token.string');
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: '无效的认证令牌' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject expired token', () => {
      const token = jwt.sign(
        { userId: 'u1' },
        process.env.JWT_SECRET,
        { expiresIn: -1 }
      );
      const { req, res, next } = mockReqRes(`Bearer ${token}`);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject token with wrong secret', () => {
      const token = jwt.sign({ userId: 'u1' }, 'wrong-secret');
      const { req, res, next } = mockReqRes(`Bearer ${token}`);
      authMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token Handling', () => {
    test('should accept valid token and set userId', () => {
      const token = jwt.sign(
        { userId: 'user-abc-123' },
        process.env.JWT_SECRET
      );
      const { req, res, next } = mockReqRes(`Bearer ${token}`);
      authMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBe('user-abc-123');
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle different user formats', () => {
      const testUsers = ['user123', 'u_123', 'U123', '123456'];
      testUsers.forEach(userId => {
        const token = jwt.sign({ userId }, process.env.JWT_SECRET);
        const { req, res, next } = mockReqRes(`Bearer ${token}`);
        authMiddleware(req, res, next);
        expect(req.userId).toBe(userId);
      });
    });
  });
});

describe('optionalAuthMiddleware (Optional Authentication)', () => {
  describe('Missing Token Handling', () => {
    test('should call next without userId when no token provided', () => {
      const { req, res, next } = mockReqRes(undefined);
      optionalAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBeUndefined();
    });

    test('should not block request when Authorization header is missing', () => {
      const { req, res, next } = mockReqRes(undefined);
      optionalAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Valid Token Handling', () => {
    test('should set userId when valid token provided', () => {
      const token = jwt.sign({ userId: 'opt-user' }, process.env.JWT_SECRET);
      const { req, res, next } = mockReqRes(`Bearer ${token}`);
      optionalAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBe('opt-user');
    });

    test('should not return error for invalid token (allows anonymous access)', () => {
      const { req, res, next } = mockReqRes('Bearer totally.wrong.token');
      optionalAuthMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

describe('Security Considerations', () => {
  test('should reject tokens with extra parts', () => {
    const token = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET);
    const manipulatedToken = `${token}.extra`;
    const { req, res, next } = mockReqRes(`Bearer ${manipulatedToken}`);
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
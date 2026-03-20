/**
 * 认证中间件单元测试
 * 覆盖：无 token / 无效 token / 有效 token / optionalAuth 三种场景
 */

const jwt = require('jsonwebtoken');

// 在 require 模块前设置环境变量
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests';

const authMiddleware = require('../src/middleware/auth');
const { optionalAuthMiddleware } = require('../src/middleware/auth');

// 构建 mock req/res/next 的辅助函数
const mockReqRes = (authHeader) => ({
  req: { header: jest.fn().mockReturnValue(authHeader) },
  res: { status: jest.fn().mockReturnThis(), json: jest.fn() },
  next: jest.fn()
});

describe('authMiddleware（强制认证）', () => {
  test('无 Authorization 头时返回 401', () => {
    const { req, res, next } = mockReqRes(undefined);
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '未提供认证令牌' });
    expect(next).not.toHaveBeenCalled();
  });

  test('无效 token 时返回 401', () => {
    const { req, res, next } = mockReqRes('Bearer invalid.token.string');
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: '无效的认证令牌' });
    expect(next).not.toHaveBeenCalled();
  });

  test('过期 token 时返回 401', () => {
    const token = jwt.sign({ userId: 'u1' }, 'test-secret-key-for-unit-tests', { expiresIn: -1 });
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    authMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('有效 token 时设置 req.userId 并调用 next', () => {
    const token = jwt.sign({ userId: 'user-abc-123' }, 'test-secret-key-for-unit-tests');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('user-abc-123');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('Bearer 前缀被正确去除', () => {
    const token = jwt.sign({ userId: 'u2' }, 'test-secret-key-for-unit-tests');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware（可选认证）', () => {
  test('无 token 时仍调用 next，不设置 userId', () => {
    const { req, res, next } = mockReqRes(undefined);
    optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBeUndefined();
  });

  test('有效 token 时设置 userId 并调用 next', () => {
    const token = jwt.sign({ userId: 'opt-user' }, 'test-secret-key-for-unit-tests');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe('opt-user');
  });

  test('无效 token 时仍调用 next（不阻断请求）', () => {
    const { req, res, next } = mockReqRes('Bearer totally.wrong.token');
    optionalAuthMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    // 不应返回 401
    expect(res.status).not.toHaveBeenCalled();
  });
});

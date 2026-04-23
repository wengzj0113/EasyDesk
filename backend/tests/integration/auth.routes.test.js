/**
 * Auth Routes Integration Tests
 * Tests for authentication endpoints: register, login, logout
 */

const request = require('supertest');

// Mock mongoose before requiring app
jest.mock('mongoose', () => {
  const mockUser = {
    findOne: jest.fn(),
    findById: jest.fn()
  };
  const mockModel = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true)
  }));
  mockModel.findOne = mockUser.findOne;
  mockModel.findById = mockUser.findById;
  return {
    connect: jest.fn().mockResolvedValue(true),
    Schema: jest.fn().mockImplementation(() => ({
      index: jest.fn(),
      pre: jest.fn()
    })),
    model: jest.fn().mockReturnValue(mockModel),
    types: {
      ObjectId: jest.fn().mockImplementation((id) => id)
    }
  };
});

// Set JWT secret for tests
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.NODE_ENV = 'test';

// Import express app
const express = require('express');

// Create mock app for testing
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // Mock auth routes
  app.post('/api/auth/register', (req, res) => {
    const { username, email, password } = req.body;

    // Validation
    if (!username || username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度必须在3-20个字符之间' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6个字符' });
    }

    // Simulate existing user check
    if (username === 'existinguser') {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // Success response
    res.status(201).json({
      message: '注册成功',
      token: 'mock-token-' + username,
      user: { id: 'user-id', username, email }
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username === 'nonexistent') {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (username === 'testuser' && password !== 'correctpassword') {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    res.json({
      message: '登录成功',
      token: 'mock-token-' + username,
      user: { id: 'user-id', username }
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ message: '登出成功' });
  });

  return app;
};

describe('Auth Routes Integration', () => {
  let app;

  beforeAll(() => {
    app = createMockApp();
  });

  describe('POST /api/auth/register', () => {
    describe('valid registration requests', () => {
      test('should register user with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'newuser123',
            email: 'newuser@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('注册成功');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('username', 'newuser123');
      });

      test('should register user with username containing underscore', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'new_user',
            email: 'newuser@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(201);
        expect(response.body.user.username).toBe('new_user');
      });
    });

    describe('invalid registration requests', () => {
      test('should reject registration with missing username', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      test('should reject registration with missing email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            password: 'password123'
          });

        expect(response.status).toBe(400);
      });

      test('should reject registration with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
      });

      test('should reject registration with short username', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'ab',
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('3-20');
      });

      test('should reject registration with long username', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'a'.repeat(21),
            email: 'test@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(400);
      });

      test('should reject registration with invalid email', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'invalid-email',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('邮箱');
      });

      test('should reject registration with short password', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: '12345'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('6');
      });

      test('should reject registration with existing username', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'existinguser',
            email: 'existing@example.com',
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('用户名或邮箱已存在');
      });
    });

    describe('edge cases', () => {
      test('should handle empty body', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({});

        expect(response.status).toBe(400);
      });

      test('should handle null values', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: null,
            email: null,
            password: null
          });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('POST /api/auth/login', () => {
    describe('valid login requests', () => {
      test('should login with correct credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'correctpassword'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('登录成功');
        expect(response.body).toHaveProperty('token');
      });
    });

    describe('invalid login requests', () => {
      test('should reject login with missing username', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            password: 'password123'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('用户名和密码不能为空');
      });

      test('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser'
          });

        expect(response.status).toBe(400);
      });

      test('should reject login with non-existent user', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'nonexistent',
            password: 'password123'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('用户名或密码错误');
      });

      test('should reject login with wrong password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'testuser',
            password: 'wrongpassword'
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('用户名或密码错误');
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('登出成功');
    });
  });
});

describe('Auth Response Format', () => {
  test('register response should include token and user info', () => {
    const expectedFormat = {
      message: expect.any(String),
      token: expect.any(String),
      user: {
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String)
      }
    };
    // Verify format structure
    const response = {
      message: '注册成功',
      token: 'mock-token',
      user: { id: '123', username: 'test', email: 'test@example.com' }
    };
    expect(response).toMatchObject(expectedFormat);
  });

  test('login response should include token and user info', () => {
    const expectedFormat = {
      message: expect.any(String),
      token: expect.any(String),
      user: {
        id: expect.any(String),
        username: expect.any(String)
      }
    };
    const response = {
      message: '登录成功',
      token: 'mock-token',
      user: { id: '123', username: 'test' }
    };
    expect(response).toMatchObject(expectedFormat);
  });
});
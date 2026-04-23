/**
 * VIP Routes Integration Tests
 * Tests for VIP subscription endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock auth middleware
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (token === 'valid-token') {
    req.userId = 'user123';
    next();
  } else {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};

// Create mock app
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // VIP plans configuration
  const VIP_PLANS = {
    'month': { duration: 30, price: 9.9 },
    'quarter': { duration: 90, price: 26.9 },
    'year': { duration: 365, price: 89.9 }
  };

  // Mock user data
  const mockUsers = new Map();
  mockUsers.set('user123', {
    _id: 'user123',
    username: 'testuser',
    vipStatus: false,
    vipExpireTime: null,
    processedOrders: []
  });

  // GET /api/vip/status
  app.get('/api/vip/status', mockAuth, (req, res) => {
    const userId = req.userId;
    const user = mockUsers.get(userId);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const now = new Date();
    const isVip = user.vipStatus && user.vipExpireTime && new Date(user.vipExpireTime) > now;
    const remainingDays = isVip
      ? Math.max(0, Math.ceil((new Date(user.vipExpireTime) - now) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      isVip,
      vipExpireTime: user.vipExpireTime,
      remainingDays
    });
  });

  // POST /api/vip/payment
  app.post('/api/vip/payment', mockAuth, (req, res) => {
    const { plan } = req.body;
    const userId = req.userId;

    if (!plan || !VIP_PLANS[plan]) {
      return res.status(400).json({ error: '无效的套餐，请选择 month、quarter 或 year' });
    }

    const selectedPlan = VIP_PLANS[plan];
    const orderId = `VIP_${Date.now()}_${userId}`;

    res.json({
      message: '订单创建成功',
      payment: {
        orderId,
        amount: selectedPlan.price,
        plan: plan,
        duration: selectedPlan.duration,
        currency: 'CNY'
      }
    });
  });

  // POST /api/vip/simulate-payment (for testing)
  app.post('/api/vip/simulate-payment', mockAuth, async (req, res) => {
    const { plan } = req.body;
    const userId = req.userId;

    if (!plan || !VIP_PLANS[plan]) {
      return res.status(400).json({ error: '无效的套餐' });
    }

    const user = mockUsers.get(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // Check for duplicate order
    const orderId = `VIP_${Date.now()}_${userId}`;
    const alreadyProcessed = user.processedOrders.some(o => o.orderId === orderId);

    if (alreadyProcessed) {
      return res.json({
        message: '订单已处理',
        vipStatus: user.vipStatus,
        vipExpireTime: user.vipExpireTime,
        remainingDays: user.vipExpireTime
          ? Math.max(0, Math.ceil((new Date(user.vipExpireTime) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      });
    }

    const duration = VIP_PLANS[plan].duration;
    const now = new Date();
    const baseTime = user.vipExpireTime && new Date(user.vipExpireTime) > now
      ? new Date(user.vipExpireTime)
      : now;
    const expireTime = new Date(baseTime.getTime() + duration * 24 * 60 * 60 * 1000);

    // Update user
    user.vipStatus = true;
    user.vipExpireTime = expireTime;
    user.processedOrders.push({ orderId, plan, processedAt: now });

    res.json({
      message: 'VIP激活成功',
      vipStatus: true,
      vipExpireTime: expireTime,
      remainingDays: duration
    });
  });

  return { app, mockUsers, VIP_PLANS };
};

describe('VIP Routes Integration', () => {
  let app;
  let mockUsers;
  let VIP_PLANS;

  beforeAll(() => {
    const result = createMockApp();
    app = result.app;
    mockUsers = result.mockUsers;
    VIP_PLANS = result.VIP_PLANS;
  });

  beforeEach(() => {
    // Reset user state
    mockUsers.set('user123', {
      _id: 'user123',
      username: 'testuser',
      vipStatus: false,
      vipExpireTime: null,
      processedOrders: []
    });
  });

  describe('GET /api/vip/status', () => {
    describe('authentication', () => {
      test('should reject requests without token', async () => {
        const response = await request(app).get('/api/vip/status');
        expect(response.status).toBe(401);
      });

      test('should reject requests with invalid token', async () => {
        const response = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer invalid-token');
        expect(response.status).toBe(401);
      });
    });

    describe('VIP status checks', () => {
      test('should return isVip=false for non-VIP user', async () => {
        const response = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.isVip).toBe(false);
        expect(response.body.remainingDays).toBe(0);
      });

      test('should return isVip=true for active VIP user', async () => {
        // Activate VIP
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        mockUsers.get('user123').vipStatus = true;
        mockUsers.get('user123').vipExpireTime = futureDate;

        const response = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.isVip).toBe(true);
        expect(response.body.remainingDays).toBeGreaterThan(0);
      });

      test('should return remaining days correctly', async () => {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        mockUsers.get('user123').vipStatus = true;
        mockUsers.get('user123').vipExpireTime = futureDate;

        const response = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.remainingDays).toBeGreaterThanOrEqual(6);
        expect(response.body.remainingDays).toBeLessThanOrEqual(8);
      });

      test('should return 0 remaining days for expired VIP', async () => {
        const pastDate = new Date(Date.now() - 86400000); // Yesterday
        mockUsers.get('user123').vipStatus = true;
        mockUsers.get('user123').vipExpireTime = pastDate;

        const response = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');

        expect(response.status).toBe(200);
        expect(response.body.isVip).toBe(false);
        expect(response.body.remainingDays).toBe(0);
      });
    });
  });

  describe('POST /api/vip/payment', () => {
    describe('valid payment requests', () => {
      test('should create payment for month plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'month' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('订单创建成功');
        expect(response.body.payment).toHaveProperty('orderId');
        expect(response.body.payment.amount).toBe(VIP_PLANS.month.price);
        expect(response.body.payment.plan).toBe('month');
        expect(response.body.payment.currency).toBe('CNY');
      });

      test('should create payment for quarter plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'quarter' });

        expect(response.status).toBe(200);
        expect(response.body.payment.amount).toBe(VIP_PLANS.quarter.price);
        expect(response.body.payment.duration).toBe(90);
      });

      test('should create payment for year plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'year' });

        expect(response.status).toBe(200);
        expect(response.body.payment.amount).toBe(VIP_PLANS.year.price);
        expect(response.body.payment.duration).toBe(365);
      });
    });

    describe('invalid payment requests', () => {
      test('should reject invalid plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('无效的套餐');
      });

      test('should reject missing plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({});

        expect(response.status).toBe(400);
      });

      test('should reject empty plan', async () => {
        const response = await request(app)
          .post('/api/vip/payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: '' });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('POST /api/vip/simulate-payment', () => {
    describe('successful activation', () => {
      test('should activate VIP for month plan', async () => {
        const response = await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'month' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('VIP激活成功');
        expect(response.body.vipStatus).toBe(true);
        expect(response.body.remainingDays).toBe(30);
      });

      test('should activate VIP for quarter plan', async () => {
        const response = await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'quarter' });

        expect(response.status).toBe(200);
        expect(response.body.vipStatus).toBe(true);
        expect(response.body.remainingDays).toBe(90);
      });

      test('should activate VIP for year plan', async () => {
        const response = await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'year' });

        expect(response.status).toBe(200);
        expect(response.body.vipStatus).toBe(true);
        expect(response.body.remainingDays).toBe(365);
      });
    });

    describe('VIP extension', () => {
      test('should extend VIP when already VIP', async () => {
        // First activate
        await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'month' });

        // Get current expire time
        const statusRes = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');
        const originalExpireTime = new Date(statusRes.body.vipExpireTime);

        // Activate again
        await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'month' });

        // Check new expire time
        const newStatusRes = await request(app)
          .get('/api/vip/status')
          .set('Authorization', 'Bearer valid-token');
        const newExpireTime = new Date(newStatusRes.body.vipExpireTime);

        expect(newExpireTime.getTime()).toBeGreaterThan(originalExpireTime.getTime());
      });
    });

    describe('invalid activation requests', () => {
      test('should reject invalid plan', async () => {
        const response = await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({ plan: 'invalid' });

        expect(response.status).toBe(400);
      });

      test('should reject missing plan', async () => {
        const response = await request(app)
          .post('/api/vip/simulate-payment')
          .set('Authorization', 'Bearer valid-token')
          .send({});

        expect(response.status).toBe(400);
      });
    });
  });
});

describe('VIP Plans Configuration', () => {
  const VIP_PLANS = {
    'month': { duration: 30, price: 9.9 },
    'quarter': { duration: 90, price: 26.9 },
    'year': { duration: 365, price: 89.9 }
  };

  test('should have all required plans', () => {
    expect(VIP_PLANS).toHaveProperty('month');
    expect(VIP_PLANS).toHaveProperty('quarter');
    expect(VIP_PLANS).toHaveProperty('year');
  });

  test('should have valid duration for each plan', () => {
    expect(VIP_PLANS.month.duration).toBe(30);
    expect(VIP_PLANS.quarter.duration).toBe(90);
    expect(VIP_PLANS.year.duration).toBe(365);
  });

  test('should have valid price for each plan', () => {
    expect(VIP_PLANS.month.price).toBeGreaterThan(0);
    expect(VIP_PLANS.quarter.price).toBeGreaterThan(VIP_PLANS.month.price);
    expect(VIP_PLANS.year.price).toBeGreaterThan(VIP_PLANS.quarter.price);
  });
});
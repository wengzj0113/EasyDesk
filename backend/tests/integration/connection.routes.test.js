/**
 * Connection Routes Integration Tests
 * Tests for connection management endpoints
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
  } else if (token === 'invalid-token') {
    return res.status(401).json({ error: '无效的认证令牌' });
  } else if (token === 'no-auth') {
    // Allow request without userId
    next();
  } else {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
};

// Create mock app
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // Mock data storage
  const mockConnections = new Map();
  const mockDevices = new Map();
  let connectionIdCounter = 1;

  // Initialize mock device
  mockDevices.set('123456789', {
    deviceCode: '123456789',
    deviceName: 'Test Device',
    platform: 'windows',
    isOnline: true,
    accessPassword: '123456'
  });

  // POST /api/connection/connect
  app.post('/api/connection/connect', (req, res) => {
    const { deviceCode, password } = req.body;
    const userId = req.userId;

    // Validate device code format
    if (!deviceCode || !/^\d{9}$/.test(deviceCode)) {
      return res.status(400).json({ error: '设备码必须是9位数字' });
    }

    // Validate password format
    if (!password || !/^\d{4,6}$/.test(password)) {
      return res.status(400).json({ error: '密码必须是4-6位数字' });
    }

    // Check if device exists
    const targetDevice = mockDevices.get(deviceCode);
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // Verify password
    if (targetDevice.accessPassword !== password) {
      return res.status(401).json({ error: '密码错误' });
    }

    // Check if device is online
    if (!targetDevice.isOnline) {
      return res.status(400).json({ error: '设备不在线' });
    }

    // Create connection
    const connectionId = `conn_${connectionIdCounter++}`;
    const connection = {
      _id: connectionId,
      deviceId: deviceCode,
      userId,
      connectionType: userId ? 'bound' : 'direct',
      status: 'connecting',
      startTime: new Date()
    };
    mockConnections.set(connectionId, connection);

    res.json({
      message: '连接请求已发送',
      connectionId,
      deviceInfo: {
        deviceCode: targetDevice.deviceCode,
        deviceName: targetDevice.deviceName,
        platform: targetDevice.platform
      }
    });
  });

  // POST /api/connection/disconnect
  app.post('/api/connection/disconnect', mockAuth, (req, res) => {
    const { connectionId } = req.body;
    const userId = req.userId;

    if (connectionId) {
      const conn = mockConnections.get(connectionId);
      if (!conn || conn.userId !== userId) {
        return res.status(404).json({ error: '连接不存在' });
      }
      conn.status = 'disconnected';
      conn.endTime = new Date();
      return res.json({ message: '连接已断开' });
    }

    res.json({ message: '连接已断开' });
  });

  // GET /api/connection/status
  app.get('/api/connection/status', mockAuth, (req, res) => {
    const { connectionId } = req.query;
    const userId = req.userId;

    if (connectionId) {
      const conn = mockConnections.get(connectionId);
      if (!conn || conn.userId !== userId) {
        return res.status(400).json({ error: 'ID格式不正确' });
      }
    }

    const connections = Array.from(mockConnections.values())
      .filter(c => c.userId === userId)
      .slice(0, 10);

    res.json({ connections });
  });

  // GET /api/connection/history
  app.get('/api/connection/history', mockAuth, (req, res) => {
    const { page, pageSize, startDate, endDate } = req.query;
    const userId = req.userId;

    const p = parseInt(page) || 1;
    const ps = Math.min(parseInt(pageSize) || 20, 100);

    const allConnections = Array.from(mockConnections.values())
      .filter(c => c.userId === userId);

    let filtered = allConnections;
    if (startDate || endDate) {
      filtered = allConnections.filter(c => {
        const start = startDate ? new Date(startDate) <= c.startTime : true;
        const end = endDate ? new Date(endDate) >= c.startTime : true;
        return start && end;
      });
    }

    const total = filtered.length;
    const paginatedConnections = filtered.slice((p - 1) * ps, p * ps);

    res.json({
      connections: paginatedConnections,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps)
      }
    });
  });

  // GET /api/connection/:connectionId
  app.get('/api/connection/:connectionId', mockAuth, (req, res) => {
    const { connectionId } = req.params;
    const userId = req.userId;

    // Validate ObjectId format
    if (!/^[0-9a-fA-F]{24}$/.test(connectionId)) {
      return res.status(400).json({ error: 'ID格式不正确' });
    }

    const connection = mockConnections.get(connectionId);
    if (!connection || connection.userId !== userId) {
      return res.status(404).json({ error: '连接不存在' });
    }

    res.json({ connection });
  });

  // POST /api/connection/quality
  app.post('/api/connection/quality', mockAuth, (req, res) => {
    const { connectionId, resolution, fps, latency, dataTransferred } = req.body;
    const userId = req.userId;

    // Validate connection ID format
    if (!connectionId || !/^[0-9a-fA-F]{24}$/.test(connectionId)) {
      return res.status(400).json({ error: 'ID格式不正确' });
    }

    const connection = mockConnections.get(connectionId);
    if (!connection || connection.userId !== userId) {
      return res.status(404).json({ error: '连接不存在' });
    }

    connection.quality = { resolution, fps, latency };
    if (dataTransferred) {
      connection.dataTransferred = dataTransferred;
    }

    res.json({ message: '质量信息已更新', connection });
  });

  return { app, mockConnections, mockDevices };
};

describe('Connection Routes Integration', () => {
  let app;
  let mockConnections;
  let mockDevices;

  beforeAll(() => {
    const result = createMockApp();
    app = result.app;
    mockConnections = result.mockConnections;
    mockDevices = result.mockDevices;
  });

  describe('POST /api/connection/connect', () => {
    describe('valid connection requests', () => {
      test('should connect with valid device code and password', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789',
            password: '123456'
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('连接请求已发送');
        expect(response.body).toHaveProperty('connectionId');
        expect(response.body.deviceInfo).toHaveProperty('deviceCode', '123456789');
      });

      test('should return device info on successful connection', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789',
            password: '123456'
          });

        expect(response.body.deviceInfo).toHaveProperty('deviceName', 'Test Device');
        expect(response.body.deviceInfo).toHaveProperty('platform', 'windows');
      });
    });

    describe('invalid connection requests', () => {
      test('should reject connection with invalid device code format', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '12345678',  // 8 digits
            password: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('设备码必须是9位数字');
      });

      test('should reject connection with invalid password format', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789',
            password: '123'  // Only 3 digits - invalid
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('密码必须是4-6位数字');
      });

      test('should reject connection with non-existent device', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '999999999',
            password: '123456'
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('设备不存在');
      });

      test('should reject connection with wrong password', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789',
            password: '654321'  // Wrong password
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('密码错误');
      });

      test('should reject connection to offline device', async () => {
        // Set device offline
        const device = mockDevices.get('123456789');
        const wasOnline = device.isOnline;
        device.isOnline = false;

        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789',
            password: '123456'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('设备不在线');

        // Restore
        device.isOnline = wasOnline;
      });
    });

    describe('edge cases', () => {
      test('should reject connection with missing device code', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            password: '123456'
          });

        expect(response.status).toBe(400);
      });

      test('should reject connection with missing password', async () => {
        const response = await request(app)
          .post('/api/connection/connect')
          .send({
            deviceCode: '123456789'
          });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('POST /api/connection/disconnect', () => {
    test('should disconnect with valid token', async () => {
      // Create a connection directly in mock storage for testing
      const connectionId = 'test_conn_123';
      mockConnections.set(connectionId, {
        _id: connectionId,
        deviceId: '123456789',
        userId: 'user123',
        status: 'connected',
        startTime: new Date()
      });

      const response = await request(app)
        .post('/api/connection/disconnect')
        .set('Authorization', 'Bearer valid-token')
        .send({ connectionId });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('连接已断开');
    });

    test('should reject disconnect without auth', async () => {
      const response = await request(app)
        .post('/api/connection/disconnect')
        .send({});

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/connection/status', () => {
    test('should return connections with valid auth', async () => {
      const response = await request(app)
        .get('/api/connection/status')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connections');
    });

    test('should reject status without auth', async () => {
      const response = await request(app)
        .get('/api/connection/status');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/connection/history', () => {
    test('should return paginated history', async () => {
      const response = await request(app)
        .get('/api/connection/history')
        .set('Authorization', 'Bearer valid-token')
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connections');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('total');
    });

    test('should handle date filtering', async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const response = await request(app)
        .get('/api/connection/history')
        .set('Authorization', 'Bearer valid-token')
        .query({ startDate });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/connection/:connectionId', () => {
    test('should return connection details', async () => {
      // First create a connection
      const connectRes = await request(app)
        .post('/api/connection/connect')
        .send({
          deviceCode: '123456789',
          password: '123456'
        });

      // Create a connection with valid format ID for testing
      mockConnections.set('507f1f77bcf86cd799439011', {
        _id: '507f1f77bcf86cd799439011',
        deviceId: '123456789',
        userId: 'user123',
        status: 'connected',
        startTime: new Date()
      });

      const response = await request(app)
        .get('/api/connection/507f1f77bcf86cd799439011')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connection');
    });

    test('should reject invalid connection ID format', async () => {
      const response = await request(app)
        .get('/api/connection/invalid-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('ID格式不正确');
    });
  });

  describe('POST /api/connection/quality', () => {
    test('should update connection quality', async () => {
      // Create a connection with valid format ID
      mockConnections.set('507f1f77bcf86cd799439012', {
        _id: '507f1f77bcf86cd799439012',
        deviceId: '123456789',
        userId: 'user123',
        status: 'connected'
      });

      const response = await request(app)
        .post('/api/connection/quality')
        .set('Authorization', 'Bearer valid-token')
        .send({
          connectionId: '507f1f77bcf86cd799439012',
          resolution: '1920x1080',
          fps: 60,
          latency: 20,
          dataTransferred: 1024000
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('质量信息已更新');
    });

    test('should reject invalid connection ID for quality update', async () => {
      const response = await request(app)
        .post('/api/connection/quality')
        .set('Authorization', 'Bearer valid-token')
        .send({
          connectionId: 'invalid',
          resolution: '1920x1080',
          fps: 60
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('Connection Validation', () => {
  describe('Device code validation', () => {
    test('should only accept 9-digit codes', () => {
      const valid = '123456789';
      const invalid = ['12345678', '1234567890', '12345678A', ''];

      expect(/^\d{9}$/.test(valid)).toBe(true);
      invalid.forEach(code => {
        expect(/^\d{9}$/.test(code)).toBe(false);
      });
    });
  });

  describe('Password validation', () => {
    test('should accept 4-6 digit passwords', () => {
      const valid = ['1234', '12345', '123456'];
      const invalid = ['123', '1234567', 'abc123', ''];

      valid.forEach(pwd => {
        expect(/^\d{4,6}$/.test(pwd)).toBe(true);
      });

      invalid.forEach(pwd => {
        expect(/^\d{4,6}$/.test(pwd)).toBe(false);
      });
    });
  });
});
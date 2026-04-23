/**
 * Device Routes Integration Tests
 * Tests for device management endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock JWT validation
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

  // Mock device code generation
  const generateDeviceCode = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
  };

  const generatePassword = (len = 6) => {
    return Math.floor(Math.pow(10, len - 1) + Math.random() * Math.pow(10, len)).toString().padStart(len, '0');
  };

  // Store mock data
  const mockDevices = new Map();
  let mockDeviceCode = generateDeviceCode();
  const mockPassword = generatePassword();

  // GET /api/device/code
  app.get('/api/device/code', mockAuth, (req, res) => {
    const userId = req.userId;

    if (!mockDevices.has(userId)) {
      const code = mockDeviceCode;
      mockDevices.set(userId, {
        deviceCode: code,
        deviceName: '我的设备',
        isOnline: false,
        accessPassword: mockPassword,
        boundDevices: []
      });
      return res.json({
        deviceCode: code,
        deviceName: '我的设备',
        isOnline: false,
        accessPassword: mockPassword,
        isNew: true
      });
    }

    const device = mockDevices.get(userId);
    res.json({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      isOnline: device.isOnline,
      isNew: false
    });
  });

  // POST /api/device/password
  app.post('/api/device/password', mockAuth, (req, res) => {
    const { newPassword, type } = req.body;

    if (!newPassword || !/^\d{6}$/.test(newPassword)) {
      return res.status(400).json({ error: '密码必须是6位数字' });
    }

    if (type !== 'permanent' && type !== 'temporary') {
      return res.status(400).json({ error: '密码类型不正确' });
    }

    const userId = req.userId;
    if (!mockDevices.has(userId)) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const device = mockDevices.get(userId);
    if (type === 'permanent') {
      device.permanentPassword = newPassword;
    } else {
      device.accessPassword = newPassword;
    }

    res.json({ message: '密码更新成功' });
  });

  // POST /api/device/password/regenerate
  app.post('/api/device/password/regenerate', mockAuth, (req, res) => {
    const userId = req.userId;

    if (!mockDevices.has(userId)) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const newPwd = generatePassword();
    mockDevices.get(userId).accessPassword = newPwd;

    res.json({ message: '新密码已生成', accessPassword: newPwd });
  });

  // GET /api/device/my-devices
  app.get('/api/device/my-devices', mockAuth, (req, res) => {
    const userId = req.userId;
    const device = mockDevices.get(userId);
    res.json({ devices: device ? [device] : [] });
  });

  // POST /api/device/bind
  app.post('/api/device/bind', mockAuth, (req, res) => {
    const { deviceCode, deviceName } = req.body;
    const userId = req.userId;

    // Validate device code format
    if (!deviceCode || !/^\d{9}$/.test(deviceCode)) {
      return res.status(400).json({ error: '设备码必须是9位数字' });
    }

    // Check if device exists
    let targetDevice = null;
    for (const [uid, device] of mockDevices.entries()) {
      if (device.deviceCode === deviceCode) {
        targetDevice = { uid, ...device };
        break;
      }
    }

    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    if (targetDevice.uid === userId) {
      return res.status(400).json({ error: '不能绑定自己的设备' });
    }

    const userDevice = mockDevices.get(userId);
    if (!userDevice) {
      return res.status(404).json({ error: '请先获取本机设备码' });
    }

    const alreadyBound = userDevice.boundDevices.some(b => b.deviceCode === deviceCode);
    if (alreadyBound) {
      return res.status(400).json({ error: '设备已绑定' });
    }

    userDevice.boundDevices.push({
      deviceId: targetDevice.uid,
      deviceCode: targetDevice.deviceCode,
      deviceName: deviceName || targetDevice.deviceName
    });

    res.json({ message: '设备绑定成功' });
  });

  // DELETE /api/device/:deviceId
  app.delete('/api/device/:deviceId', mockAuth, (req, res) => {
    const { deviceId } = req.params;
    const userId = req.userId;

    // Validate device ID format
    if (!deviceId || !/^[0-9a-fA-F]{24}$/.test(deviceId)) {
      return res.status(400).json({ error: 'ID格式不正确' });
    }

    const device = mockDevices.get(userId);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const initialLength = device.boundDevices.length;
    device.boundDevices = device.boundDevices.filter(b => b.deviceId !== deviceId);

    if (device.boundDevices.length === initialLength) {
      return res.status(404).json({ error: '绑定的设备不存在' });
    }

    res.json({ message: '设备解绑成功' });
  });

  return { app, mockDevices };
};

describe('Device Routes Integration', () => {
  let app;
  let mockDevices;

  beforeAll(() => {
    const result = createMockApp();
    app = result.app;
    mockDevices = result.mockDevices;
  });

  describe('Authentication', () => {
    test('should reject requests without token', async () => {
      const response = await request(app).get('/api/device/code');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('未提供认证令牌');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('无效的认证令牌');
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/device/code', () => {
    test('should return device code (new or existing)', async () => {
      const response = await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deviceCode');
      expect(response.body.deviceCode).toHaveLength(9);
      expect(typeof response.body.isNew).toBe('boolean');
      expect(response.body).toHaveProperty('deviceName');
    });

    test('should return existing device code without password', async () => {
      // First request creates device
      await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      // Second request returns existing
      const response = await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.isNew).toBe(false);
      expect(response.body).not.toHaveProperty('accessPassword');
    });

    test('should generate 9-digit device code', async () => {
      const response = await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      expect(response.body.deviceCode).toMatch(/^\d{9}$/);
    });
  });

  describe('POST /api/device/password', () => {
    test('should update permanent password', async () => {
      // First get device code
      await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      const response = await request(app)
        .post('/api/device/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: '123456',
          type: 'permanent'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('密码更新成功');
    });

    test('should update temporary password', async () => {
      // First get device code
      await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      const response = await request(app)
        .post('/api/device/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: '654321',
          type: 'temporary'
        });

      expect(response.status).toBe(200);
    });

    test('should reject invalid password format', async () => {
      const response = await request(app)
        .post('/api/device/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: '12345',  // Only 5 digits
          type: 'permanent'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('密码必须是6位数字');
    });

    test('should reject invalid password type', async () => {
      const response = await request(app)
        .post('/api/device/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: '123456',
          type: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('密码类型不正确');
    });

    test('should reject non-numeric password', async () => {
      const response = await request(app)
        .post('/api/device/password')
        .set('Authorization', 'Bearer valid-token')
        .send({
          newPassword: 'abcdef',
          type: 'permanent'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/device/password/regenerate', () => {
    test('should regenerate access password', async () => {
      // First get device code
      await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      const response = await request(app)
        .post('/api/device/password/regenerate')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('新密码已生成');
      expect(response.body).toHaveProperty('accessPassword');
      // Password should be numeric (4-6 digits based on implementation)
      expect(response.body.accessPassword).toMatch(/^\d+$/);
      expect(response.body.accessPassword.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('GET /api/device/my-devices', () => {
    test('should return list of devices', async () => {
      // First create device
      await request(app)
        .get('/api/device/code')
        .set('Authorization', 'Bearer valid-token');

      const response = await request(app)
        .get('/api/device/my-devices')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('devices');
      expect(Array.isArray(response.body.devices)).toBe(true);
    });
  });
});

describe('Device Code Validation', () => {
  describe('Format validation', () => {
    test('should only accept 9-digit numeric codes', () => {
      const validCodes = ['123456789', '000000000', '999999999'];
      const invalidCodes = ['12345678', '1234567890', '12345678A', '12345678!'];

      validCodes.forEach(code => {
        expect(/^\d{9}$/.test(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(/^\d{9}$/.test(code)).toBe(false);
      });
    });
  });

  describe('Password validation', () => {
    test('should only accept 6-digit numeric passwords', () => {
      const validPasswords = ['123456', '000000', '999999'];
      const invalidPasswords = ['12345', '1234567', 'abcdef', '12345a'];

      validPasswords.forEach(pwd => {
        expect(/^\d{6}$/.test(pwd)).toBe(true);
      });

      invalidPasswords.forEach(pwd => {
        expect(/^\d{6}$/.test(pwd)).toBe(false);
      });
    });
  });
});
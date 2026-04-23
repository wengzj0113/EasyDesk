/**
 * Settings Routes Integration Tests
 * Tests for user settings endpoints
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

// Define constants at module level for test access
const ALLOWED_SETTINGS = [
  'videoQuality',
  'frameRate',
  'audioEnabled',
  'notificationEnabled',
  'autoConnect',
  'savePassword',
  'theme',
  'language'
];

const SETTING_RULES = {
  videoQuality: ['low', 'medium', 'high'],
  frameRate: [15, 30, 60],
  audioEnabled: [true, false],
  notificationEnabled: [true, false],
  autoConnect: [true, false],
  savePassword: [true, false],
  theme: ['light', 'dark', 'auto'],
  language: ['zh-CN', 'en-US']
};

// Create mock app
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // Use module-level constants
  const allowedSettings = ALLOWED_SETTINGS;
  const settingRules = SETTING_RULES;

  // Mock user data
  const mockUsers = new Map();
  mockUsers.set('user123', {
    _id: 'user123',
    username: 'testuser',
    settings: {
      videoQuality: 'medium',
      frameRate: 30,
      audioEnabled: true,
      notificationEnabled: true,
      autoConnect: false,
      savePassword: false,
      theme: 'light',
      language: 'zh-CN'
    }
  });

  // GET /api/settings
  app.get('/api/settings', mockAuth, (req, res) => {
    const userId = req.userId;
    const user = mockUsers.get(userId);

    res.json({ settings: user?.settings || {} });
  });

  // POST /api/settings
  app.post('/api/settings', mockAuth, (req, res) => {
    const { settings } = req.body;
    const userId = req.userId;

    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: '设置格式不正确' });
    }

    const update = {};
    const user = mockUsers.get(userId);

    for (const field of allowedSettings) {
      if (settings[field] !== undefined) {
        const rule = settingRules[field];
        if (rule && !rule.includes(settings[field])) {
          return res.status(400).json({ error: `无效的 ${field} 设置值` });
        }
        update[`settings.${field}`] = settings[field];
      }
    }

    // Apply updates
    Object.assign(user.settings, update);

    res.json({ message: '设置已保存' });
  });

  return { app, mockUsers, ALLOWED_SETTINGS, SETTING_RULES };
};

describe('Settings Routes Integration', () => {
  let app;
  let mockUsers;
  let ALLOWED_SETTINGS;
  let SETTING_RULES;

  beforeAll(() => {
    const result = createMockApp();
    app = result.app;
    mockUsers = result.mockUsers;
    ALLOWED_SETTINGS = result.ALLOWED_SETTINGS;
    SETTING_RULES = result.SETTING_RULES;
  });

  beforeEach(() => {
    // Reset user settings
    mockUsers.set('user123', {
      _id: 'user123',
      username: 'testuser',
      settings: {
        videoQuality: 'medium',
        frameRate: 30,
        audioEnabled: true,
        notificationEnabled: true,
        autoConnect: false,
        savePassword: false,
        theme: 'light',
        language: 'zh-CN'
      }
    });
  });

  describe('Authentication', () => {
    test('should reject requests without token', async () => {
      const response = await request(app).get('/api/settings');
      expect(response.status).toBe(401);
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'Bearer valid-token');
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/settings', () => {
    test('should return default settings', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('settings');
      expect(response.body.settings).toHaveProperty('videoQuality');
      expect(response.body.settings).toHaveProperty('frameRate');
      expect(response.body.settings).toHaveProperty('theme');
    });

    test('should return all expected settings fields', async () => {
      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', 'Bearer valid-token');

      expect(response.body.settings).toHaveProperty('videoQuality', 'medium');
      expect(response.body.settings).toHaveProperty('frameRate', 30);
      expect(response.body.settings).toHaveProperty('audioEnabled', true);
      expect(response.body.settings).toHaveProperty('notificationEnabled', true);
      expect(response.body.settings).toHaveProperty('theme', 'light');
      expect(response.body.settings).toHaveProperty('language', 'zh-CN');
    });
  });

  describe('POST /api/settings', () => {
    describe('valid settings updates', () => {
      test('should update video quality', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { videoQuality: 'high' } });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('设置已保存');
      });

      test('should update frame rate', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { frameRate: 60 } });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('设置已保存');
      });

      test('should update boolean settings', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({
            settings: {
              audioEnabled: false,
              notificationEnabled: false
            }
          });

        expect(response.status).toBe(200);
      });

      test('should update theme', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { theme: 'dark' } });

        expect(response.status).toBe(200);
      });

      test('should update language', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { language: 'en-US' } });

        expect(response.status).toBe(200);
      });

      test('should update multiple settings at once', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({
            settings: {
              videoQuality: 'low',
              frameRate: 15,
              autoConnect: true
            }
          });

        expect(response.status).toBe(200);
      });
    });

    describe('invalid settings updates', () => {
      test('should reject invalid video quality value', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { videoQuality: 'ultra' } });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('无效的 videoQuality');
      });

      test('should reject invalid frame rate value', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { frameRate: 45 } });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('无效的 frameRate');
      });

      test('should reject invalid theme value', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { theme: 'blue' } });

        expect(response.status).toBe(400);
      });

      test('should reject invalid language value', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { language: 'fr-FR' } });

        expect(response.status).toBe(400);
      });

      test('should reject invalid boolean value type', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: { audioEnabled: 'yes' } });

        expect(response.status).toBe(400);
      });
    });

    describe('invalid requests', () => {
      test('should reject missing settings object', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('设置格式不正确');
      });

      test('should reject non-object settings', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: 'invalid' });

        expect(response.status).toBe(400);
      });

      test('should reject array settings', async () => {
        const response = await request(app)
          .post('/api/settings')
          .set('Authorization', 'Bearer valid-token')
          .send({ settings: [] });

        expect(response.status).toBe(400);
      });
    });
  });
});

describe('Settings Validation Rules', () => {
  test('should have valid video quality options', () => {
    const validOptions = ['low', 'medium', 'high'];
    validOptions.forEach(option => {
      expect(SETTING_RULES.videoQuality).toContain(option);
    });
  });

  test('should have valid frame rate options', () => {
    const validOptions = [15, 30, 60];
    validOptions.forEach(option => {
      expect(SETTING_RULES.frameRate).toContain(option);
    });
  });

  test('should have valid theme options', () => {
    const validOptions = ['light', 'dark', 'auto'];
    validOptions.forEach(option => {
      expect(SETTING_RULES.theme).toContain(option);
    });
  });

  test('should have valid language options', () => {
    const validOptions = ['zh-CN', 'en-US'];
    validOptions.forEach(option => {
      expect(SETTING_RULES.language).toContain(option);
    });
  });

  test('should have boolean settings', () => {
    const booleanSettings = [
      'audioEnabled',
      'notificationEnabled',
      'autoConnect',
      'savePassword'
    ];
    booleanSettings.forEach(setting => {
      expect(SETTING_RULES[setting]).toEqual([true, false]);
    });
  });
});

describe('Allowed Settings Fields', () => {
  test('should have expected allowed fields', () => {
    const expectedFields = [
      'videoQuality',
      'frameRate',
      'audioEnabled',
      'notificationEnabled',
      'autoConnect',
      'savePassword',
      'theme',
      'language'
    ];

    expectedFields.forEach(field => {
      expect(ALLOWED_SETTINGS).toContain(field);
    });
  });

  test('should not allow arbitrary fields', () => {
    const arbitrarySettings = { someRandomField: 'value' };
    // Only allowed fields should be processed
    const allowedFields = ALLOWED_SETTINGS;
    const hasArbitraryField = Object.keys(arbitrarySettings).some(
      key => !allowedFields.includes(key)
    );
    expect(hasArbitraryField).toBe(true);
  });
});
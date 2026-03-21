const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { logError } = require('../middleware/logger');

// 允许的设置字段
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

// 设置值验证规则
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

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    res.json({ settings: user?.settings || {} });
  } catch (error) {
    logError('获取设置失败', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: '设置格式不正确' });
    }

    const update = {};

    for (const field of ALLOWED_SETTINGS) {
      if (settings[field] !== undefined) {
        // 验证设置值
        const rule = SETTING_RULES[field];
        if (rule && !rule.includes(settings[field])) {
          return res.status(400).json({ error: `无效的 ${field} 设置值` });
        }
        update[`settings.${field}`] = settings[field];
      }
    }

    await User.findByIdAndUpdate(req.userId, { $set: update });
    res.json({ message: '设置已保存' });
  } catch (error) {
    logError('保存设置失败', error);
    res.status(500).json({ error: '保存设置失败' });
  }
});

module.exports = router;

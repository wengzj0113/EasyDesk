const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    res.json({ settings: user?.settings || {} });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { settings } = req.body;
    const allowedFields = ['videoQuality', 'frameRate', 'audioEnabled', 'notificationEnabled', 'autoConnect', 'savePassword'];
    const update = {};
    for (const field of allowedFields) {
      if (settings[field] !== undefined) {
        update[`settings.${field}`] = settings[field];
      }
    }
    await User.findByIdAndUpdate(req.userId, { $set: update });
    res.json({ message: '设置已保存' });
  } catch (error) {
    res.status(500).json({ error: '保存设置失败' });
  }
});

module.exports = router;

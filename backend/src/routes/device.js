const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

// 获取设备码
router.get('/code', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // 查找用户现有设备
    let device = await Device.findOne({ userId });

    if (!device) {
      // 创建新设备
      device = new Device({
        userId,
        platform: req.headers['user-agent']?.includes('Windows') ? 'windows' : 'mac',
        accessPassword: Math.random().toString(36).substring(2, 8).toUpperCase()
      });
      await device.save();
    }

    res.json({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      isOnline: device.isOnline
    });
  } catch (error) {
    res.status(500).json({ error: '获取设备码失败', details: error.message });
  }
});

// 更新设备密码
router.post('/password', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword } = req.body;

    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    device.accessPassword = newPassword;
    await device.save();

    res.json({ message: '密码更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新密码失败', details: error.message });
  }
});

// 获取我的设备列表
router.get('/my-devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const devices = await Device.find({ userId })
      .populate('boundDevices.deviceId', 'deviceCode deviceName isOnline')
      .lean();

    res.json({ devices });
  } catch (error) {
    res.status(500).json({ error: '获取设备列表失败', details: error.message });
  }
});

// 绑定设备
router.post('/bind', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceCode, deviceName } = req.body;

    // 查找目标设备
    const targetDevice = await Device.findOne({ deviceCode: deviceCode.toUpperCase() });
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 检查是否已经绑定
    const userDevice = await Device.findOne({ userId });
    const isAlreadyBound = userDevice.boundDevices.some(
      bound => bound.deviceId.toString() === targetDevice._id.toString()
    );

    if (isAlreadyBound) {
      return res.status(400).json({ error: '设备已绑定' });
    }

    // 添加绑定
    userDevice.boundDevices.push({
      deviceId: targetDevice._id,
      deviceName: deviceName || targetDevice.deviceName
    });

    await userDevice.save();

    res.json({ message: '设备绑定成功' });
  } catch (error) {
    res.status(500).json({ error: '绑定设备失败', details: error.message });
  }
});

// 解绑设备
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceId } = req.params;

    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 移除绑定
    device.boundDevices = device.boundDevices.filter(
      bound => bound.deviceId.toString() !== deviceId
    );

    await device.save();

    res.json({ message: '设备解绑成功' });
  } catch (error) {
    res.status(500).json({ error: '解绑设备失败', details: error.message });
  }
});

module.exports = router;

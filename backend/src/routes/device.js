const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

// 生成6位纯数字设备码
const generateDeviceCode = () => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  if (code[0] === '0') code = '1' + code.substring(1);
  return code;
};

// 生成纯数字密码
const generatePassword = (len = 6) => {
  const chars = '0123456789';
  let pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
};

// 获取设备码
router.get('/code', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    let device = await Device.findOne({ userId });

    if (!device) {
      device = new Device({
        userId,
        platform: req.headers['user-agent']?.includes('Windows') ? 'windows' : 'mac',
        accessPassword: generatePassword()
      });
      await device.save();
    }

    res.json({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      isOnline: device.isOnline,
      accessPassword: device.accessPassword,
      permanentPassword: device.permanentPassword || null
    });
  } catch (error) {
    res.status(500).json({ error: '获取设备码失败' });
  }
});

// 更新临时密码
router.post('/password', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword, type } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: '密码长度不能少于4位' });
    }

    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    if (type === 'permanent') {
      device.permanentPassword = newPassword;
    } else {
      device.accessPassword = newPassword;
    }
    await device.save();

    res.json({ message: '密码更新成功' });
  } catch (error) {
    res.status(500).json({ error: '更新密码失败' });
  }
});

// 生成新的临时密码
router.post('/password/regenerate', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const device = await Device.findOne({ userId });

    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    device.accessPassword = generatePassword();
    await device.save();

    res.json({ message: '新密码已生成', accessPassword: device.accessPassword });
  } catch (error) {
    res.status(500).json({ error: '生成密码失败' });
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
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 绑定设备
router.post('/bind', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceCode, deviceName } = req.body;

    if (!deviceCode) {
      return res.status(400).json({ error: '设备码不能为空' });
    }

    const targetDevice = await Device.findOne({ deviceCode });
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    const userDevice = await Device.findOne({ userId });
    if (!userDevice) {
      return res.status(404).json({ error: '请先获取本机设备码' });
    }

    const isAlreadyBound = userDevice.boundDevices.some(
      bound => bound.deviceId.toString() === targetDevice._id.toString()
    );
    if (isAlreadyBound) {
      return res.status(400).json({ error: '设备已绑定' });
    }

    userDevice.boundDevices.push({
      deviceId: targetDevice._id,
      deviceName: deviceName || targetDevice.deviceName
    });
    await userDevice.save();

    res.json({ message: '设备绑定成功' });
  } catch (error) {
    res.status(500).json({ error: '绑定设备失败' });
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

    device.boundDevices = device.boundDevices.filter(
      bound => bound.deviceId.toString() !== deviceId
    );
    await device.save();

    res.json({ message: '设备解绑成功' });
  } catch (error) {
    res.status(500).json({ error: '解绑设备失败' });
  }
});

module.exports = router;

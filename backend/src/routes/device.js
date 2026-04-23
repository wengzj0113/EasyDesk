const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');
const { logError } = require('../middleware/logger');
const { validateDeviceCode, validateConnectionPassword, validateObjectId, sanitizeString } = require('../middleware/validator');

// 生成9位纯数字设备码（使用加密安全的随机数生成器）
const generateDeviceCode = async () => {
  const digits = '0123456789';
  const config = require('../config');
  let code;
  let attempts = 0;
  const maxAttempts = 10;

  // 尝试生成唯一设备码（检查数据库中是否已存在）
  do {
    // 使用 crypto.randomBytes 生成加密安全的随机数
    const randomBytes = crypto.randomBytes(4);
    let num = randomBytes.readUInt32BE(0);
    code = '';
    for (let i = 0; i < config.deviceCode.length; i++) {
      code += digits[num % 10];
      num = Math.floor(num / 10);
    }
    // 确保首位不为0
    if (code[0] === '0') {
      code = digits[randomBytes[4] % 9 + 1] + code.substring(1);
    }
    attempts++;
  } while (await Device.exists({ deviceCode: code }) && attempts < maxAttempts);

  return code;
};

// 生成纯数字密码（使用加密安全的随机数生成器）
const generatePassword = (len = 6) => {
  const chars = '0123456789';
  const randomBytes = crypto.randomBytes(len);
  let pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += chars[randomBytes[i] % 10];
  }
  return pwd;
};

// 获取设备码
router.get('/code', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    let device = await Device.findOne({ userId });

    if (!device) {
      const deviceCode = await generateDeviceCode();
      const plainPassword = generatePassword();
      device = new Device({
        userId,
        deviceCode,
        platform: req.headers['user-agent']?.includes('Windows') ? 'windows' : 'mac',
        accessPassword: plainPassword
      });
      await device.save();

      // 首次创建时返回密码（之后不再返回）
      res.json({
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        isOnline: device.isOnline,
        accessPassword: plainPassword,
        isNew: true
      });
      return;
    }

    // 不再返回密码以防泄露
    res.json({
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      isOnline: device.isOnline,
      isNew: false,
      unattendedAccess: device.unattendedAccess
    });
  } catch (error) {
    logError('获取设备码失败', error);
    res.status(500).json({ error: '获取设备码失败' });
  }
});

// 更新密码
router.post('/password', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { newPassword, type } = req.body;

    // 验证密码格式（6位数字，增强安全性）
    if (!newPassword || !/^\d{6}$/.test(newPassword)) {
      return res.status(400).json({ error: '密码必须是6位数字' });
    }

    if (type !== 'permanent' && type !== 'temporary') {
      return res.status(400).json({ error: '密码类型不正确' });
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
    logError('更新密码失败', error);
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
    logError('生成密码失败', error);
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
    logError('获取设备列表失败', error);
    res.status(500).json({ error: '获取设备列表失败' });
  }
});

// 绑定设备
router.post('/bind', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceCode, deviceName } = req.body;

    // 验证设备码格式
    const codeValidation = validateDeviceCode(deviceCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const targetDevice = await Device.findOne({ deviceCode: codeValidation.normalized });
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 不能绑定自己的设备
    if (targetDevice.userId.toString() === userId) {
      return res.status(400).json({ error: '不能绑定自己的设备' });
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
      deviceName: sanitizeString(deviceName || targetDevice.deviceName, 50)
    });
    await userDevice.save();

    res.json({ message: '设备绑定成功' });
  } catch (error) {
    logError('绑定设备失败', error);
    res.status(500).json({ error: '绑定设备失败' });
  }
});

// 解绑设备
router.delete('/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceId } = req.params;

    // 验证设备ID格式
    const idValidation = validateObjectId(deviceId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

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
    logError('解绑设备失败', error);
    res.status(500).json({ error: '解绑设备失败' });
  }
});

// 更新无人值守访问设置
router.post('/unattended', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceId, enabled, trustedUntil, allowedControllers, requirePassword } = req.body;

    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 如果提供了 deviceId（用于更新其他设备），需要验证权限
    if (deviceId && deviceId !== device._id.toString()) {
      // 检查目标设备是否在绑定列表中
      const isBound = device.boundDevices.some(
        bound => bound.deviceId.toString() === deviceId
      );
      if (!isBound) {
        return res.status(403).json({ error: '无权修改该设备设置' });
      }
      const targetDevice = await Device.findById(deviceId);
      if (!targetDevice) {
        return res.status(404).json({ error: '目标设备不存在' });
      }
      targetDevice.unattendedAccess = {
        enabled: enabled !== undefined ? enabled : false,
        trustedUntil: trustedUntil || null,
        allowedControllers: allowedControllers || [],
        requirePassword: requirePassword !== undefined ? requirePassword : true,
      };
      await targetDevice.save();
      return res.json({ success: true, message: '无人值守访问设置已更新' });
    }

    // 更新本机设备
    device.unattendedAccess = {
      enabled: enabled !== undefined ? enabled : false,
      trustedUntil: trustedUntil || null,
      allowedControllers: allowedControllers || [],
      requirePassword: requirePassword !== undefined ? requirePassword : true,
    };
    await device.save();

    res.json({ success: true, message: '无人值守访问设置已更新' });
  } catch (error) {
    logError('更新无人值守设置失败', error);
    res.status(500).json({ error: '更新无人值守设置失败' });
  }
});

// 获取无人值守访问设置
router.get('/unattended/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { deviceId } = req.params;

    const device = await Device.findOne({ userId });
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 检查是否有权限查看该设备
    const targetDeviceId = deviceId || device._id.toString();
    if (deviceId === device._id.toString()) {
      // 查看本机设备
      return res.json({
        enabled: device.unattendedAccess?.enabled || false,
        trustedUntil: device.unattendedAccess?.trustedUntil || null,
        allowedControllers: device.unattendedAccess?.allowedControllers || [],
        requirePassword: device.unattendedAccess?.requirePassword !== false,
      });
    }

    // 检查目标设备是否在绑定列表中
    const boundDevice = device.boundDevices.find(
      bound => bound.deviceId.toString() === deviceId
    );
    if (!boundDevice) {
      return res.status(403).json({ error: '无权查看该设备设置' });
    }

    const targetDevice = await Device.findById(deviceId);
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    res.json({
      enabled: targetDevice.unattendedAccess?.enabled || false,
      trustedUntil: targetDevice.unattendedAccess?.trustedUntil || null,
      allowedControllers: targetDevice.unattendedAccess?.allowedControllers || [],
      requirePassword: targetDevice.unattendedAccess?.requirePassword !== false,
    });
  } catch (error) {
    logError('获取无人值守设置失败', error);
    res.status(500).json({ error: '获取无人值守设置失败' });
  }
});

module.exports = router;

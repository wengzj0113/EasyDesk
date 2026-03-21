const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');
const { logError } = require('../middleware/logger');
const { validateDeviceCode, validateConnectionPassword, validateObjectId, validatePagination } = require('../middleware/validator');

// 建立连接
router.post('/connect', async (req, res) => {
  try {
    const { deviceCode, password } = req.body;
    const userId = req.userId; // 可能为空，支持免登录连接

    // 输入验证
    const codeValidation = validateDeviceCode(deviceCode);
    if (!codeValidation.valid) {
      return res.status(400).json({ error: codeValidation.error });
    }

    const pwdValidation = validateConnectionPassword(password);
    if (!pwdValidation.valid) {
      return res.status(400).json({ error: pwdValidation.error });
    }

    // 查找目标设备
    const targetDevice = await Device.findOne({ deviceCode: codeValidation.normalized });
    if (!targetDevice) {
      return res.status(404).json({ error: '设备不存在' });
    }

    // 验证密码
    if (targetDevice.accessPassword !== password) {
      return res.status(401).json({ error: '密码错误' });
    }

    // 检查设备是否在线
    if (!targetDevice.isOnline) {
      return res.status(400).json({ error: '设备不在线' });
    }

    // 创建连接记录
    const connection = new Connection({
      deviceId: targetDevice._id,
      userId,
      connectionType: userId ? 'bound' : 'direct',
      status: 'connecting'
    });

    await connection.save();

    // 触发WebSocket事件通知目标设备
    // 这部分逻辑会在WebSocket服务中实现

    res.json({
      message: '连接请求已发送',
      connectionId: connection._id,
      deviceInfo: {
        deviceCode: targetDevice.deviceCode,
        deviceName: targetDevice.deviceName,
        platform: targetDevice.platform
      }
    });
  } catch (error) {
    logError('建立连接失败', error);
    res.status(500).json({ error: '建立连接失败' });
  }
});

// 断开连接
router.post('/disconnect', async (req, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.body;

    if (connectionId) {
      const idValidation = validateObjectId(connectionId);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }
    }

    const connection = await Connection.findOne({
      _id: connectionId,
      userId
    });

    if (!connection) {
      return res.status(404).json({ error: '连接不存在' });
    }

    connection.status = 'disconnected';
    connection.endTime = new Date();
    await connection.save();

    res.json({ message: '连接已断开' });
  } catch (error) {
    logError('断开连接失败', error);
    res.status(500).json({ error: '断开连接失败' });
  }
});

// 获取连接状态
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.query;

    if (connectionId) {
      const idValidation = validateObjectId(connectionId);
      if (!idValidation.valid) {
        return res.status(400).json({ error: idValidation.error });
      }
    }

    const query = { userId };
    if (connectionId) {
      query._id = connectionId;
    }

    const connections = await Connection.find(query)
      .sort({ startTime: -1 })
      .limit(10)
      .populate('deviceId', 'deviceCode deviceName platform')
      .lean();

    res.json({ connections });
  } catch (error) {
    logError('获取连接状态失败', error);
    res.status(500).json({ error: '获取连接状态失败' });
  }
});

// 获取连接历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page, pageSize, startDate, endDate } = req.query;

    const { page: p, pageSize: ps } = validatePagination(page, pageSize);

    const query = { userId };

    // 日期筛选
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const connections = await Connection.find(query)
      .sort({ startTime: -1 })
      .skip((p - 1) * ps)
      .limit(ps)
      .populate('deviceId', 'deviceCode deviceName platform')
      .lean();

    const total = await Connection.countDocuments(query);

    res.json({
      connections,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps)
      }
    });
  } catch (error) {
    logError('获取连接历史失败', error);
    res.status(500).json({ error: '获取连接历史失败' });
  }
});

// 获取连接详情
router.get('/:connectionId', authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;

    const idValidation = validateObjectId(connectionId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const connection = await Connection.findOne({
      _id: connectionId,
      userId
    })
      .populate('deviceId', 'deviceCode deviceName platform isOnline')
      .lean();

    if (!connection) {
      return res.status(404).json({ error: '连接不存在' });
    }

    res.json({ connection });
  } catch (error) {
    logError('获取连接详情失败', error);
    res.status(500).json({ error: '获取连接详情失败' });
  }
});

// 更新连接质量信息
router.post('/quality', authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.body;
    const { resolution, fps, latency } = req.body;

    const idValidation = validateObjectId(connectionId);
    if (!idValidation.valid) {
      return res.status(400).json({ error: idValidation.error });
    }

    const connection = await Connection.findOneAndUpdate(
      { _id: connectionId, userId: req.userId },
      {
        quality: { resolution, fps, latency },
        dataTransferred: req.body.dataTransferred || 0
      },
      { new: true }
    );

    if (!connection) {
      return res.status(404).json({ error: '连接不存在' });
    }

    res.json({ message: '质量信息已更新', connection });
  } catch (error) {
    logError('更新质量信息失败', error);
    res.status(500).json({ error: '更新质量信息失败' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const Device = require('../models/Device');
const authMiddleware = require('../middleware/auth');

// 建立连接
router.post('/connect', async (req, res) => {
  try {
    const { deviceCode, password } = req.body;
    const userId = req.userId; // 可能为空，支持免登录连接

    // 查找目标设备
    const targetDevice = await Device.findOne({ deviceCode: deviceCode.toUpperCase() });
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
    res.status(500).json({ error: '建立连接失败', details: error.message });
  }
});

// 断开连接
router.post('/disconnect', async (req, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.body;

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
    res.status(500).json({ error: '断开连接失败', details: error.message });
  }
});

// 获取连接状态
router.get('/status', async (req, res) => {
  try {
    const userId = req.userId;
    const { connectionId } = req.query;

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
    res.status(500).json({ error: '获取连接状态失败', details: error.message });
  }
});

// 获取连接历史
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, pageSize = 20, startDate, endDate } = req.query;

    const query = { userId };

    // 日期筛选
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const connections = await Connection.find(query)
      .sort({ startTime: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
      .populate('deviceId', 'deviceCode deviceName platform')
      .lean();

    const total = await Connection.countDocuments(query);

    res.json({
      connections,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / Number(pageSize))
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取连接历史失败', details: error.message });
  }
});

// 获取连接详情
router.get('/:connectionId', authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.userId;

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
    res.status(500).json({ error: '获取连接详情失败', details: error.message });
  }
});

// 更新连接质量信息
router.post('/quality', authMiddleware, async (req, res) => {
  try {
    const { connectionId } = req.body;
    const { resolution, fps, latency } = req.body;

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
    res.status(500).json({ error: '更新失败', details: error.message });
  }
});

module.exports = router;

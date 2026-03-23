const jwt = require('jsonwebtoken');
const config = require('../config');
const Device = require('../models/Device');
const { logInfo, logWarn, logError } = require('../middleware/logger');

// 存储在线设备
const onlineDevices = new Map(); // deviceCode -> { socketId, role, userId, lastHeartbeat }

// JWT 认证中间件（用于 WebSocket 连接验证）
function verifyJwtToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

// 心跳超时配置（毫秒）
const HEARTBEAT_TIMEOUT = 60000; // 60秒无心跳认为离线
const HEARTBEAT_INTERVAL = 30000; // 每30秒检查一次

// 动态构建 ICE 服务器列表（每次连接时调用，以便运行中更新配置）
function buildIceServers() {
  const iceServers = [
    { urls: config.webrtc.stunServer },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  if (config.webrtc.turnUrl) {
    iceServers.push({
      urls: config.webrtc.turnUrl,
      username: config.webrtc.turnUsername,
      credential: config.webrtc.turnCredential,
    });
  }

  return { iceServers };
}

// 检查设备心跳超时
function checkHeartbeatTimeout(io) {
  const now = Date.now();
  const toRemove = [];

  for (const [deviceCode, deviceInfo] of onlineDevices) {
    if (now - deviceInfo.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      toRemove.push(deviceCode);
    }
  }

  // 统一删除，避免遍历中修改 Map
  for (const deviceCode of toRemove) {
    logWarn(`设备心跳超时: ${deviceCode}`);
    onlineDevices.delete(deviceCode);
    io.emit('device-offline', { deviceCode, reason: 'timeout' });
  }
}

// 存储待验证的临时认证 token（一次性使用）
const pendingAuth = new Map(); // deviceCode -> { userId, token, expiresAt }

// 生成临时认证 token
function generateTempToken(deviceCode, userId) {
  const token = jwt.sign(
    { deviceCode, userId, purpose: 'device_auth' },
    config.jwt.secret,
    { expiresIn: '5m' }
  );
  pendingAuth.set(deviceCode, {
    userId,
    token,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  return token;
}

// 验证并消费临时 token
function consumeTempToken(deviceCode, token) {
  const pending = pendingAuth.get(deviceCode);
  if (!pending) return null;

  if (pending.token !== token || Date.now() > pending.expiresAt) {
    pendingAuth.delete(deviceCode);
    return null;
  }

  const userId = pending.userId;
  pendingAuth.delete(deviceCode);
  return userId;
}

// 清理过期的 pendingAuth
setInterval(() => {
  const now = Date.now();
  for (const [deviceCode, data] of pendingAuth) {
    if (now > data.expiresAt) {
      pendingAuth.delete(deviceCode);
    }
  }
}, 60000);

function initializeSocketIO(io) {
  io.on('connection', (socket) => {
    logInfo('新的 WebSocket 连接', { socketId: socket.id });

    // 临时存储用户信息
    socket.userId = null;
    socket.deviceCode = null;

    // 步骤1: 请求设备认证 token（需要 JWT）
    socket.on('request-auth', async (data) => {
      const { userId, deviceCode, password } = data;

      if (!userId || !deviceCode) {
        socket.emit('error', { message: '缺少必要参数' });
        return;
      }

      try {
        // 查找设备并验证所有权
        const device = await Device.findOne({ deviceCode });

        if (!device) {
          socket.emit('error', { message: '设备不存在' });
          return;
        }

        // 验证设备是否属于当前用户
        if (device.userId && device.userId.toString() !== userId) {
          socket.emit('error', { message: '设备不属于当前用户' });
          return;
        }

        // 如果设备已设置密码，验证密码
        if (device.accessPassword) {
          const isMatch = await device.compareAccessPassword(password || '');
          if (!isMatch) {
            socket.emit('error', { message: '密码错误' });
            return;
          }
        }

        // 生成临时认证 token
        const tempToken = generateTempToken(deviceCode, userId);

        socket.emit('auth-token', {
          tempToken,
          deviceCode,
          expiresIn: 300 // 5分钟
        });
      } catch (error) {
        logError('设备认证失败', error);
        socket.emit('error', { message: '认证失败' });
      }
    });

    // 步骤2: 使用临时 token 完成设备注册
    socket.on('register', (data) => {
      const { deviceCode, tempToken } = data;

      if (!deviceCode || typeof deviceCode !== 'string' || deviceCode.length !== 9) {
        socket.emit('error', { message: '设备码格式不正确' });
        return;
      }

      // 验证临时 token
      const userId = consumeTempToken(deviceCode, tempToken);
      if (!userId) {
        socket.emit('error', { message: '认证已过期，请重新认证' });
        return;
      }

      // 检查设备是否已被其他连接注册
      const existingDevice = onlineDevices.get(deviceCode);
      if (existingDevice) {
        // 如果是同一用户，可以复用；否则拒绝
        if (existingDevice.userId !== userId) {
          socket.emit('error', { message: '设备已被其他用户连接' });
          return;
        }
      }

      // 保存设备信息
      const deviceInfo = {
        socketId: socket.id,
        userId,
        role: 'controlled', // controlled(被控) 或 controller(控制端)
        deviceCode,
        lastHeartbeat: Date.now()
      };

      onlineDevices.set(deviceCode, deviceInfo);
      socket.userId = userId;
      socket.deviceCode = deviceCode;

      logInfo('设备注册成功', { deviceCode, userId });

      // 通知设备注册成功
      socket.emit('registered', { success: true, deviceCode });

      // 广播设备在线状态
      io.emit('device-online', { deviceCode });
    });

    // 请求连接远程设备
    socket.on('request-connect', async (data) => {
      const { targetDeviceCode, password, userId } = data;

      if (!socket.userId) {
        socket.emit('connect-failed', { error: '未认证，请先完成设备认证' });
        return;
      }

      if (!targetDeviceCode) {
        socket.emit('connect-failed', { error: '设备码不能为空' });
        return;
      }

      const target = onlineDevices.get(targetDeviceCode);

      if (!target) {
        socket.emit('connect-failed', { error: '目标设备不在线' });
        return;
      }

      // 检查是否是同一用户
      if (target.userId === socket.userId) {
        socket.emit('connect-failed', { error: '不能连接自己的设备' });
        return;
      }

      try {
        // 验证访问密码
        const device = await Device.findOne({ deviceCode: targetDeviceCode });
        if (!device) {
          socket.emit('connect-failed', { error: '设备不存在' });
          return;
        }

        const isMatch = await device.compareAccessPassword(password || '');
        if (!isMatch) {
          socket.emit('connect-failed', { error: '访问密码错误' });
          return;
        }

        logInfo('收到连接请求', { from: socket.deviceCode, to: targetDeviceCode });

        // 向目标设备发送连接请求
        io.to(target.socketId).emit('incoming-connection', {
          fromDeviceCode: socket.deviceCode,
          fromUserId: socket.userId
        });

        socket.emit('connection-requested', { targetDeviceCode });
      } catch (error) {
        logError('验证访问密码失败', error);
        socket.emit('connect-failed', { error: '验证失败' });
      }
    });

    // 目标设备接受连接
    socket.on('accept-connection', (data) => {
      const { targetDeviceCode } = data;

      if (!targetDeviceCode) {
        socket.emit('error', { message: '目标设备码不能为空' });
        return;
      }

      const target = onlineDevices.get(targetDeviceCode);

      if (!target) {
        socket.emit('error', { message: '目标设备已离线' });
        return;
      }

      logInfo('连接已接受', { from: targetDeviceCode, to: socket.deviceCode });

      // 通知发起端连接已接受
      io.to(target.socketId).emit('connection-accepted', {
        fromDeviceCode: socket.deviceCode,
        iceServers: buildIceServers()
      });

      // 通知发起端准备接收 SDP
      socket.emit('prepare-sdp', {
        targetDeviceCode,
        iceServers: buildIceServers()
      });
    });

    // 目标设备拒绝连接
    socket.on('reject-connection', (data) => {
      const { targetDeviceCode, reason } = data;

      if (!targetDeviceCode) return;

      const target = onlineDevices.get(targetDeviceCode);
      if (target) {
        io.to(target.socketId).emit('connection-rejected', {
          reason: reason || '对方拒绝连接'
        });
      }
    });

    // 交换 SDP (WebRTC 会话描述)
    socket.on('sdp-offer', (data) => {
      const { targetDeviceCode, sdp } = data;

      if (!targetDeviceCode || !sdp) return;

      const target = onlineDevices.get(targetDeviceCode);

      if (target) {
        io.to(target.socketId).emit('sdp-offer', {
          fromDeviceCode: socket.deviceCode,
          sdp
        });
      }
    });

    socket.on('sdp-answer', (data) => {
      const { targetDeviceCode, sdp } = data;

      if (!targetDeviceCode || !sdp) return;

      const target = onlineDevices.get(targetDeviceCode);

      if (target) {
        io.to(target.socketId).emit('sdp-answer', {
          fromDeviceCode: socket.deviceCode,
          sdp
        });
      }
    });

    // 交换 ICE Candidate
    socket.on('ice-candidate', (data) => {
      const { targetDeviceCode, candidate } = data;

      if (!targetDeviceCode || !candidate) return;

      const target = onlineDevices.get(targetDeviceCode);

      if (target) {
        io.to(target.socketId).emit('ice-candidate', {
          fromDeviceCode: socket.deviceCode,
          candidate
        });
      }
    });

    // 远程控制指令
    socket.on('control-command', (data) => {
      const { targetDeviceCode, command } = data;

      if (!targetDeviceCode || !command) return;

      const target = onlineDevices.get(targetDeviceCode);

      if (target) {
        io.to(target.socketId).emit('control-command', command);
      }
    });

    // 获取在线设备列表（只暴露设备码，不暴露用户信息）
    socket.on('get-online-devices', () => {
      const devices = [];
      for (const [code, info] of onlineDevices) {
        devices.push({
          deviceCode: code,
          role: info.role
        });
      }
      socket.emit('online-devices', devices);
    });

    // 心跳保活
    socket.on('heartbeat', () => {
      if (socket.deviceCode) {
        const deviceInfo = onlineDevices.get(socket.deviceCode);
        if (deviceInfo) {
          deviceInfo.lastHeartbeat = Date.now();
          socket.emit('heartbeat-ack');
        }
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      if (socket.deviceCode) {
        const deviceInfo = onlineDevices.get(socket.deviceCode);
        onlineDevices.delete(socket.deviceCode);

        // 只有设备真的离线才广播（避免重复广播）
        if (deviceInfo) {
          logInfo('设备断开连接', { deviceCode: socket.deviceCode });
          io.emit('device-offline', { deviceCode: socket.deviceCode });
        }
      }
    });
  });

  // 定期检查心跳超时
  setInterval(() => {
    checkHeartbeatTimeout(io);
  }, HEARTBEAT_INTERVAL);

  // 定期输出在线设备统计
  setInterval(() => {
    if (onlineDevices.size > 0) {
      logInfo(`在线设备数量: ${onlineDevices.size}`);
    }
  }, 60000);

  return io;
}

module.exports = { initializeSocketIO, generateTempToken };

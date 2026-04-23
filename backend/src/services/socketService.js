/**
 * Socket.IO 服务模块
 * 处理设备注册、心跳、WebRTC 信令等实时通信
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const Device = require('../models/Device');
const { logInfo, logWarn, logError } = require('../middleware/logger');

// 存储在线设备
const onlineDevices = new Map(); // deviceCode -> { socketId, role, userId, lastHeartbeat }

// 剪贴板历史记录（每个设备码对应最多10条记录）
const clipboardHistory = new Map(); // deviceCode -> [{ content, contentType, direction, timestamp }]

// JWT 认证中间件（用于 WebSocket 连接验证）
/**
 * 验证 JWT token
 * @param {string} token - JWT token
 * @returns {object|null} 解码后的 payload 或 null
 */
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
/**
 * 构建 WebRTC ICE 服务器配置
 * @returns {{ iceServers: Array }}
 */
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

/**
 * 检查并清理心跳超时的设备
 * @param {import('socket.io').Server} io - Socket.IO 服务器实例
 */
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

/**
 * 生成临时认证 token（用于设备注册）
 * @param {string} deviceCode - 设备码
 * @param {string} userId - 用户ID
 * @returns {string} 临时 token
 */
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

/**
 * 验证并消费临时 token（一次性）
 * @param {string} deviceCode - 设备码
 * @param {string} token - 临时 token
 * @returns {string|null} 用户ID 或 null（验证失败）
 */
function consumeTempToken(deviceCode, token) {
  const pending = pendingAuth.get(deviceCode);
  if (!pending) return null;

  if (pending.token !== token || Date.now() > pending.expiresAt) {
    pendingAuth.delete(deviceCode);
    return null;
  }

  // 验证 token payload 中的 deviceCode 与请求中的 deviceCode 一致，防止跨设备攻击
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    pendingAuth.delete(deviceCode);
    return null;
  }

  if (payload.deviceCode !== deviceCode) {
    logWarn('设备码不匹配，拒绝注册', { submitted: deviceCode, tokenDevice: payload.deviceCode });
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

/**
 * 初始化 Socket.IO 服务
 * @param {import('socket.io').Server} io - Socket.IO 服务器实例
 * @returns {import('socket.io').Server}
 */
function initializeSocketIO(io) {
  /**
   * 清理指定 socket 上的所有事件监听器
   * 防止事件监听器堆积导致内存泄漏
   * @param {import('socket.io').Socket} socket - Socket 实例
   */
  const cleanupSocketListeners = (socket) => {
    const events = [
      'request-auth', 'register', 'request-connect',
      'accept-connection', 'reject-connection',
      'sdp-offer', 'sdp-answer', 'ice-candidate',
      'control-command', 'get-online-devices', 'heartbeat',
      'shell-execute', 'shell-response',
      'clipboard-change', 'clipboard-history', 'clipboard-clear',
      'disconnect'
    ];
    events.forEach(event => socket.removeAllListeners(event));
  };

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
      const { targetDeviceCode, password, userId, controllerDeviceCode } = data;

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
        // 查找目标设备
        const targetDevice = await Device.findOne({ deviceCode: targetDeviceCode });
        if (!targetDevice) {
          socket.emit('connect-failed', { error: '设备不存在' });
          return;
        }

        // 检查无人值守访问设置
        const unattended = targetDevice.unattendedAccess;
        const isUnattendedEnabled = unattended?.enabled === true;
        const isNotExpired = !unattended?.trustedUntil || new Date() < unattended.trustedUntil;
        const isUnattendedMode = isUnattendedEnabled && isNotExpired;

        // 检查控制器是否被允许
        const controllerId = controllerDeviceCode || socket.deviceCode;
        const isControllerAllowed = !unattended?.allowedControllers?.length ||
          unattended.allowedControllers.includes(controllerId);

        // 如果是无人值守模式且控制器被允许，直接建立连接
        if (isUnattendedMode && isControllerAllowed) {
          // 验证密码（如果需要）
          if (unattended.requirePassword !== false) {
            const isMatch = await targetDevice.compareAccessPassword(password || '');
            if (!isMatch) {
              socket.emit('connect-failed', { error: '访问密码错误' });
              return;
            }
          }

          logInfo('无人值守连接', { from: socket.deviceCode, to: targetDeviceCode, unattended: true });

          // 通知目标设备有无人值守连接
          io.to(target.socketId).emit('unattended-connect', {
            fromDeviceCode: socket.deviceCode,
            fromUserId: socket.userId,
            unattended: true
          });

          // 直接通知发起端连接已接受（无人值守模式跳过确认）
          socket.emit('connection-accepted', {
            fromDeviceCode: targetDeviceCode,
            iceServers: buildIceServers(),
            unattended: true
          });

          socket.emit('prepare-sdp', {
            targetDeviceCode,
            iceServers: buildIceServers()
          });

          return;
        }

        // 普通模式：验证访问密码
        const isMatch = await targetDevice.compareAccessPassword(password || '');
        if (!isMatch) {
          socket.emit('connect-failed', { error: '访问密码错误' });
          return;
        }

        logInfo('收到连接请求', { from: socket.deviceCode, to: targetDeviceCode });

        // 向目标设备发送连接请求（需要手动确认）
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

    // Shell命令执行
    socket.on('shell-execute', (data) => {
      const { deviceCode, command, sessionId } = data;

      if (!deviceCode || !command || !sessionId) {
        socket.emit('shell-error', {
          sessionId,
          error: '缺少必要参数'
        });
        return;
      }

      const target = onlineDevices.get(deviceCode);

      if (!target) {
        socket.emit('shell-error', {
          sessionId,
          error: '设备不在线'
        });
        return;
      }

      logInfo('Shell命令转发', { deviceCode, command: command.substring(0, 50), sessionId });

      // 转发命令到目标设备
      io.to(target.socketId).emit('shell-command', {
        command,
        sessionId,
        fromDeviceCode: socket.deviceCode,
        fromSocketId: socket.id,
        timestamp: Date.now(),
      });
    });

    // Shell响应处理
    socket.on('shell-response', (data) => {
      const { targetDeviceCode, sessionId, output, error, exitCode } = data;

      if (!targetDeviceCode) {
        logWarn('Shell响应缺少目标设备信息');
        return;
      }

      const target = onlineDevices.get(targetDeviceCode);

      if (target) {
        io.to(target.socketId).emit('shell-result', {
          sessionId,
          output: output || '',
          error: error || '',
          exitCode: exitCode ?? 0,
          timestamp: Date.now(),
        });
      }
    });

    // 剪贴板变化（存储到历史并转发）
    socket.on('clipboard-change', async (data) => {
      const { deviceCode, content, contentType = 'text', direction } = data;

      if (!deviceCode || !content) {
        return;
      }

      // 存储到历史记录
      if (!clipboardHistory.has(deviceCode)) {
        clipboardHistory.set(deviceCode, []);
      }

      const history = clipboardHistory.get(deviceCode);
      history.push({
        content,
        contentType,
        direction: direction || 'to',
        timestamp: Date.now(),
      });

      // 保持最多10条记录
      if (history.length > 10) {
        history.shift();
      }

      // 转发剪贴板变化到对方设备
      const target = onlineDevices.get(deviceCode);
      if (target) {
        io.to(target.socketId).emit('clipboard-sync', {
          content,
          contentType,
          direction: direction || 'to',
          fromDeviceCode: socket.deviceCode,
        });
      }

      // 如果控制端也在线，也转发给它（双向同步）
      for (const [code, info] of onlineDevices) {
        if (code !== deviceCode && info.userId === socket.userId) {
          io.to(info.socketId).emit('clipboard-sync', {
            content,
            contentType,
            direction: direction || 'to',
            fromDeviceCode: socket.deviceCode,
          });
        }
      }
    });

    // 获取剪贴板历史
    socket.on('clipboard-history', async (data) => {
      const { deviceCode } = data;

      if (!deviceCode) {
        socket.emit('clipboard-history-response', { history: [] });
        return;
      }

      const history = clipboardHistory.get(deviceCode) || [];
      socket.emit('clipboard-history-response', { history });
    });

    // 清空剪贴板历史
    socket.on('clipboard-clear', async (data) => {
      const { deviceCode } = data;

      if (!deviceCode) {
        return;
      }

      clipboardHistory.delete(deviceCode);
      socket.emit('clipboard-history-response', { history: [] });
    });

    // ========== 电源控制命令 ==========
    // 有效电源操作类型
    const VALID_POWER_ACTIONS = ['shutdown', 'restart', 'lock', 'sleep'];

    /**
     * 处理电源控制命令
     * 将命令从控制端转发到被控端
     */
    socket.on('power-command', (data) => {
      const { deviceCode, action, confirmCode } = data;

      if (!socket.userId) {
        socket.emit('power-error', { error: '未认证，请先完成设备认证' });
        return;
      }

      if (!deviceCode || !action) {
        socket.emit('power-error', { error: '缺少必要参数' });
        return;
      }

      // 验证操作类型
      if (!VALID_POWER_ACTIONS.includes(action)) {
        socket.emit('power-error', { error: `不支持的电源操作: ${action}` });
        return;
      }

      // 验证目标设备在线
      const target = onlineDevices.get(deviceCode);
      if (!target) {
        socket.emit('power-error', { error: '目标设备不在线' });
        return;
      }

      // 生成确认码（如果未提供）
      const finalConfirmCode = confirmCode || Math.random().toString(36).substring(2, 8).toUpperCase();

      // 审计日志
      logInfo('电源控制命令', {
        socketId: socket.id,
        controllerDeviceCode: socket.deviceCode,
        targetDeviceCode: deviceCode,
        action,
        timestamp: new Date().toISOString(),
      });

      // 转发电源命令到目标设备
      io.to(target.socketId).emit('power-action', {
        action,
        confirmCode: finalConfirmCode,
        fromDeviceCode: socket.deviceCode,
        timestamp: Date.now(),
      });

      logInfo('电源命令已发送', { targetDeviceCode: deviceCode, action, confirmCode: finalConfirmCode });

      // 确认命令已发送
      socket.emit('power-command-sent', {
        deviceCode,
        action,
        confirmCode: finalConfirmCode
      });
    });

    /**
     * 处理电源命令确认
     * 从被控端接收确认结果并转发回控制端
     */
    socket.on('power-confirmed', (data) => {
      const { targetDeviceId, action, success, error } = data;

      if (!targetDeviceId || !action) {
        return;
      }

      const target = onlineDevices.get(targetDeviceId);
      if (target) {
        io.to(target.socketId).emit('power-result', {
          action,
          success,
          error,
          timestamp: Date.now(),
        });

        logInfo('电源命令执行结果', {
          targetDeviceCode: targetDeviceId,
          action,
          success
        });
      }
    });

    // 断开连接时清理监听器
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
      // 清理所有事件监听器，防止内存泄漏
      cleanupSocketListeners(socket);
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

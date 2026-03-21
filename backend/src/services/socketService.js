
const config = require('../config');
const { logInfo, logWarn, logError, formatLog } = require('../middleware/logger');

// 存储在线设备
const onlineDevices = new Map(); // deviceCode -> { socketId, role, password, lastHeartbeat }

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

  for (const [deviceCode, deviceInfo] of onlineDevices) {
    if (now - deviceInfo.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      logWarn(`设备心跳超时: ${deviceCode}`);
      onlineDevices.delete(deviceCode);
      io.emit('device-offline', { deviceCode, reason: 'timeout' });
    }
  }
}

function initializeSocketIO(io) {
  io.on('connection', (socket) => {
    logInfo('新的 WebSocket 连接', { socketId: socket.id });

    // 设备注册/上线
    socket.on('register', (data) => {
      const { deviceCode, password, role } = data;

      if (!deviceCode || typeof deviceCode !== 'string' || deviceCode.length !== 9) {
        socket.emit('error', { message: '设备码格式不正确' });
        return;
      }

      // 验证密码（如果有）
      const existingDevice = onlineDevices.get(deviceCode);
      if (existingDevice && existingDevice.password !== password) {
        socket.emit('error', { message: '密码错误' });
        return;
      }

      // 保存设备信息
      const deviceInfo = {
        socketId: socket.id,
        password: password,
        role: role || 'controlled', // controlled(被控) 或 controller(控制端)
        deviceCode,
        lastHeartbeat: Date.now()
      };

      onlineDevices.set(deviceCode, deviceInfo);
      socket.deviceCode = deviceCode;

      logInfo('设备注册成功', { deviceCode, role: role || 'controlled' });

      // 通知设备注册成功
      socket.emit('registered', { success: true, deviceCode });

      // 广播设备在线状态
      io.emit('device-online', { deviceCode });
    });

    // 请求连接远程设备
    socket.on('request-connect', (data) => {
      const { targetDeviceCode, password } = data;

      if (!targetDeviceCode || !password) {
        socket.emit('connect-failed', { error: '设备码和密码不能为空' });
        return;
      }

      const target = onlineDevices.get(targetDeviceCode);

      if (!target) {
        socket.emit('connect-failed', { error: '目标设备不在线' });
        return;
      }

      logInfo('收到连接请求', { from: socket.deviceCode, to: targetDeviceCode });

      // 向目标设备发送连接请求
      io.to(target.socketId).emit('incoming-connection', {
        fromDeviceCode: socket.deviceCode,
        password
      });

      socket.emit('connection-requested', { targetDeviceCode });
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

    // 获取在线设备列表
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
      const deviceInfo = onlineDevices.get(socket.deviceCode);
      if (deviceInfo) {
        deviceInfo.lastHeartbeat = Date.now();
        socket.emit('heartbeat-ack');
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

module.exports = { initializeSocketIO };

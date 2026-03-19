const { Server } = require('socket.io');
const http = require('http');

// 存储在线设备
const onlineDevices = new Map(); // deviceCode -> { socketId, role, password }

// STUN 服务器配置
const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

function initializeSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] New connection: ${socket.id}`);

    // 设备注册/上线
    socket.on('register', (data) => {
      const { deviceCode, password, role } = data;

      if (!deviceCode) {
        socket.emit('error', { message: '设备码不能为空' });
        return;
      }

      // 验证密码（如果有）
      const existingDevice = onlineDevices.get(deviceCode);
      if (existingDevice && existingDevice.password !== password) {
        socket.emit('error', { message: '密码错误' });
        return;
      }

      // 保存设备信息
      onlineDevices.set(deviceCode, {
        socketId: socket.id,
        password: password,
        role: role || 'controlled', // controlled(被控) 或 controller(控制端)
        deviceCode
      });

      socket.deviceCode = deviceCode;
      console.log(`[Socket.IO] Device registered: ${deviceCode} (${role})`);

      // 通知设备注册成功
      socket.emit('registered', { success: true, deviceCode });

      // 广播设备在线状态
      io.emit('device-online', { deviceCode });
    });

    // 请求连接远程设备
    socket.on('request-connect', (data) => {
      const { targetDeviceCode, password } = data;
      const target = onlineDevices.get(targetDeviceCode);

      if (!target) {
        socket.emit('connect-failed', { error: '目标设备不在线' });
        return;
      }

      console.log(`[Socket.IO] Connection request: ${socket.deviceCode} -> ${targetDeviceCode}`);

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
      const target = onlineDevices.get(targetDeviceCode);

      if (!target) {
        socket.emit('error', { message: '目标设备已离线' });
        return;
      }

      console.log(`[Socket.IO] Connection accepted: ${targetDeviceCode} -> ${socket.deviceCode}`);

      // 通知发起端连接已接受
      io.to(target.socketId).emit('connection-accepted', {
        fromDeviceCode: socket.deviceCode,
        iceServers: STUN_SERVERS
      });

      // 通知发起端准备接收 SDP
      socket.emit('prepare-sdp', {
        targetDeviceCode,
        iceServers: STUN_SERVERS
      });
    });

    // 目标设备拒绝连接
    socket.on('reject-connection', (data) => {
      const { targetDeviceCode, reason } = data;
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
      socket.emit('heartbeat-ack');
    });

    // 断开连接
    socket.on('disconnect', () => {
      if (socket.deviceCode) {
        onlineDevices.delete(socket.deviceCode);
        console.log(`[Socket.IO] Device disconnected: ${socket.deviceCode}`);
        io.emit('device-offline', { deviceCode: socket.deviceCode });
      }
    });
  });

  // 定期清理离线设备
  setInterval(() => {
    // 这里可以添加超时检测逻辑
  }, 30000);

  return io;
}

module.exports = { initializeSocketIO, STUN_SERVERS };

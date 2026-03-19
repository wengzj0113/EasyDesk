const Device = require('../models/Device');
const Connection = require('../models/Connection');
const redisService = require('./redis');
const config = require('../config');

// 存储在线设备的Socket连接
const onlineDevices = new Map();

const setupWebSocket = (io) => {
  // 中间件：认证
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;

      // 验证token或userId
      if (userId) {
        socket.userId = userId;
        next();
      } else if (token) {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;
        next();
      } else {
        next(new Error('认证失败'));
      }
    } catch (error) {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', async (socket) => {
    console.log('Client connected:', socket.id);

    try {
      // 获取或创建设备
      let device = await Device.findOne({ userId: socket.userId });
      if (!device) {
        device = new Device({
          userId: socket.userId,
          platform: socket.handshake.headers['user-agent']?.includes('Windows') ? 'windows' : 'mac'
        });
        await device.save();
      }

      // 更新设备在线状态
      device.isOnline = true;
      device.lastSeen = new Date();
      await device.save();

      // 同步到Redis
      await redisService.setDeviceOnline(device._id.toString(), {
        deviceCode: device.deviceCode,
        socketId: socket.id,
        userId: socket.userId
      });

      // 存储设备Socket映射
      onlineDevices.set(device._id.toString(), socket);
      socket.deviceId = device._id.toString();

      // 通知客户端设备信息
      socket.emit('device-info', {
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        isOnline: device.isOnline
      });

      // 监听设备状态更新
      socket.on('update-status', async (data) => {
        try {
          await Device.findByIdAndUpdate(device._id, {
            isOnline: data.isOnline,
            lastSeen: new Date()
          });
        } catch (error) {
          socket.emit('error', { message: '状态更新失败' });
        }
      });

      // 监听连接请求
      socket.on('connection-request', async (data) => {
        try {
          const { connectionId } = data;

          const connection = await Connection.findById(connectionId);
          if (!connection) {
            socket.emit('error', { message: '连接不存在' });
            return;
          }

          // 通知被控设备
          const targetSocket = onlineDevices.get(connection.deviceId.toString());
          if (targetSocket) {
            targetSocket.emit('incoming-connection', {
              connectionId,
              requesterInfo: connection.userId
                ? await User.findById(connection.userId).select('username email')
                : '匿名用户'
            });
          } else {
            socket.emit('error', { message: '目标设备不在线' });
          }
        } catch (error) {
          socket.emit('error', { message: '连接请求失败' });
        }
      });

      // 监听连接响应
      socket.on('connection-response', async (data) => {
        try {
          const { connectionId, accepted } = data;

          const connection = await Connection.findById(connectionId);
          if (!connection) return;

          if (accepted) {
            connection.status = 'connected';
            await connection.save();

            // 建立WebRTC连接的信令交换
            io.to(connection.userId?.toString()).emit('connection-established', {
              connectionId,
              deviceInfo: {
                deviceCode: (await Device.findById(connection.deviceId)).deviceCode
              }
            });
          } else {
            connection.status = 'disconnected';
            await connection.save();

            io.to(connection.userId?.toString()).emit('connection-rejected', {
              connectionId
            });
          }
        } catch (error) {
          socket.emit('error', { message: '连接响应失败' });
        }
      });

      // WebRTC信令交换
      socket.on('webrtc-offer', (data) => {
        const { connectionId, offer } = data;
        io.to(connectionId).emit('webrtc-offer', { offer, senderId: socket.id });
      });

      socket.on('webrtc-answer', (data) => {
        const { connectionId, answer } = data;
        io.to(connectionId).emit('webrtc-answer', { answer, senderId: socket.id });
      });

      socket.on('webrtc-ice-candidate', (data) => {
        const { connectionId, candidate } = data;
        io.to(connectionId).emit('webrtc-ice-candidate', { candidate, senderId: socket.id });
      });

      // 监听断开连接
      socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);

        try {
          // 更新设备离线状态
          if (socket.deviceId) {
            await Device.findByIdAndUpdate(socket.deviceId, {
              isOnline: false,
              lastSeen: new Date()
            });

            // 从Redis删除
            await redisService.setDeviceOffline(socket.deviceId);
            onlineDevices.delete(socket.deviceId);
          }

          // 清理活跃连接
          const activeConnections = await Connection.find({
            deviceId: socket.deviceId,
            status: 'connected'
          });

          for (const conn of activeConnections) {
            conn.status = 'disconnected';
            conn.endTime = new Date();
            await conn.save();

            // 通知远程端
            if (conn.userId) {
              io.to(conn.userId.toString()).emit('connection-disconnected', {
                connectionId: conn._id
              });
            }
          }
        } catch (error) {
          console.error('Disconnect error:', error);
        }
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      socket.disconnect();
    }
  });
};

module.exports = setupWebSocket;

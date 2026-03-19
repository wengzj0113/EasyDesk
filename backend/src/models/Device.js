const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 允许未登录用户使用
  },
  deviceCode: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4().substring(0, 6).toUpperCase()
  },
  deviceName: {
    type: String,
    default: '我的设备'
  },
  accessPassword: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['windows', 'mac', 'linux', 'android', 'ios'],
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  boundDevices: [{
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    },
    boundAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时间中间件
deviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 索引
deviceSchema.index({ deviceCode: 1 });
deviceSchema.index({ userId: 1 });
deviceSchema.index({ isOnline: 1 });

module.exports = mongoose.model('Device', deviceSchema);

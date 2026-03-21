const mongoose = require('mongoose');

// 生成6位纯数字设备码
const generateDeviceCode = () => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  // 确保不以0开头
  if (code[0] === '0') code = '1' + code.substring(1);
  return code;
};

const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  deviceCode: {
    type: String,
    required: true,
    unique: true,
    default: generateDeviceCode
  },
  deviceName: {
    type: String,
    default: '我的设备'
  },
  accessPassword: {
    type: String,
    required: true
  },
  // 长期密码（绑定设备后使用）
  permanentPassword: {
    type: String,
    default: null
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

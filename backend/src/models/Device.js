const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 生成9位纯数字设备码（使用加密安全的随机数）
const generateDeviceCode = () => {
  // 使用 crypto.randomBytes 生成安全的随机数
  const bytes = crypto.randomBytes(5); // 5字节 = 40位，足够生成9位数字
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += bytes[i % bytes.length].toString()[i % 10] || '0';
  }
  // 确保生成9位数字，且不以0开头
  code = code.split('').map((c, i) => {
    if (i === 0) return c === '0' ? '1' : c;
    return parseInt(c).toString();
  }).join('');

  // 如果不足9位，用随机数补足
  while (code.length < 9) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code.substring(0, 9);
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
  // 访问密码（加密存储）
  accessPassword: {
    type: String,
    required: true
  },
  // 长期密码（绑定设备后使用，加密存储）
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

// 密码加密中间件
deviceSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();

  // 密码加密
  if (this.isModified('accessPassword')) {
    const salt = await bcrypt.genSalt(10);
    this.accessPassword = await bcrypt.hash(this.accessPassword, salt);
  }
  if (this.isModified('permanentPassword') && this.permanentPassword) {
    const salt = await bcrypt.genSalt(10);
    this.permanentPassword = await bcrypt.hash(this.permanentPassword, salt);
  }

  next();
});

// 密码比较方法
deviceSchema.methods.compareAccessPassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.accessPassword);
};

// 永久密码比较方法
deviceSchema.methods.comparePermanentPassword = async function(candidatePassword) {
  if (!this.permanentPassword) return false;
  return bcrypt.compare(candidatePassword, this.permanentPassword);
};

// 索引
deviceSchema.index({ deviceCode: 1 });
deviceSchema.index({ userId: 1 });
deviceSchema.index({ isOnline: 1 });

module.exports = mongoose.model('Device', deviceSchema);

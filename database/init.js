/**
 * 数据库初始化脚本
 * 用于创建索引和初始化数据
 *
 * 使用方法: node init.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk';

async function initDatabase() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    // 创建索引
    await createIndexes();

    // 创建初始数据
    await createInitialData();

    console.log('\n数据库初始化完成!');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

async function createIndexes() {
  console.log('\n正在创建索引...');

  const User = require('../backend/src/models/User');
  const Device = require('../backend/src/models/Device');
  const Connection = require('../backend/src/models/Connection');

  // 用户索引
  await User.createIndexes({ username: 1, email: 1 });
  console.log('  - 用户索引创建完成');

  // 设备索引
  await Device.createIndexes({ deviceCode: 1 }, { unique: true });
  await Device.createIndexes({ userId: 1 });
  await Device.createIndexes({ isOnline: 1 });
  console.log('  - 设备索引创建完成');

  // 连接记录索引
  await Connection.createIndexes({ userId: 1 });
  await Connection.createIndexes({ deviceId: 1 });
  await Connection.createIndexes({ status: 1 });
  await Connection.createIndexes({ startTime: -1 });
  console.log('  - 连接记录索引创建完成');
}

async function createInitialData() {
  console.log('\n正在创建初始数据...');

  const User = require('../backend/src/models/User');
  const Device = require('../backend/src/models/Device');

  // 创建测试用户
  const testUser = await User.findOne({ username: 'test' });
  if (!testUser) {
    await User.create({
      username: 'test',
      email: 'test@example.com',
      password: '123456',
      vipStatus: true,
      vipExpireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    });
    console.log('  - 测试用户创建完成 (username: test, password: 123456)');
  } else {
    console.log('  - 测试用户已存在');
  }

  // 创建测试设备
  const testDevice = await Device.findOne({ deviceCode: 'TEST01' });
  if (!testDevice) {
    await Device.create({
      userId: testUser?._id,
      deviceCode: 'TEST01',
      deviceName: '测试设备',
      accessPassword: '123456',
      platform: 'windows',
      isOnline: false
    });
    console.log('  - 测试设备创建完成 (deviceCode: TEST01, password: 123456)');
  } else {
    console.log('  - 测试设备已存在');
  }
}

// 运行初始化
initDatabase();

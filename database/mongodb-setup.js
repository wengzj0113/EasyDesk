const { MongoClient } = require('mongodb');

async function setupMongoDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk';

  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('MongoDB连接成功！');

    const db = client.db('easydesk');

    // 创建必要的索引
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    await db.collection('devices').createIndex({ deviceCode: 1 }, { unique: true });
    await db.collection('devices').createIndex({ userId: 1 });
    await db.collection('devices').createIndex({ isOnline: 1 });

    await db.collection('connections').createIndex({ deviceId: 1 });
    await db.collection('connections').createIndex({ userId: 1 });
    await db.collection('connections').createIndex({ status: 1 });
    await db.collection('connections').createIndex({ startTime: -1 });

    console.log('数据库索引创建完成！');
    await client.close();
  } catch (error) {
    console.error('MongoDB连接错误:', error);
    process.exit(1);
  }
}

setupMongoDB();

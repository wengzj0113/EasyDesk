module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB配置
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // Redis配置
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },

  // 限流配置
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // 设备码配置
  deviceCode: {
    length: 6,
    charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  },

  // WebRTC配置
  webrtc: {
    stunServer: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
  },

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB
  },

  // 连接配置
  connection: {
    maxIdleTime: 30 * 60 * 1000,
  },
};

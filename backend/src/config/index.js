module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB配置
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk',
    options: {
      maxPoolSize: 10,
    }
  },

  // Redis配置
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('JWT_SECRET is required in production'); })()
      : 'dev-secret-key-do-not-use-in-production'),
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },

  // CORS配置：生产环境必须明确指定允许的域名
  cors: {
    origin: (() => {
      if (process.env.NODE_ENV === 'production') {
        if (!process.env.CORS_ORIGIN) {
          console.warn('警告: 生产环境未设置 CORS_ORIGIN，将只允许 localhost');
          return 'http://localhost:3000';
        }
        return process.env.CORS_ORIGIN;
      }
      return process.env.CORS_ORIGIN || 'http://localhost:3000';
    })(),
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
    length: 9,
    charset: '0123456789',
  },

  // WebRTC配置
  webrtc: {
    stunServer: process.env.WEBRTC_STUN_SERVER || 'stun:stun.l.google.com:19302',
    turnUrl: process.env.TURN_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnCredential: process.env.TURN_CREDENTIAL || '',
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

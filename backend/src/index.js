const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 路由导入
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const connectionRoutes = require('./routes/connection');
const vipRoutes = require('./routes/vip');
const settingsRoutes = require('./routes/settings');

// WebSocket处理器
const { initializeSocketIO } = require('./services/socketService');

// 中间件
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter, loginLimiter, connectionLimiter } = require('./middleware/rateLimiter');
const { requestLogger, logInfo, logError } = require('./middleware/logger');
const { sanitizeRequest, securityHeaders } = require('./middleware/security');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS 配置：生产环境必须明确指定允许的域名
const corsOrigin = (() => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.CORS_ORIGIN) {
      throw new Error('CORS_ORIGIN environment variable is required in production');
    }
    return process.env.CORS_ORIGIN;
  }
  return process.env.CORS_ORIGIN || 'http://localhost:3000';
})();

// HTTPS 重定向（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.hostname}${req.url}`);
    }
    next();
  });
}

const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 中间件配置
app.use(helmet());
app.use(cors());
app.use(requestLogger); // 添加请求日志
app.use(securityHeaders); // 安全响应头
app.use(sanitizeRequest); // XSS 防护
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(generalLimiter);

// 静态文件
app.use('/uploads', express.static('uploads'));

// API路由（登录和连接接口应用更严格的限速）
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/connection', connectionLimiter, connectionRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/settings', settingsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket设置
initializeSocketIO(io);

// 错误处理
app.use(errorHandler);

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk')
  .then(() => logInfo('MongoDB connected successfully'))
  .catch(err => logError('MongoDB connection failed', err));

/**
 * 优雅关闭处理器
 * 确保服务器在收到 SIGTERM/SIGINT 信号时正确关闭数据库连接
 * @param {string} signal - 收到的信号名称
 */
const gracefulShutdown = async (signal) => {
  console.log(`[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('[Server] HTTP server closed');
      console.log('[Server] MongoDB connection closed');
    } catch (err) {
      console.error('[Server] Error during shutdown:', err);
    } finally {
      console.log('[Server] Graceful shutdown complete');
      process.exit(0);
    }
  });
  // 强制退出：10秒内无法优雅关闭则强制终止
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// 监听终止信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logInfo(`Server started`, { port: PORT, env: process.env.NODE_ENV });
});

module.exports = { app, io };

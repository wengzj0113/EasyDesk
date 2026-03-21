const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

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
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || null)
  : (process.env.CORS_ORIGIN || 'http://localhost:3000');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/easydesk')
  .then(() => logInfo('MongoDB connected successfully'))
  .catch(err => logError('MongoDB connection failed', err));

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logInfo(`Server started`, { port: PORT, env: process.env.NODE_ENV });
});

module.exports = { app, io };

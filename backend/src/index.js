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

// WebSocket处理器
const { initializeSocketIO } = require('./services/socketService');

// 中间件
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter, loginLimiter, connectionLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

// 中间件配置
app.use(helmet());
app.use(cors());
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
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// 启动服务器
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io };

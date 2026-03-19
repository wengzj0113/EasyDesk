const rateLimit = require('express-rate-limit');

// 通用限流
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: { error: '请求过于频繁，请稍后再试' }
});

// 登录限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  message: { error: '登录尝试过多，请稍后再试' }
});

// 连接限流
const connectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 10, // 限制每个IP 1分钟内最多10次连接尝试
  message: { error: '连接请求过于频繁' }
});

module.exports = generalLimiter;

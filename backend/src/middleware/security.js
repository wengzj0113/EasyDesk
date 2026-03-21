// 安全检查中间件

const express = require('express');

/**
 * XSS 防护：清理请求体中的危险字符
 */
const sanitizeRequest = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // 移除潜在的 XSS 危险字符
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        value[key] = sanitizeValue(value[key]);
      }
    }
    return value;
  };

  if (req.body) {
    sanitizeValue(req.body);
  }
  if (req.query) {
    sanitizeValue(req.query);
  }
  if (req.params) {
    sanitizeValue(req.params);
  }

  next();
};

/**
 * 请求大小限制中间件
 */
const requestSizeLimit = (options = {}) => {
  const limit = options.limit || '1mb';
  return express.json({ limit });
};

/**
 * IP 黑名单检查（需要结合实际的黑名单数据源）
 */
const ipBlacklist = new Set(); // 可扩展为从数据库或Redis加载

const checkIPBlacklist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  if (ipBlacklist.has(clientIP)) {
    return res.status(403).json({ error: '访问被拒绝' });
  }

  next();
};

/**
 * 安全响应头中间件
 */
const securityHeaders = (req, res, next) => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // 防止 XSS 攻击
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // 防止 MIME 类型 sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 内容安全策略（根据实际需要调整）
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:;");

  next();
};

module.exports = {
  sanitizeRequest,
  requestSizeLimit,
  checkIPBlacklist,
  securityHeaders
};

// 安全检查中间件

const express = require('express');

/**
 * HTML 实体映射表
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * 对字符串进行 HTML 转义，防止 XSS
 * @param {string} str - 待转义字符串
 * @returns {string} 转义后的字符串
 */
const escapeHtml = (str) => {
  return String(str).replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
};

/**
 * XSS 防护：清理请求体中的危险字符
 * 使用白名单方式转义 HTML 特殊字符，而非简单的字符串替换
 */
const sanitizeRequest = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return escapeHtml(value);
    }
    if (typeof value === 'object' && value !== null) {
      const cloned = Array.isArray(value) ? [] : {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          cloned[key] = sanitizeValue(value[key]);
        }
      }
      return cloned;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
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

/**
 * 检查请求IP是否在黑名单中
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 下一个中间件
 */
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
/**
 * 安全响应头中间件
 * 设置 X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 下一个中间件
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

  next();
};

module.exports = {
  sanitizeRequest,
  requestSizeLimit,
  checkIPBlacklist,
  securityHeaders
};

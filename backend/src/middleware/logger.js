// 请求日志中间件

/**
 * 日志格式：[时间戳] [级别] 消息 {额外信息 JSON}
 * @param {string} level - 日志级别：INFO, WARN, ERROR
 * @param {string} message - 日志消息
 * @param {object} [meta={}] - 附加元数据
 * @returns {string} 格式化后的日志字符串
 */
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

/**
 * HTTP 请求日志记录中间件
 * 在请求开始时记录请求信息，在响应完成时记录处理结果和耗时
 * @param {import('express').Request} req - Express 请求对象
 * @param {import('express').Response} res - Express 响应对象
 * @param {import('express').NextFunction} next - 下一个中间件
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // 请求开始
  const { method, url, ip } = req;
  console.log(formatLog('INFO', 'Incoming request', { method, url, ip }));

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(formatLog(level, 'Request completed', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`
    }));
  });

  next();
};

/**
 * 错误日志工具函数
 * @param {string} context - 错误上下文描述
 * @param {Error|object} error - 错误对象或错误信息
 */
const logError = (context, error) => {
  console.error(formatLog('ERROR', context, {
    message: error?.message || String(error),
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
  }));
};

/**
 * 信息日志工具函数
 * @param {string} message - 日志消息
 * @param {object} [meta={}] - 附加元数据
 */
const logInfo = (message, meta = {}) => {
  console.log(formatLog('INFO', message, meta));
};

/**
 * 警告日志工具函数
 * @param {string} message - 日志消息
 * @param {object} [meta={}] - 附加元数据
 */
const logWarn = (message, meta = {}) => {
  console.warn(formatLog('WARN', message, meta));
};

module.exports = {
  requestLogger,
  logError,
  logInfo,
  logWarn,
  formatLog
};

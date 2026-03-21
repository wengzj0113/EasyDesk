// 请求日志中间件

// 日志格式：时间 [级别] 消息 {额外信息}
const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

// 请求日志中间件
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

// 错误日志工具函数
const logError = (context, error) => {
  console.error(formatLog('ERROR', context, {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  }));
};

// 信息日志工具函数
const logInfo = (message, meta = {}) => {
  console.log(formatLog('INFO', message, meta));
};

// 警告日志工具函数
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

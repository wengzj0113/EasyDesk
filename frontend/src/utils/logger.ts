/**
 * 日志工具模块
 * 提供分级日志功能，支持开发/生产环境配置
 * 在生产环境下自动降级日志级别，避免泄露敏感信息
 */

/** 日志级别枚举 */
export enum LogLevel {
  error = 0,
  warn = 1,
  info = 2,
  debug = 3,
}

/** 当前配置的日志级别：生产环境显示 warn 及以上，开发环境显示 debug */
const currentLevel = process.env.NODE_ENV === 'production' ? LogLevel.warn : LogLevel.debug;

/**
 * 创建带前缀的日志记录器
 * @param prefix - 日志前缀，用于区分模块
 * @returns 日志记录器对象
 */
export const createLogger = (prefix: string) => ({
  /**
   * 错误日志 - 应用于异常捕获和严重问题
   * @param args - 日志参数
   */
  error: (...args: unknown[]) => {
    if (LogLevel.error <= currentLevel) {
      console.error(`[${prefix}]`, ...args);
    }
  },

  /**
   * 警告日志 - 应用于潜在问题和非致命错误
   * @param args - 日志参数
   */
  warn: (...args: unknown[]) => {
    if (LogLevel.warn <= currentLevel) {
      console.warn(`[${prefix}]`, ...args);
    }
  },

  /**
   * 信息日志 - 应用于重要流程节点
   * @param args - 日志参数
   */
  info: (...args: unknown[]) => {
    if (LogLevel.info <= currentLevel) {
      console.info(`[${prefix}]`, ...args);
    }
  },

  /**
   * 调试日志 - 仅在开发环境显示
   * @param args - 日志参数
   */
  debug: (...args: unknown[]) => {
    if (LogLevel.debug <= currentLevel) {
      console.debug(`[${prefix}]`, ...args);
    }
  },
});

/** 默认日志记录器 */
export const logger = createLogger('App');

export default logger;
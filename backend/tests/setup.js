/**
 * Jest 测试环境配置
 * 在所有测试运行前设置必需的环境变量
 */

// 设置 JWT_SECRET（安全修复后必需的）
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests-only';

// 设置测试环境
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// 减少日志噪音
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
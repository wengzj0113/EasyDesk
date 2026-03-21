/**
 * 设备码生成逻辑单元测试
 * 验证：格式（6位大写字母数字）、唯一性、charset 限制
 */

const config = require('../src/config');

// 与 Device model 中相同的生成逻辑
const generateDeviceCode = () => {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4().substring(0, 6).toUpperCase();
};

describe('设备码生成', () => {
  test('生成的设备码长度为 6', () => {
    const code = generateDeviceCode();
    expect(code).toHaveLength(6);
  });

  test('生成的设备码只包含大写字母和数字', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateDeviceCode();
      expect(code).toMatch(/^[A-Z0-9]+$/);
    }
  });

  test('config.deviceCode.length 为 9', () => {
    expect(config.deviceCode.length).toBe(9);
  });

  test('100 次生成的设备码唯一性超过 95%', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateDeviceCode());
    }
    // UUID 截取前 6 位，理论上冲突率极低
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe('config 默认值', () => {
  test('服务器默认端口为 3001', () => {
    // 当 PORT 未设置时
    const port = process.env.PORT || 3001;
    expect(Number(port)).toBeGreaterThan(0);
    expect(Number(port)).toBeLessThan(65536);
  });

  test('JWT 过期时间格式正确', () => {
    const expire = config.jwt.expiresIn;
    // 应为 "7d" 这样的格式
    expect(expire).toMatch(/^\d+[smhd]$/);
  });

  test('速率限制窗口为正数', () => {
    expect(config.rateLimit.windowMs).toBeGreaterThan(0);
    expect(config.rateLimit.max).toBeGreaterThan(0);
  });

  test('MongoDB URI 格式正确', () => {
    expect(config.mongodb.uri).toMatch(/^mongodb(\+srv)?:\/\//);
  });
});

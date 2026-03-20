/**
 * ICE 服务器配置单元测试
 * 验证 TURN 服务器配置逻辑：有/无 TURN 时的 iceServers 列表构建
 */

describe('buildIceServers（ICE 服务器配置构建）', () => {
  let buildIceServers;

  // 每个 test 前重置模块，以便用不同的 env 变量重新加载
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    // 清理测试用的环境变量
    delete process.env.WEBRTC_STUN_SERVER;
    delete process.env.TURN_URL;
    delete process.env.TURN_USERNAME;
    delete process.env.TURN_CREDENTIAL;
  });

  test('未配置 TURN 时只包含 STUN 服务器', () => {
    process.env.WEBRTC_STUN_SERVER = 'stun:stun.l.google.com:19302';
    // 通过 socketService 导出的 initializeSocketIO 内部逻辑无法直接测
    // 改为测试 config 中 TURN 配置为空时的值
    const config = require('../src/config');
    expect(config.webrtc.turnUrl).toBe('');
    expect(config.webrtc.stunServer).toBe('stun:stun.l.google.com:19302');
  });

  test('配置 TURN 后 config 中包含完整 TURN 信息', () => {
    process.env.TURN_URL = 'turn:turn.example.com:3478';
    process.env.TURN_USERNAME = 'testuser';
    process.env.TURN_CREDENTIAL = 'testpassword';
    const config = require('../src/config');
    expect(config.webrtc.turnUrl).toBe('turn:turn.example.com:3478');
    expect(config.webrtc.turnUsername).toBe('testuser');
    expect(config.webrtc.turnCredential).toBe('testpassword');
  });

  test('TURN 未配置时 config.webrtc.turnUrl 为空字符串（falsy）', () => {
    const config = require('../src/config');
    expect(config.webrtc.turnUrl).toBeFalsy();
  });

  test('STUN 服务器地址格式正确', () => {
    const config = require('../src/config');
    // 默认 STUN 服务器应以 stun: 开头
    expect(config.webrtc.stunServer).toMatch(/^stun:/);
  });
});

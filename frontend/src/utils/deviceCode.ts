/**
 * 会话设备码工具
 * 未登录时生成并持久化到 localStorage 的临时设备码，用于 P2P 信令注册。
 * 登录后应优先使用从 API 获取的持久化设备码。
 */

const CODE_KEY = 'session-device-code';
const PWD_KEY = 'session-device-password';

/**
 * 使用 Web Crypto API 生成密码学安全的随机码
 * @param len - 验证码长度
 * @returns 指定长度的随机字母数字字符串
 */
const randomCode = (len: number): string => {
  const array = new Uint8Array(len);
  crypto.getRandomValues(array);
  return Array.from(array, b => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[b % 36])
    .join('').substring(0, len);
};

/**
 * 获取或生成会话设备码
 * @returns 9位设备码
 */
export const getSessionDeviceCode = (): string => {
  let code = localStorage.getItem(CODE_KEY);
  if (!code || code.length !== 9) {
    code = randomCode(6);
    localStorage.setItem(CODE_KEY, code);
  }
  return code;
};

/**
 * 获取或生成会话密码
 * @returns 6位随机密码
 */
export const getSessionPassword = (): string => {
  let pwd = localStorage.getItem(PWD_KEY);
  if (!pwd || pwd.length < 4) {
    pwd = randomCode(6);
    localStorage.setItem(PWD_KEY, pwd);
  }
  return pwd;
};

/**
 * 手动设置会话设备码
 * @param code - 设备码
 */
export const setSessionDeviceCode = (code: string) =>
  localStorage.setItem(CODE_KEY, code);

/**
 * 手动设置会话密码
 * @param pwd - 密码
 */
export const setSessionPassword = (pwd: string) =>
  localStorage.setItem(PWD_KEY, pwd);

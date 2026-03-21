/**
 * 会话设备码工具
 * 未登录时生成并持久化到 localStorage 的临时设备码，用于 P2P 信令注册。
 * 登录后应优先使用从 API 获取的持久化设备码。
 */

const CODE_KEY = 'session-device-code';
const PWD_KEY = 'session-device-password';

const randomCode = (len: number) =>
  Math.random().toString(36).substring(2, 2 + len).toUpperCase().padEnd(len, 'A').substring(0, len);

export const getSessionDeviceCode = (): string => {
  let code = localStorage.getItem(CODE_KEY);
  if (!code || code.length !== 9) {
    code = randomCode(6);
    localStorage.setItem(CODE_KEY, code);
  }
  return code;
};

export const getSessionPassword = (): string => {
  let pwd = localStorage.getItem(PWD_KEY);
  if (!pwd || pwd.length < 4) {
    pwd = randomCode(6);
    localStorage.setItem(PWD_KEY, pwd);
  }
  return pwd;
};

export const setSessionDeviceCode = (code: string) =>
  localStorage.setItem(CODE_KEY, code);

export const setSessionPassword = (pwd: string) =>
  localStorage.setItem(PWD_KEY, pwd);

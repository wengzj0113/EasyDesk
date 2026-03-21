// 输入验证和清理工具

// 验证用户名（3-20个字符，只能包含字母、数字、下划线）
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: '用户名不能为空' };
  }
  if (username.length < 3 || username.length > 20) {
    return { valid: false, error: '用户名长度必须在3-20个字符之间' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: '用户名只能包含字母、数字和下划线' };
  }
  return { valid: true };
};

// 验证邮箱
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: '邮箱不能为空' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: '邮箱格式不正确' };
  }
  if (email.length > 100) {
    return { valid: false, error: '邮箱长度不能超过100个字符' };
  }
  return { valid: true };
};

// 验证密码（至少6个字符）
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: '密码不能为空' };
  }
  if (password.length < 6) {
    return { valid: false, error: '密码长度不能少于6个字符' };
  }
  if (password.length > 128) {
    return { valid: false, error: '密码长度不能超过128个字符' };
  }
  return { valid: true };
};

// 验证设备码（9位数字）
const validateDeviceCode = (deviceCode) => {
  if (!deviceCode || typeof deviceCode !== 'string') {
    return { valid: false, error: '设备码不能为空' };
  }
  const normalized = deviceCode.toUpperCase();
  if (!/^\d{9}$/.test(normalized)) {
    return { valid: false, error: '设备码必须是9位数字' };
  }
  return { valid: true, normalized };
};

// 验证连接密码（4-6位数字）
const validateConnectionPassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: '密码不能为空' };
  }
  if (!/^\d{4,6}$/.test(password)) {
    return { valid: false, error: '密码必须是4-6位数字' };
  }
  return { valid: true };
};

// 验证 MongoDB ObjectId
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return { valid: false, error: 'ID不能为空' };
  }
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return { valid: false, error: 'ID格式不正确' };
  }
  return { valid: true };
};

// 清理字符串输入（去除首尾空格，限制长度）
const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

// 验证分页参数
const validatePagination = (page, pageSize, maxPageSize = 100) => {
  const p = parseInt(page) || 1;
  const ps = Math.min(parseInt(pageSize) || 20, maxPageSize);
  return {
    page: Math.max(1, p),
    pageSize: Math.max(1, ps)
  };
};

module.exports = {
  validateUsername,
  validateEmail,
  validatePassword,
  validateDeviceCode,
  validateConnectionPassword,
  validateObjectId,
  sanitizeString,
  validatePagination
};

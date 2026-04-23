const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateUsername, validateEmail, validatePassword } = require('../middleware/validator');
const { logError } = require('../middleware/logger');
const config = require('../config');

/**
 * POST /api/auth/register
 * 用户注册接口
 * @param {string} username - 用户名（3-20字符，字母数字下划线）
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码（6-20字符）
 * @returns {object} { message, token, user }
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 输入验证
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // 检查用户是否存在
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // 创建新用户
    const user = new User({ username, email, password });
    await user.save();

    // 生成token
    const token = jwt.sign(
      { userId: user._id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        vipStatus: user.vipStatus,
        vipExpireTime: user.vipExpireTime
      }
    });
  } catch (error) {
    logError('用户注册失败', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录接口
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {object} { message, token, user }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = await User.findOne({ username });

    // 使用固定延迟防止时间差攻击（无论用户是否存在都执行）
    const FIXED_DELAY_MS = 50;
    await new Promise(resolve => setTimeout(resolve, FIXED_DELAY_MS));

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成token
    const token = jwt.sign(
      { userId: user._id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        vipStatus: user.vipStatus,
        vipExpireTime: user.vipExpireTime
      }
    });
  } catch (error) {
    logError('用户登录失败', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * POST /api/auth/logout
 * 用户登出接口（JWT无状态，客户端清除token即可）
 * @returns {object} { message }
 */
router.post('/logout', (req, res) => {
  // JWT是无状态的，登出主要在客户端处理token清除
  res.json({ message: '登出成功' });
});

module.exports = router;

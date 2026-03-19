const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// 获取VIP状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isVip = user.vipStatus && user.vipExpireTime > new Date();

    res.json({
      isVip,
      vipExpireTime: user.vipExpireTime,
      remainingDays: isVip
        ? Math.ceil((user.vipExpireTime - new Date()) / (1000 * 60 * 60 * 24))
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: '获取VIP状态失败', details: error.message });
  }
});

// 创建支付订单
router.post('/payment', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body;

    // 套餐配置
    const plans = {
      'month': { duration: 30, price: 9.9 },
      'quarter': { duration: 90, price: 26.9 },
      'year': { duration: 365, price: 89.9 }
    };

    const selectedPlan = plans[plan];
    if (!selectedPlan) {
      return res.status(400).json({ error: '无效的套餐' });
    }

    // 这里应该集成支付网关（微信支付、支付宝等）
    // 简化处理，直接返回支付信息
    const paymentInfo = {
      orderId: `VIP_${Date.now()}_${userId}`,
      amount: selectedPlan.price,
      plan: plan,
      duration: selectedPlan.duration
    };

    // 实际项目中，这里应该：
    // 1. 调用支付网关API创建订单
    // 2. 返回支付参数给前端
    // 3. 监听支付回调
    // 4. 支付成功后更新用户VIP状态

    res.json({
      message: '订单创建成功',
      payment: paymentInfo
    });
  } catch (error) {
    res.status(500).json({ error: '创建支付订单失败', details: error.message });
  }
});

// 支付回调（示例）
router.post('/callback', async (req, res) => {
  try {
    const { orderId, status, userId, plan } = req.body;

    if (status !== 'success') {
      return res.json({ message: '支付失败' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 套餐配置
    const plans = {
      'month': 30,
      'quarter': 90,
      'year': 365
    };
    const duration = plans[plan] || 30;

    // 计算VIP过期时间
    const now = new Date();
    const baseTime = user.vipExpireTime && user.vipExpireTime > now ? user.vipExpireTime : now;
    const expireTime = new Date(baseTime.getTime() + duration * 24 * 60 * 60 * 1000);

    user.vipStatus = true;
    user.vipExpireTime = expireTime;
    await user.save();

    res.json({ message: 'VIP激活成功' });
  } catch (error) {
    res.status(500).json({ error: '处理支付回调失败', details: error.message });
  }
});

// 模拟支付成功（测试用）
router.post('/simulate-payment', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body;

    const plans = {
      'month': 30,
      'quarter': 90,
      'year': 365
    };
    const duration = plans[plan] || 30;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const now = new Date();
    const baseTime = user.vipExpireTime && user.vipExpireTime > now ? user.vipExpireTime : now;
    const expireTime = new Date(baseTime.getTime() + duration * 24 * 60 * 60 * 1000);

    user.vipStatus = true;
    user.vipExpireTime = expireTime;
    await user.save();

    res.json({
      message: 'VIP激活成功',
      vipStatus: true,
      vipExpireTime: expireTime
    });
  } catch (error) {
    res.status(500).json({ error: '操作失败', details: error.message });
  }
});

module.exports = router;

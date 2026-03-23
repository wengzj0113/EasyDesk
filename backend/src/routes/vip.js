const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { logError } = require('../middleware/logger');

// VIP套餐配置
const VIP_PLANS = {
  'month': { duration: 30, price: 9.9 },
  'quarter': { duration: 90, price: 26.9 },
  'year': { duration: 365, price: 89.9 }
};

// 获取VIP状态
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const now = new Date();
    const isVip = user.vipStatus && user.vipExpireTime && user.vipExpireTime > now;

    res.json({
      isVip,
      vipExpireTime: user.vipExpireTime,
      remainingDays: isVip
        ? Math.max(0, Math.ceil((user.vipExpireTime - now) / (1000 * 60 * 60 * 24)))
        : 0
    });
  } catch (error) {
    logError('获取VIP状态失败', error);
    res.status(500).json({ error: '获取VIP状态失败' });
  }
});

// 创建支付订单
router.post('/payment', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body;

    if (!plan || !VIP_PLANS[plan]) {
      return res.status(400).json({ error: '无效的套餐，请选择 month、quarter 或 year' });
    }

    const selectedPlan = VIP_PLANS[plan];

    // 生成订单号
    const orderId = `VIP_${Date.now()}_${userId}`;

    // 这里应该集成支付网关（微信支付、支付宝等）
    // 简化处理，直接返回支付信息
    const paymentInfo = {
      orderId,
      amount: selectedPlan.price,
      plan: plan,
      duration: selectedPlan.duration,
      currency: 'CNY'
    };

    res.json({
      message: '订单创建成功',
      payment: paymentInfo
    });
  } catch (error) {
    logError('创建支付订单失败', error);
    res.status(500).json({ error: '创建支付订单失败' });
  }
});

// 支付回调（示例）
router.post('/callback', async (req, res) => {
  try {
    const { orderId, status, userId, plan } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (status !== 'success') {
      return res.json({ message: '支付失败' });
    }

    // 验证支付签名（防止伪造回调）
    const signature = req.headers['x-payment-signature'];
    const paymentSecret = process.env.PAYMENT_SECRET;

    // 生产环境必须设置支付密钥
    if (!paymentSecret) {
      logError('支付密钥未配置', {});
      return res.status(500).json({ error: '服务器配置错误' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', paymentSecret)
      .update(JSON.stringify({ orderId, status, userId, plan }))
      .digest('hex');

    if (!signature || signature !== expectedSignature) {
      logError('支付回调签名验证失败', { orderId, userId });
      return res.status(403).json({ error: '签名验证失败' });
    }

    // 幂等性检查：验证订单是否已处理
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const alreadyProcessed = existingUser.processedOrders?.some(
      order => order.orderId === orderId
    );

    if (alreadyProcessed) {
      logWarn('重复的支付回调', { orderId, userId });
      return res.json({
        message: '订单已处理',
        vipStatus: existingUser.vipStatus,
        vipExpireTime: existingUser.vipExpireTime
      });
    }

    const duration = VIP_PLANS[plan]?.duration || VIP_PLANS['month'].duration;

    // 计算VIP过期时间
    const now = new Date();
    const baseTime = existingUser.vipExpireTime && existingUser.vipExpireTime > now
      ? existingUser.vipExpireTime
      : now;
    const expireTime = new Date(baseTime.getTime() + duration * 24 * 60 * 60 * 1000);

    // 原子性更新：添加订单记录并更新VIP状态
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          vipStatus: true,
          vipExpireTime: expireTime
        },
        $addToSet: {
          processedOrders: {
            orderId,
            plan,
            processedAt: now
          }
        }
      },
      { new: true }
    );

    logInfo('VIP激活成功', { orderId, userId, plan, expireTime });

    res.json({
      message: 'VIP激活成功',
      vipStatus: user.vipStatus,
      vipExpireTime: user.vipExpireTime
    });
  } catch (error) {
    logError('处理支付回调失败', error);
    res.status(500).json({ error: '处理支付回调失败' });
  }
});

// 模拟支付成功（测试用）
router.post('/simulate-payment', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { plan } = req.body;

    if (!plan || !VIP_PLANS[plan]) {
      return res.status(400).json({ error: '无效的套餐' });
    }

    // 生成测试订单号
    const orderId = `VIP_${Date.now()}_${userId}`;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 幂等性检查
    const alreadyProcessed = user.processedOrders?.some(
      order => order.orderId === orderId
    );

    if (alreadyProcessed) {
      return res.json({
        message: '订单已处理',
        vipStatus: user.vipStatus,
        vipExpireTime: user.vipExpireTime,
        remainingDays: user.vipExpireTime
          ? Math.max(0, Math.ceil((user.vipExpireTime - new Date()) / (1000 * 60 * 60 * 24)))
          : 0
      });
    }

    const duration = VIP_PLANS[plan].duration;

    const now = new Date();
    const baseTime = user.vipExpireTime && user.vipExpireTime > now ? user.vipExpireTime : now;
    const expireTime = new Date(baseTime.getTime() + duration * 24 * 60 * 60 * 1000);

    // 原子性更新
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          vipStatus: true,
          vipExpireTime: expireTime
        },
        $addToSet: {
          processedOrders: {
            orderId,
            plan,
            processedAt: now
          }
        }
      },
      { new: true }
    );

    res.json({
      message: 'VIP激活成功',
      vipStatus: updatedUser.vipStatus,
      vipExpireTime: updatedUser.vipExpireTime,
      remainingDays: duration
    });
  } catch (error) {
    logError('模拟支付失败', error);
    res.status(500).json({ error: '操作失败' });
  }
});

module.exports = router;

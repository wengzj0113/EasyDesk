const redis = require('redis');
const config = require('../config');

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = redis.createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        console.log('Redis ready');
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error('Redis connection error:', error);
      // 不阻塞应用启动
      return null;
    }
  }

  // 设备在线状态管理
  async setDeviceOnline(deviceId, data, ttl = 300) {
    if (!this.client || !this.isConnected) return null;
    const key = `device:online:${deviceId}`;
    await this.client.setEx(key, ttl, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  }

  async getDeviceOnline(deviceId) {
    if (!this.client || !this.isConnected) return null;
    const key = `device:online:${deviceId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setDeviceOffline(deviceId) {
    if (!this.client || !this.isConnected) return null;
    const key = `device:online:${deviceId}`;
    await this.client.del(key);
  }

  // 连接会话管理
  async createSession(connectionId, data, ttl = 3600) {
    if (!this.client || !this.isConnected) return null;
    const key = `connection:session:${connectionId}`;
    await this.client.setEx(key, ttl, JSON.stringify(data));
  }

  async getSession(connectionId) {
    if (!this.client || !this.isConnected) return null;
    const key = `connection:session:${connectionId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async updateSession(connectionId, data) {
    if (!this.client || !this.isConnected) return null;
    const existing = await this.getSession(connectionId);
    if (!existing) return null;
    const key = `connection:session:${connectionId}`;
    await this.client.set(key, JSON.stringify({ ...existing, ...data }));
  }

  async deleteSession(connectionId) {
    if (!this.client || !this.isConnected) return null;
    const key = `connection:session:${connectionId}`;
    await this.client.del(key);
  }

  // 限流
  async checkRateLimit(key, windowMs, max) {
    if (!this.client || !this.isConnected) return { allowed: true };

    const rateKey = `rate_limit:${key}`;
    const current = await this.client.incr(rateKey);

    if (current === 1) {
      await this.client.pexpire(rateKey, windowMs);
    }

    const ttl = await this.client.ttl(rateKey);
    return {
      allowed: current <= max,
      remaining: Math.max(0, max - current),
      resetTime: ttl > 0 ? Date.now() + ttl * 1000 : null
    };
  }

  // 缓存用户会话
  async cacheUserSession(userId, sessionData, ttl = 86400) {
    if (!this.client || !this.isConnected) return null;
    const key = `user:session:${userId}`;
    await this.client.setEx(key, ttl, JSON.stringify(sessionData));
  }

  async getUserSession(userId) {
    if (!this.client || !this.isConnected) return null;
    const key = `user:session:${userId}`;
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId) {
    if (!this.client || !this.isConnected) return null;
    const key = `user:session:${userId}`;
    await this.client.del(key);
  }

  // 通用操作
  async get(key) {
    if (!this.client || !this.isConnected) return null;
    return await this.client.get(key);
  }

  async set(key, value, ttl) {
    if (!this.client || !this.isConnected) return null;
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key) {
    if (!this.client || !this.isConnected) return null;
    await this.client.del(key);
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
    }
  }
}

module.exports = new RedisService();

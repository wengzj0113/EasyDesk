# EasyDesk 数据库设计文档

## 数据库概述

EasyDesk 使用 MongoDB 作为主数据库，Redis 作为缓存和实时状态存储。

## 数据表设计

### 1. 用户表 (users)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| _id | ObjectId | 用户ID | 主键 |
| username | String | 用户名 | 唯一, 3-20字符 |
| email | String | 邮箱 | 唯一, 邮箱格式 |
| password | String | 密码 | bcrypt加密 |
| vipStatus | Boolean | VIP状态 | 默认false |
| vipExpireTime | Date | VIP过期时间 | 可为null |
| createdAt | Date | 创建时间 | 自动生成 |
| updatedAt | Date | 更新时间 | 自动更新 |

**索引：**
- username (unique)
- email (unique)

### 2. 设备表 (devices)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| _id | ObjectId | 设备ID | 主键 |
| userId | ObjectId | 所属用户ID | 外键(可选) |
| deviceCode | String | 设备码 | 唯一, 6位大写字母 |
| deviceName | String | 设备名称 | 默认"我的设备" |
| accessPassword | String | 访问密码 | 必填 |
| platform | String | 平台类型 | windows/mac/linux/android/ios |
| isOnline | Boolean | 在线状态 | 默认false |
| lastSeen | Date | 最后活跃时间 | 自动更新 |
| boundDevices | Array | 绑定设备列表 | 嵌套文档 |
| createdAt | Date | 创建时间 | 自动生成 |
| updatedAt | Date | 更新时间 | 自动更新 |

**boundDevices 结构：**
```javascript
{
  deviceId: ObjectId,      // 绑定的设备ID
  deviceName: String,      // 自定义设备名称
  boundAt: Date           // 绑定时间
}
```

**索引：**
- deviceCode (unique)
- userId
- isOnline

### 3. 连接记录表 (connections)

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| _id | ObjectId | 连接ID | 主键 |
| deviceId | ObjectId | 目标设备ID | 外键 |
| userId | ObjectId | 连接发起用户ID | 外键(可选) |
| remoteUserId | ObjectId | 远程用户ID | 外键(可选) |
| connectionType | String | 连接类型 | direct/bound |
| status | String | 连接状态 | connecting/connected/disconnected/error |
| startTime | Date | 开始时间 | 默认当前时间 |
| endTime | Date | 结束时间 | 可为null |
| quality | Object | 连接质量 | 嵌套文档 |
| dataTransferred | Number | 数据传输量 | 字节, 默认0 |
| error | String | 错误信息 | 可为null |

**quality 结构：**
```javascript
{
  resolution: String,  // 分辨率, 如 "1920x1080"
  fps: Number,        // 帧率
  latency: Number     // 延迟(ms)
}
```

**索引：**
- deviceId
- userId
- status
- startTime (降序)

## Redis 数据结构

### 1. 设备在线状态
```
Key: device:online:{deviceId}
Value: { timestamp, lastSeen, status }
TTL: 300秒 (5分钟)
```

### 2. 连接会话
```
Key: connection:session:{connectionId}
Value: { socketId, participants, status }
TTL: 3600秒 (1小时)
```

### 3. 限流计数器
```
Key: rate_limit:{userId}:{action}
Value: count
TTL: 根据不同限流规则设置
```

## 数据关系图

```
User (1) ----< (N) Device
  |
  +----< (N) Connection (as requester)

Device (1) ----< (N) Connection (as target)
  |
  +----< (N) Device (as bound device)
```

## 数据迁移策略

### 初始化脚本
1. 创建管理员账户
2. 设置初始VIP套餐
3. 创建测试设备

### 备份策略
- 每日全量备份
- 实时增量备份
- 异地灾备

## 性能优化

### 查询优化
- 为常用查询字段创建索引
- 使用适当的分页
- 避免大文档查询

### 缓存策略
- 热点数据缓存到Redis
- 设置合理的过期时间
- 缓存失效策略

## 安全考虑

### 数据加密
- 密码使用bcrypt加密
- 敏感数据传输加密
- 定期更新加密算法

### 访问控制
- 基于角色的访问控制
- API访问频率限制
- 异常访问监控

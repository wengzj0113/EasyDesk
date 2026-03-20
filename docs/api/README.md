# EasyDesk API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3001/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

### 错误响应
```json
{
  "code": 400,
  "message": "错误信息",
  "error": "详细错误描述"
}
```

## 认证接口

### 1. 用户注册
**POST** `/auth/register`

**请求参数：**
```json
{
  "username": "string (3-20字符)",
  "email": "string (邮箱格式)",
  "password": "string (最少6字符)"
}
```

**响应示例：**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "testuser",
      "email": "test@example.com",
      "vipStatus": false,
      "vipExpireTime": null
    }
  }
}
```

### 2. 用户登录
**POST** `/auth/login`

**请求参数：**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "testuser",
      "email": "test@example.com",
      "vipStatus": false,
      "vipExpireTime": null
    }
  }
}
```

### 3. 用户登出
**POST** `/auth/logout`

**请求头：**
```
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "登出成功"
}
```

## 设备接口

### 1. 获取设备码
**GET** `/device/code`

**请求头：**
```
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "deviceCode": "ABC123",
    "deviceName": "我的设备",
    "isOnline": true
  }
}
```

### 2. 更新设备密码
**POST** `/device/password`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "newPassword": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "密码更新成功"
}
```

### 3. 获取我的设备列表
**GET** `/device/my-devices`

**请求头：**
```
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "devices": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "deviceCode": "ABC123",
        "deviceName": "我的设备",
        "isOnline": true,
        "lastSeen": "2024-01-01T12:00:00Z",
        "boundDevices": [
          {
            "deviceId": "507f1f77bcf86cd799439012",
            "deviceName": "办公室电脑",
            "deviceCode": "XYZ789",
            "isOnline": true,
            "boundAt": "2024-01-01T10:00:00Z"
          }
        ]
      }
    ]
  }
}
```

### 4. 绑定设备
**POST** `/device/bind`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "deviceCode": "string (6位设备码)",
  "deviceName": "string (可选, 自定义设备名称)"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "设备绑定成功"
}
```

### 5. 解绑设备
**DELETE** `/device/{deviceId}`

**请求头：**
```
Authorization: Bearer {token}
```

**路径参数：**
- `deviceId`: 设备ID

**响应示例：**
```json
{
  "code": 200,
  "message": "设备解绑成功"
}
```

## 连接接口

### 1. 建立连接
**POST** `/connection/connect`

**请求参数：**
```json
{
  "deviceCode": "string (6位设备码)",
  "password": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "连接请求已发送",
  "data": {
    "connectionId": "507f1f77bcf86cd799439011",
    "deviceInfo": {
      "deviceCode": "ABC123",
      "deviceName": "我的设备",
      "platform": "windows"
    }
  }
}
```

### 2. 断开连接
**POST** `/connection/disconnect`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "connectionId": "string"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "连接已断开"
}
```

### 3. 获取连接状态
**GET** `/connection/status`

**请求头：**
```
Authorization: Bearer {token}
```

**查询参数：**
- `connectionId` (可选): 连接ID

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "connections": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "deviceId": {
          "deviceCode": "ABC123",
          "deviceName": "我的设备",
          "platform": "windows"
        },
        "connectionType": "direct",
        "status": "connected",
        "startTime": "2024-01-01T12:00:00Z",
        "endTime": null,
        "quality": {
          "resolution": "1920x1080",
          "fps": 30,
          "latency": 120
        },
        "dataTransferred": 1024000
      }
    ]
  }
}
```

## VIP接口

### 1. 获取VIP状态
**GET** `/vip/status`

**请求头：**
```
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "isVip": true,
    "vipExpireTime": "2024-12-31T23:59:59Z",
    "remainingDays": 365
  }
}
```

### 2. 创建支付订单
**POST** `/vip/payment`

**请求头：**
```
Authorization: Bearer {token}
```

**请求参数：**
```json
{
  "plan": "string (month/quarter/year)"
}
```

**响应示例：**
```json
{
  "code": 200,
  "message": "订单创建成功",
  "data": {
    "payment": {
      "orderId": "VIP_1704067200000_507f1f77bcf86cd799439011",
      "amount": 9.9,
      "plan": "month",
      "duration": 30
    }
  }
}
```

## WebSocket 接口

### 连接地址
```
ws://localhost:3001
```

### 认证方式
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token' // 或 userId: 'user-id'
  }
});
```

### 事件列表

#### 客户端 -> 服务端

**1. 设备状态更新**
```javascript
socket.emit('update-status', {
  isOnline: true
});
```

**2. 连接请求**
```javascript
socket.emit('connection-request', {
  connectionId: '507f1f77bcf86cd799439011'
});
```

**3. 连接响应**
```javascript
socket.emit('connection-response', {
  connectionId: '507f1f77bcf86cd799439011',
  accepted: true
});
```

**4. WebRTC Offer**
```javascript
socket.emit('webrtc-offer', {
  connectionId: '507f1f77bcf86cd799439011',
  offer: { /* WebRTC SDP Offer */ }
});
```

**5. WebRTC Answer**
```javascript
socket.emit('webrtc-answer', {
  connectionId: '507f1f77bcf86cd799439011',
  answer: { /* WebRTC SDP Answer */ }
});
```

**6. WebRTC ICE Candidate**
```javascript
socket.emit('webrtc-ice-candidate', {
  connectionId: '507f1f77bcf86cd799439011',
  candidate: { /* ICE Candidate */ }
});
```

#### 服务端 -> 客户端

**1. 设备信息**
```javascript
socket.on('device-info', (data) => {
  console.log(data);
  // {
  //   deviceCode: 'ABC123',
  //   deviceName: '我的设备',
  //   isOnline: true
  // }
});
```

**2. 来电连接**
```javascript
socket.on('incoming-connection', (data) => {
  console.log(data);
  // {
  //   connectionId: '507f1f77bcf86cd799439011',
  //   requesterInfo: { username: 'testuser', email: 'test@example.com' }
  // }
});
```

**3. 连接建立成功**
```javascript
socket.on('connection-established', (data) => {
  console.log(data);
  // {
  //   connectionId: '507f1f77bcf86cd799439011',
  //   deviceInfo: { deviceCode: 'ABC123' }
  // }
});
```

**4. 连接被拒绝**
```javascript
socket.on('connection-rejected', (data) => {
  console.log(data);
  // { connectionId: '507f1f77bcf86cd799439011' }
});
```

**5. 连接断开**
```javascript
socket.on('connection-disconnected', (data) => {
  console.log(data);
  // { connectionId: '507f1f77bcf86cd799439011' }
});
```

**6. WebRTC相关事件**
```javascript
socket.on('webrtc-offer', (data) => {
  // { offer, senderId }
});

socket.on('webrtc-answer', (data) => {
  // { answer, senderId }
});

socket.on('webrtc-ice-candidate', (data) => {
  // { candidate, senderId }
});
```

**7. 错误信息**
```javascript
socket.on('error', (data) => {
  console.log(data);
  // { message: '错误描述' }
});
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

## 限流规则

| 接口类型 | 时间窗口 | 最大请求次数 |
|----------|----------|--------------|
| 通用接口 | 15分钟 | 100次 |
| 登录接口 | 15分钟 | 5次 |
| 连接接口 | 1分钟 | 10次 |

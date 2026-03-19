import { io, Socket } from 'socket.io-client';
import { message } from 'antd';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  // 连接WebSocket
  connect(token: string, userId?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      auth: { token, userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();

    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.emit('connected', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      message.error('连接服务器失败，请检查网络');
    });

    // 设备相关事件
    this.socket.on('device-info', (data) => {
      console.log('Device info:', data);
      this.emit('device-info', data);
    });

    // 连接请求事件（被控端收到）
    this.socket.on('incoming-connection', (data) => {
      console.log('Incoming connection:', data);
      this.emit('incoming-connection', data);
      message.info('收到远程连接请求');
    });

    // 连接已建立（主控端收到）
    this.socket.on('connection-established', (data) => {
      console.log('Connection established:', data);
      this.emit('connection-established', data);
      message.success('连接已建立');
    });

    // 连接被拒绝
    this.socket.on('connection-rejected', (data) => {
      console.log('Connection rejected:', data);
      this.emit('connection-rejected', data);
      message.warning('对方拒绝了连接请求');
    });

    // 连接已断开
    this.socket.on('connection-disconnected', (data) => {
      console.log('Connection disconnected:', data);
      this.emit('connection-disconnected', data);
      message.warning('连接已断开');
    });

    // WebRTC信令
    this.socket.on('webrtc-offer', (data) => {
      this.emit('webrtc-offer', data);
    });

    this.socket.on('webrtc-answer', (data) => {
      this.emit('webrtc-answer', data);
    });

    this.socket.on('webrtc-ice-candidate', (data) => {
      this.emit('webrtc-ice-candidate', data);
    });

    // 错误事件
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      message.error(data.message || '发生错误');
      this.emit('error', data);
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // 获取Socket实例
  getSocket(): Socket | null {
    return this.socket;
  }

  // 是否已连接
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // 发送连接请求
  sendConnectionRequest(connectionId: string) {
    this.socket?.emit('connection-request', { connectionId });
  }

  // 发送连接响应
  sendConnectionResponse(connectionId: string, accepted: boolean) {
    this.socket?.emit('connection-response', { connectionId, accepted });
  }

  // 更新设备状态
  updateDeviceStatus(isOnline: boolean) {
    this.socket?.emit('update-status', { isOnline });
  }

  // WebRTC信令
  sendWebRTCOffer(connectionId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc-offer', { connectionId, offer });
  }

  sendWebRTCAnswer(connectionId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc-answer', { connectionId, answer });
  }

  sendICECandidate(connectionId: string, candidate: RTCIceCandidate) {
    this.socket?.emit('webrtc-ice-candidate', { connectionId, candidate });
  }

  // 事件监听
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // 如果是socket事件，绑定到socket
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  private emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
}

export default new SocketService();

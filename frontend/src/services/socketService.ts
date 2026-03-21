import { io, Socket } from 'socket.io-client';

// Socket.IO 服务器地址
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

// WebSocket 事件数据类型定义
export interface RegisteredData {
  success: boolean;
  deviceCode: string;
}

export interface ConnectionRequestData {
  fromDeviceCode: string;
  password: string;
}

export interface ConnectionAcceptedData {
  fromDeviceCode: string;
  iceServers?: RTCConfiguration;
}

export interface ConnectionRejectedData {
  reason?: string;
}

export interface SDPOfferData {
  fromDeviceCode: string;
  sdp: RTCSessionDescriptionInit;
}

export interface SDPAnswerData {
  fromDeviceCode: string;
  sdp: RTCSessionDescriptionInit;
}

export interface ICECandidateData {
  fromDeviceCode: string;
  candidate: RTCIceCandidateInit;
}

export interface PrepareSDPData {
  targetDeviceCode: string;
  iceServers?: RTCConfiguration;
}

export interface DeviceOnlineData {
  deviceCode: string;
}

export interface DeviceOfflineData {
  deviceCode: string;
  reason?: string;
}

export interface ErrorData {
  message: string;
}

export interface ControlCommandData {
  type: string;
  data?: unknown;
}

// Socket 事件类型
export type SocketEventType =
  | 'registered'
  | 'connection-requested'
  | 'connection-accepted'
  | 'connection-rejected'
  | 'incoming-connection'
  | 'sdp-offer'
  | 'sdp-answer'
  | 'ice-candidate'
  | 'prepare-sdp'
  | 'control-command'
  | 'device-online'
  | 'device-offline'
  | 'error';

class SocketService {
  private socket: Socket | null = null;
  private deviceCode: string = '';
  private role: 'controller' | 'controlled' = 'controlled';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // 事件回调
  private onRegistered: ((data: RegisteredData) => void) | null = null;
  private onConnectionRequested: ((data: { targetDeviceCode: string }) => void) | null = null;
  private onConnectionAccepted: ((data: ConnectionAcceptedData) => void) | null = null;
  private onConnectionRejected: ((data: ConnectionRejectedData) => void) | null = null;
  private onIncomingConnection: ((data: ConnectionRequestData) => void) | null = null;
  private onSDPOffer: ((data: SDPOfferData) => void) | null = null;
  private onSDPAnswer: ((data: SDPAnswerData) => void) | null = null;
  private onICECandidate: ((data: ICECandidateData) => void) | null = null;
  private onPrepareSDP: ((data: PrepareSDPData) => void) | null = null;
  private onControlCommand: ((data: ControlCommandData) => void) | null = null;
  private onDeviceOnline: ((data: DeviceOnlineData) => void) | null = null;
  private onDeviceOffline: ((data: DeviceOfflineData) => void) | null = null;
  private onError: ((data: ErrorData) => void) | null = null;

  // 连接服务器
  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupListeners();
    this.startHeartbeat();
  }

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 设置事件回调
  on(event: SocketEventType, callback: (data: unknown) => void) {
    switch (event) {
      case 'registered': this.onRegistered = callback as (data: RegisteredData) => void; break;
      case 'connection-requested': this.onConnectionRequested = callback as (data: { targetDeviceCode: string }) => void; break;
      case 'connection-accepted': this.onConnectionAccepted = callback as (data: ConnectionAcceptedData) => void; break;
      case 'connection-rejected': this.onConnectionRejected = callback as (data: ConnectionRejectedData) => void; break;
      case 'incoming-connection': this.onIncomingConnection = callback as (data: ConnectionRequestData) => void; break;
      case 'sdp-offer': this.onSDPOffer = callback as (data: SDPOfferData) => void; break;
      case 'sdp-answer': this.onSDPAnswer = callback as (data: SDPAnswerData) => void; break;
      case 'ice-candidate': this.onICECandidate = callback as (data: ICECandidateData) => void; break;
      case 'prepare-sdp': this.onPrepareSDP = callback as (data: PrepareSDPData) => void; break;
      case 'control-command': this.onControlCommand = callback as (data: ControlCommandData) => void; break;
      case 'device-online': this.onDeviceOnline = callback as (data: DeviceOnlineData) => void; break;
      case 'device-offline': this.onDeviceOffline = callback as (data: DeviceOfflineData) => void; break;
      case 'error': this.onError = callback as (data: ErrorData) => void; break;
    }
  }

  // 设置监听器
  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('registered', (data: RegisteredData) => {
      console.log('Registered:', data);
      this.onRegistered?.(data);
    });

    this.socket.on('connection-requested', (data: { targetDeviceCode: string }) => {
      console.log('Connection requested:', data);
      this.onConnectionRequested?.(data);
    });

    this.socket.on('connection-accepted', (data: ConnectionAcceptedData) => {
      console.log('Connection accepted:', data);
      this.onConnectionAccepted?.(data);
    });

    this.socket.on('connection-rejected', (data: ConnectionRejectedData) => {
      console.log('Connection rejected:', data);
      this.onConnectionRejected?.(data);
    });

    this.socket.on('incoming-connection', (data: ConnectionRequestData) => {
      console.log('Incoming connection:', data);
      this.onIncomingConnection?.(data);
    });

    this.socket.on('sdp-offer', (data: SDPOfferData) => {
      console.log('SDP Offer received');
      this.onSDPOffer?.(data);
    });

    this.socket.on('sdp-answer', (data: SDPAnswerData) => {
      console.log('SDP Answer received');
      this.onSDPAnswer?.(data);
    });

    this.socket.on('ice-candidate', (data: ICECandidateData) => {
      console.log('ICE Candidate received');
      this.onICECandidate?.(data);
    });

    this.socket.on('prepare-sdp', (data: PrepareSDPData) => {
      console.log('Prepare SDP received');
      this.onPrepareSDP?.(data);
    });

    this.socket.on('control-command', (data: ControlCommandData) => {
      console.log('Control command:', data);
      this.onControlCommand?.(data);
    });

    this.socket.on('device-online', (data: DeviceOnlineData) => {
      console.log('Device online:', data);
      this.onDeviceOnline?.(data);
    });

    this.socket.on('device-offline', (data: DeviceOfflineData) => {
      console.log('Device offline:', data);
      this.onDeviceOffline?.(data);
    });

    this.socket.on('error', (data: ErrorData) => {
      console.error('Socket error:', data);
      this.onError?.(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.stopHeartbeat();
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    // 心跳响应
    this.socket.on('heartbeat-ack', () => {
      console.log('Heartbeat acknowledged');
    });
  }

  // 启动心跳
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000);
  }

  // 停止心跳
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // 注册设备
  register(deviceCode: string, password: string, role: 'controller' | 'controlled') {
    this.deviceCode = deviceCode;
    this.role = role;
    this.socket?.emit('register', { deviceCode, password, role });
  }

  // 请求连接远程设备
  requestConnect(targetDeviceCode: string, password: string) {
    this.socket?.emit('request-connect', { targetDeviceCode, password });
  }

  // 接受连接
  acceptConnection(targetDeviceCode: string) {
    this.socket?.emit('accept-connection', { targetDeviceCode });
  }

  // 拒绝连接
  rejectConnection(targetDeviceCode: string, reason?: string) {
    this.socket?.emit('reject-connection', { targetDeviceCode, reason });
  }

  // 发送 SDP Offer
  sendSDPOffer(targetDeviceCode: string, sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('sdp-offer', { targetDeviceCode, sdp });
  }

  // 发送 SDP Answer
  sendSDPAnswer(targetDeviceCode: string, sdp: RTCSessionDescriptionInit) {
    this.socket?.emit('sdp-answer', { targetDeviceCode, sdp });
  }

  // 发送 ICE Candidate
  sendICECandidate(targetDeviceCode: string, candidate: RTCIceCandidate) {
    this.socket?.emit('ice-candidate', { targetDeviceCode, candidate });
  }

  // 发送控制指令（仅控制端使用）
  sendControlCommand(targetDeviceCode: string, command: ControlCommandData) {
    this.socket?.emit('control-command', { targetDeviceCode, command });
  }

  // 获取在线设备列表
  getOnlineDevices() {
    this.socket?.emit('get-online-devices');
  }

  // 获取当前设备码
  getDeviceCode(): string {
    return this.deviceCode;
  }

  // 获取当前角色
  getRole(): 'controller' | 'controlled' {
    return this.role;
  }

  // 是否已连接
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// 导出单例
export const socketService = new SocketService();
export default socketService;

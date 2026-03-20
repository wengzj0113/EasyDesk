import { io, Socket } from 'socket.io-client';

// Socket.IO 服务器地址
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private deviceCode: string = '';
  private role: 'controller' | 'controlled' = 'controlled';

  // 事件回调
  private onRegistered: ((data: any) => void) | null = null;
  private onConnectionRequested: ((data: any) => void) | null = null;
  private onConnectionAccepted: ((data: any) => void) | null = null;
  private onConnectionRejected: ((data: any) => void) | null = null;
  private onIncomingConnection: ((data: any) => void) | null = null;
  private onSDPOffer: ((data: any) => void) | null = null;
  private onSDPAnswer: ((data: any) => void) | null = null;
  private onICECandidate: ((data: any) => void) | null = null;
  private onPrepareSDP: ((data: any) => void) | null = null;
  private onControlCommand: ((data: any) => void) | null = null;
  private onDeviceOnline: ((data: any) => void) | null = null;
  private onDeviceOffline: ((data: any) => void) | null = null;
  private onError: ((data: any) => void) | null = null;

  // 连接服务器
  connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    this.setupListeners();
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 设置事件回调
  on(event: string, callback: (data: any) => void) {
    switch (event) {
      case 'registered': this.onRegistered = callback; break;
      case 'connection-requested': this.onConnectionRequested = callback; break;
      case 'connection-accepted': this.onConnectionAccepted = callback; break;
      case 'connection-rejected': this.onConnectionRejected = callback; break;
      case 'incoming-connection': this.onIncomingConnection = callback; break;
      case 'sdp-offer': this.onSDPOffer = callback; break;
      case 'sdp-answer': this.onSDPAnswer = callback; break;
      case 'ice-candidate': this.onICECandidate = callback; break;
      case 'prepare-sdp': this.onPrepareSDP = callback; break;
      case 'control-command': this.onControlCommand = callback; break;
      case 'device-online': this.onDeviceOnline = callback; break;
      case 'device-offline': this.onDeviceOffline = callback; break;
      case 'error': this.onError = callback; break;
    }
  }

  // 设置监听器
  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('registered', (data) => {
      console.log('Registered:', data);
      this.onRegistered?.(data);
    });

    this.socket.on('connection-requested', (data) => {
      console.log('Connection requested:', data);
      this.onConnectionRequested?.(data);
    });

    this.socket.on('connection-accepted', (data) => {
      console.log('Connection accepted:', data);
      this.onConnectionAccepted?.(data);
    });

    this.socket.on('connection-rejected', (data) => {
      console.log('Connection rejected:', data);
      this.onConnectionRejected?.(data);
    });

    this.socket.on('incoming-connection', (data) => {
      console.log('Incoming connection:', data);
      this.onIncomingConnection?.(data);
    });

    this.socket.on('sdp-offer', (data) => {
      console.log('SDP Offer received');
      this.onSDPOffer?.(data);
    });

    this.socket.on('sdp-answer', (data) => {
      console.log('SDP Answer received');
      this.onSDPAnswer?.(data);
    });

    this.socket.on('ice-candidate', (data) => {
      console.log('ICE Candidate received');
      this.onICECandidate?.(data);
    });

    this.socket.on('prepare-sdp', (data) => {
      console.log('Prepare SDP received');
      this.onPrepareSDP?.(data);
    });

    this.socket.on('control-command', (data) => {
      console.log('Control command:', data);
      this.onControlCommand?.(data);
    });

    this.socket.on('device-online', (data) => {
      console.log('Device online:', data);
      this.onDeviceOnline?.(data);
    });

    this.socket.on('device-offline', (data) => {
      console.log('Device offline:', data);
      this.onDeviceOffline?.(data);
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
      this.onError?.(data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });
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
  sendControlCommand(targetDeviceCode: string, command: any) {
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
  getRole(): string {
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

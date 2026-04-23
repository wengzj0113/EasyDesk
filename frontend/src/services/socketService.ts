import { io, Socket } from 'socket.io-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('Socket');

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

// Shell相关类型定义
export interface ShellCommandData {
  command: string;
  sessionId: string;
  fromDeviceCode: string;
  fromSocketId?: string;
  timestamp?: number;
}

export interface ShellResultData {
  sessionId: string;
  output: string;
  error?: string;
  exitCode: number;
  timestamp?: number;
}

export interface ShellErrorData {
  sessionId: string;
  error: string;
}

// 剪贴板相关类型定义
export interface ClipboardSyncData {
  content: string;
  contentType: 'text' | 'image';
  direction: 'to' | 'from';
  fromDeviceCode?: string;
}

export interface ClipboardHistoryItem {
  id?: string;
  content: string;
  contentType: 'text' | 'image';
  direction: 'to' | 'from';
  timestamp: number;
}

export interface ClipboardHistoryResponseData {
  history: ClipboardHistoryItem[];
}

// 电源操作类型
export type PowerAction = 'shutdown' | 'restart' | 'lock' | 'sleep';

export interface PowerCommandData {
  deviceCode: string;
  action: PowerAction;
  confirmCode?: string;
}

export interface PowerCommandSentData {
  deviceCode: string;
  action: PowerAction;
  confirmCode: string;
}

export interface PowerActionData {
  action: PowerAction;
  confirmCode: string;
  fromDeviceCode: string;
  timestamp: number;
}

export interface PowerResultData {
  action: PowerAction;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface PowerErrorData {
  error: string;
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
  | 'shell-command'
  | 'shell-result'
  | 'shell-error'
  | 'clipboard-sync'
  | 'clipboard-history-response'
  | 'device-online'
  | 'device-offline'
  | 'error'
  | 'power-action'
  | 'power-result'
  | 'power-command-sent'
  | 'power-error';

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
  private onShellCommand: ((data: ShellCommandData) => void) | null = null;
  private onShellResult: ((data: ShellResultData) => void) | null = null;
  private onShellError: ((data: ShellErrorData) => void) | null = null;
  private onClipboardSync: ((data: ClipboardSyncData) => void) | null = null;
  private onClipboardHistoryResponse: ((data: ClipboardHistoryResponseData) => void) | null = null;
  private onDeviceOnline: ((data: DeviceOnlineData) => void) | null = null;
  private onDeviceOffline: ((data: DeviceOfflineData) => void) | null = null;
  private onError: ((data: ErrorData) => void) | null = null;
  private onPowerAction: ((data: PowerActionData) => void) | null = null;
  private onPowerResult: ((data: PowerResultData) => void) | null = null;
  private onPowerCommandSent: ((data: PowerCommandSentData) => void) | null = null;
  private onPowerError: ((data: PowerErrorData) => void) | null = null;

  // 断开连接
  disconnect() {
    this.stopHeartbeat();
    this.off(); // 清理所有事件回调
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // 清理所有事件回调
  off<T extends SocketEventType>(event?: T, _callback?: (data: typeof this.eventTypeMap[T]) => void) {
    // 如果没有指定事件，清空所有回调
    if (event === undefined) {
      this.onRegistered = null;
      this.onConnectionRequested = null;
      this.onConnectionAccepted = null;
      this.onConnectionRejected = null;
      this.onIncomingConnection = null;
      this.onSDPOffer = null;
      this.onSDPAnswer = null;
      this.onICECandidate = null;
      this.onPrepareSDP = null;
      this.onControlCommand = null;
      this.onShellCommand = null;
      this.onShellResult = null;
      this.onShellError = null;
      this.onClipboardSync = null;
      this.onClipboardHistoryResponse = null;
      this.onDeviceOnline = null;
      this.onDeviceOffline = null;
      this.onError = null;
      this.onPowerAction = null;
      this.onPowerResult = null;
      this.onPowerCommandSent = null;
      this.onPowerError = null;
      return;
    }

    // 否则清空指定事件的回调
    switch (event) {
      case 'registered': this.onRegistered = null; break;
      case 'connection-requested': this.onConnectionRequested = null; break;
      case 'connection-accepted': this.onConnectionAccepted = null; break;
      case 'connection-rejected': this.onConnectionRejected = null; break;
      case 'incoming-connection': this.onIncomingConnection = null; break;
      case 'sdp-offer': this.onSDPOffer = null; break;
      case 'sdp-answer': this.onSDPAnswer = null; break;
      case 'ice-candidate': this.onICECandidate = null; break;
      case 'prepare-sdp': this.onPrepareSDP = null; break;
      case 'control-command': this.onControlCommand = null; break;
      case 'shell-command': this.onShellCommand = null; break;
      case 'shell-result': this.onShellResult = null; break;
      case 'shell-error': this.onShellError = null; break;
      case 'clipboard-sync': this.onClipboardSync = null; break;
      case 'clipboard-history-response': this.onClipboardHistoryResponse = null; break;
      case 'device-online': this.onDeviceOnline = null; break;
      case 'device-offline': this.onDeviceOffline = null; break;
      case 'error': this.onError = null; break;
      case 'power-action': this.onPowerAction = null; break;
      case 'power-result': this.onPowerResult = null; break;
      case 'power-command-sent': this.onPowerCommandSent = null; break;
      case 'power-error': this.onPowerError = null; break;
    }
  }

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

  // 事件类型映射
  private eventTypeMap: Record<SocketEventType, unknown> = {
    'registered': null as unknown as RegisteredData,
    'connection-requested': null as unknown as { targetDeviceCode: string },
    'connection-accepted': null as unknown as ConnectionAcceptedData,
    'connection-rejected': null as unknown as ConnectionRejectedData,
    'incoming-connection': null as unknown as ConnectionRequestData,
    'sdp-offer': null as unknown as SDPOfferData,
    'sdp-answer': null as unknown as SDPAnswerData,
    'ice-candidate': null as unknown as ICECandidateData,
    'prepare-sdp': null as unknown as PrepareSDPData,
    'control-command': null as unknown as ControlCommandData,
    'shell-command': null as unknown as ShellCommandData,
    'shell-result': null as unknown as ShellResultData,
    'shell-error': null as unknown as ShellErrorData,
    'clipboard-sync': null as unknown as ClipboardSyncData,
    'clipboard-history-response': null as unknown as ClipboardHistoryResponseData,
    'device-online': null as unknown as DeviceOnlineData,
    'device-offline': null as unknown as DeviceOfflineData,
    'error': null as unknown as ErrorData,
    'power-action': null as unknown as PowerActionData,
    'power-result': null as unknown as PowerResultData,
    'power-command-sent': null as unknown as PowerCommandSentData,
    'power-error': null as unknown as PowerErrorData,
  };

  // 设置事件回调 - 使用泛型确保类型安全
  on<T extends SocketEventType>(event: T, callback: (data: typeof this.eventTypeMap[T]) => void) {
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
      case 'shell-command': this.onShellCommand = callback as (data: ShellCommandData) => void; break;
      case 'shell-result': this.onShellResult = callback as (data: ShellResultData) => void; break;
      case 'shell-error': this.onShellError = callback as (data: ShellErrorData) => void; break;
      case 'clipboard-sync': this.onClipboardSync = callback as (data: ClipboardSyncData) => void; break;
      case 'clipboard-history-response': this.onClipboardHistoryResponse = callback as (data: ClipboardHistoryResponseData) => void; break;
      case 'device-online': this.onDeviceOnline = callback as (data: DeviceOnlineData) => void; break;
      case 'device-offline': this.onDeviceOffline = callback as (data: DeviceOfflineData) => void; break;
      case 'error': this.onError = callback as (data: ErrorData) => void; break;
      case 'power-action': this.onPowerAction = callback as (data: PowerActionData) => void; break;
      case 'power-result': this.onPowerResult = callback as (data: PowerResultData) => void; break;
      case 'power-command-sent': this.onPowerCommandSent = callback as (data: PowerCommandSentData) => void; break;
      case 'power-error': this.onPowerError = callback as (data: PowerErrorData) => void; break;
    }
  }

  // 设置监听器
  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('registered', (data: RegisteredData) => {
      logger.debug('Registered:', data);
      this.onRegistered?.(data);
    });

    this.socket.on('connection-requested', (data: { targetDeviceCode: string }) => {
      logger.debug('Connection requested:', data);
      this.onConnectionRequested?.(data);
    });

    this.socket.on('connection-accepted', (data: ConnectionAcceptedData) => {
      logger.debug('Connection accepted:', data);
      this.onConnectionAccepted?.(data);
    });

    this.socket.on('connection-rejected', (data: ConnectionRejectedData) => {
      logger.debug('Connection rejected:', data);
      this.onConnectionRejected?.(data);
    });

    this.socket.on('incoming-connection', (data: ConnectionRequestData) => {
      logger.debug('Incoming connection:', data);
      this.onIncomingConnection?.(data);
    });

    this.socket.on('sdp-offer', (data: SDPOfferData) => {
      logger.debug('SDP Offer received');
      this.onSDPOffer?.(data);
    });

    this.socket.on('sdp-answer', (data: SDPAnswerData) => {
      logger.debug('SDP Answer received');
      this.onSDPAnswer?.(data);
    });

    this.socket.on('ice-candidate', (data: ICECandidateData) => {
      logger.debug('ICE Candidate received');
      this.onICECandidate?.(data);
    });

    this.socket.on('prepare-sdp', (data: PrepareSDPData) => {
      logger.debug('Prepare SDP received');
      this.onPrepareSDP?.(data);
    });

    this.socket.on('control-command', (data: ControlCommandData) => {
      logger.debug('Control command:', data);
      this.onControlCommand?.(data);
    });

    // Shell命令（被控端接收）
    this.socket.on('shell-command', (data: ShellCommandData) => {
      logger.debug('Shell command received:', data);
      this.onShellCommand?.(data);
    });

    // Shell结果（控制端接收）
    this.socket.on('shell-result', (data: ShellResultData) => {
      logger.debug('Shell result received');
      this.onShellResult?.(data);
    });

    // Shell错误（控制端接收）
    this.socket.on('shell-error', (data: ShellErrorData) => {
      logger.error('Shell error:', data);
      this.onShellError?.(data);
    });

    // 剪贴板同步事件
    this.socket.on('clipboard-sync', (data: ClipboardSyncData) => {
      logger.debug('Clipboard sync received:', data);
      this.onClipboardSync?.(data);
    });

    // 剪贴板历史响应
    this.socket.on('clipboard-history-response', (data: ClipboardHistoryResponseData) => {
      logger.debug('Clipboard history response received');
      this.onClipboardHistoryResponse?.(data);
    });

    this.socket.on('device-online', (data: DeviceOnlineData) => {
      logger.debug('Device online:', data);
      this.onDeviceOnline?.(data);
    });

    this.socket.on('device-offline', (data: DeviceOfflineData) => {
      logger.debug('Device offline:', data);
      this.onDeviceOffline?.(data);
    });

    this.socket.on('error', (data: ErrorData) => {
      logger.error('Socket error:', data);
      this.onError?.(data);
    });

    // 电源操作（被控端接收）
    this.socket.on('power-action', (data: PowerActionData) => {
      logger.debug('Power action received:', data);
      this.onPowerAction?.(data);
    });

    // 电源操作结果（控制端接收）
    this.socket.on('power-result', (data: PowerResultData) => {
      logger.debug('Power result received:', data);
      this.onPowerResult?.(data);
    });

    // 电源命令已发送确认（控制端接收）
    this.socket.on('power-command-sent', (data: PowerCommandSentData) => {
      logger.debug('Power command sent:', data);
      this.onPowerCommandSent?.(data);
    });

    // 电源操作错误
    this.socket.on('power-error', (data: PowerErrorData) => {
      logger.error('Power error:', data);
      this.onPowerError?.(data);
    });

    this.socket.on('disconnect', () => {
      logger.debug('Disconnected from server');
      this.stopHeartbeat();
    });

    this.socket.on('connect', () => {
      logger.debug('Connected to server');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      logger.debug(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    // 心跳响应
    this.socket.on('heartbeat-ack', () => {
      logger.debug('Heartbeat acknowledged');
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

  // 通用事件发送
  emit(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  // 发送Shell命令（控制端使用）
  executeShell(deviceCode: string, command: string, sessionId: string) {
    this.socket?.emit('shell-execute', {
      deviceCode,
      command,
      sessionId,
    });
  }

  // 发送Shell响应（被控端使用）
  respondShell(targetDeviceCode: string, sessionId: string, output: string, error: string, exitCode: number) {
    this.socket?.emit('shell-response', {
      targetDeviceCode,
      sessionId,
      output,
      error,
      exitCode,
    });
  }

  // 发送电源控制命令（控制端使用）
  sendPowerCommand(deviceCode: string, action: PowerAction, confirmCode?: string) {
    this.socket?.emit('power-command', {
      deviceCode,
      action,
      confirmCode,
    });
  }

  // 发送电源确认（被控端使用，通知控制端执行结果）
  sendPowerConfirmed(targetDeviceId: string, action: PowerAction, success: boolean, error?: string) {
    this.socket?.emit('power-confirmed', {
      targetDeviceId,
      action,
      success,
      error,
    });
  }
}

// 导出单例
export const socketService = new SocketService();
export default socketService;

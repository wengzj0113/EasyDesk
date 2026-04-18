import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, message, Space, Tooltip, Spin, Select, Card, Modal, Typography, Switch, Alert } from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  PhoneOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
  CameraOutlined,
  CopyOutlined,
  PrinterOutlined,
  ReloadOutlined,
  HeartOutlined,
} from '@ant-design/icons';
import socketService from '../services/socketService';
import FileTransfer from './FileTransfer';
import RemoteFileManager from './RemoteFileManager';
import ScreenshotPreview from './ScreenshotPreview';
import ClipboardSync from './ClipboardSync';
import QualityIndicator, { getQualityFromLatency } from './QualityIndicator';
import { useStore, type NetworkQuality } from '../store/useStore';

const { Text } = Typography;

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';
const devLog = (...args: unknown[]) => {
  if (isDev) console.log('[RemoteDesktop]', ...args);
};
const devError = (...args: unknown[]) => {
  if (isDev) console.error('[RemoteDesktop]', ...args);
};

interface RemoteDesktopProps {
  connectionId: string;
  onDisconnect: () => void;
  role?: 'controller' | 'controlled';
  deviceCode?: string;
  password?: string;
  targetDeviceCode?: string;
  targetDeviceName?: string;
}

// 默认 ICE 配置
const DEFAULT_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

// 重连配置
const RECONNECT_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000,      // 1秒
  maxDelay: 30000,       // 30秒
  multiplier: 2,
};

const RemoteDesktop: React.FC<RemoteDesktopProps> = ({
  connectionId,
  onDisconnect,
  role = 'controller',
  deviceCode = 'CONTROLLER',
  password = '',
  targetDeviceCode = '',
  targetDeviceName = '',
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const iceConfigRef = useRef<RTCConfiguration>(DEFAULT_ICE_CONFIG);
  const receivingFilesRef = useRef<Map<string, { name: string; totalChunks: number; chunks: string[] }>>(new Map());
  // 重连相关
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isReconnectingRef = useRef(false);
  const connectionStartTimeRef = useRef<number>(0);

  // Store actions
  const addSavedConnection = useStore(s => s.addSavedConnection);
  const addConnectionHistory = useStore(s => s.addConnectionHistory);
  const setNetworkQuality = useStore(s => s.setNetworkQuality);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ id: string; name: string; thumbnail: string }>>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [fileTransferVisible, setFileTransferVisible] = useState(false);
  const [fileManagerVisible, setFileManagerVisible] = useState(false);
  const [screenshotVisible, setScreenshotVisible] = useState(false);
  const [clipboardVisible, setClipboardVisible] = useState(false);
  const [networkQuality, setLocalQuality] = useState<NetworkQuality>({
    latency: 0, fps: 0, packetLoss: 0, bandwidth: 0, quality: 'good'
  });
  const [disconnectReason, setDisconnectReason] = useState<string>('');

  // 远程打印
  const handleRemotePrint = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      message.error('此功能仅在桌面客户端中可用');
      return;
    }
    try {
      await window.electronAPI.printPage();
      message.success('已发送打印命令');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      message.error(`打印失败: ${msg}`);
    }
  }, [isElectron]);

  const [remoteDeviceCode, setRemoteDeviceCode] = useState(targetDeviceCode);

  // 检测 Electron 环境
  useEffect(() => {
    const isE = !!window.electronAPI;
    setIsElectron(isE);
  }, []);

  // ========== 质量监控 ==========
  const startStatsMonitoring = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);

    statsIntervalRef.current = setInterval(async () => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.connectionState !== 'connected') return;

      try {
        const stats = await pc.getStats();
        let totalPacketsLost = 0;
        let totalPacketsReceived = 0;
        let currentLatency = 0;
        let fps = 0;
        let bandwidth = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.packetsLost !== undefined) totalPacketsLost += Number(report.packetsLost);
            if (report.packetsReceived !== undefined) totalPacketsReceived += Number(report.packetsReceived);
            if (report.framesPerSecond !== undefined) fps = Number(report.framesPerSecond);
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime !== undefined) {
              currentLatency = Math.round(Number(report.currentRoundTripTime) * 1000);
            }
            if (report.availableOutgoingBitrate !== undefined) {
              bandwidth = Math.round(Number(report.availableOutgoingBitrate) / 1000);
            }
          }
        });

        const total = totalPacketsLost + totalPacketsReceived;
        const packetLoss = total > 0 ? (totalPacketsLost / total) * 100 : 0;
        const quality = getQualityFromLatency(currentLatency);

        const qualityData: NetworkQuality = {
          latency: currentLatency,
          fps,
          packetLoss,
          bandwidth,
          quality,
        };
        setLocalQuality(qualityData);
        setNetworkQuality(qualityData);
      } catch {
        // stats 获取失败，忽略
      }
    }, 2000);
  }, [setNetworkQuality]);

  const stopStatsMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
  }, []);

  // ========== 自动重连 ==========
  const scheduleReconnect = useCallback((reason: string) => {
    if (isReconnectingRef.current) return;
    if (reconnectAttemptsRef.current >= RECONNECT_CONFIG.maxAttempts) {
      setDisconnectReason(`重连次数已达上限（${RECONNECT_CONFIG.maxAttempts}次），请检查网络后手动重连`);
      return;
    }

    const delay = Math.min(
      RECONNECT_CONFIG.baseDelay * Math.pow(RECONNECT_CONFIG.multiplier, reconnectAttemptsRef.current),
      RECONNECT_CONFIG.maxDelay
    );

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;

    devLog(`自动重连中... 第${reconnectAttemptsRef.current}次, ${delay}ms后重试`);
    setDisconnectReason(`连接中断（${reason}），${Math.round(delay/1000)}秒后自动重连...`);

    reconnectTimerRef.current = setTimeout(() => {
      isReconnectingRef.current = false;
      if (socketService.isConnected() && remoteDeviceCode) {
        // 触发重新连接
        socketService.requestConnect(remoteDeviceCode, password);
      } else {
        // 重新注册设备并连接
        socketService.connect();
      }
    }, delay);
  }, [password, remoteDeviceCode]);

  const cancelReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
  }, []);

  // ========== 保存连接/记录历史 ==========
  const handleConnectionEstablished = useCallback(() => {
    cancelReconnect();
    reconnectAttemptsRef.current = 0;
    connectionStartTimeRef.current = Date.now();
    startStatsMonitoring();

    // 保存到历史记录
    if (targetDeviceCode) {
      addConnectionHistory({
        id: `hist-${Date.now()}`,
        deviceCode: targetDeviceCode,
        deviceName: targetDeviceName || targetDeviceCode,
        timestamp: Date.now(),
        success: true,
      });
    }
  }, [cancelReconnect, startStatsMonitoring, targetDeviceCode, targetDeviceName, addConnectionHistory]);

  // ========== 初始化 Socket.IO ==========
  useEffect(() => {
    socketService.connect();

    socketService.on('registered', () => {
      devLog('Device registered');
      if (role === 'controller' && targetDeviceCode) {
        socketService.requestConnect(targetDeviceCode, password);
      }
    });

    socketService.on('incoming-connection', (data) => {
      devLog('Incoming connection request:', data);
      setIncomingRequest(data);
    });

    socketService.on('connection-accepted', async (data: any) => {
      devLog('Connection accepted, preparing WebRTC...');
      if (data.iceServers) iceConfigRef.current = data.iceServers;
      if (role === 'controller') {
        if (data.fromDeviceCode) setRemoteDeviceCode(data.fromDeviceCode);
        await startAsController();
      }
    });

    socketService.on('prepare-sdp', (data: any) => {
      devLog('Prepare SDP, ICE config received');
      if (data.iceServers) iceConfigRef.current = data.iceServers;
    });

    socketService.on('connection-rejected', (data: any) => {
      message.error('连接被拒绝: ' + data.reason);
      setConnecting(false);
      setError('对方拒绝了连接请求');
    });

    socketService.on('sdp-offer', async (data: any) => {
      devLog('Received SDP offer from:', data.fromDeviceCode);
      if (role === 'controlled') {
        await handleSDPOffer(data.sdp, data.fromDeviceCode);
      }
    });

    socketService.on('sdp-answer', async (data: any) => {
      devLog('Received SDP answer');
      if (peerConnectionRef.current) {
        const answer = new RTCSessionDescription(data.sdp);
        await peerConnectionRef.current.setRemoteDescription(answer);
      }
    });

    socketService.on('ice-candidate', async (data: any) => {
      devLog('Received ICE candidate');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socketService.on('control-command', (data: any) => {
      handleControlCommand(data);
    });

    socketService.on('error', (data: any) => {
      message.error('错误: ' + data.message);
      setError(data.message);
    });

    // 注册设备
    const registerTimer = setTimeout(() => {
      socketService.register(deviceCode, password, role);
    }, 1000);

    return () => {
      clearTimeout(registerTimer);
      cancelReconnect();
      stopStatsMonitoring();
      socketService.disconnect();
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, targetDeviceCode, password, deviceCode]);

  // 如果是被控端，等待连接请求
  useEffect(() => {
    if (role === 'controlled' && incomingRequest) {
      Modal.confirm({
        title: '连接请求',
        content: `设备 ${incomingRequest.fromDeviceCode} 请求远程控制你的电脑，是否接受？`,
        okText: '接受',
        cancelText: '拒绝',
        onOk: async () => {
          socketService.acceptConnection(incomingRequest.fromDeviceCode);
          setRemoteDeviceCode(incomingRequest.fromDeviceCode);
        },
        onCancel: () => {
          socketService.rejectConnection(incomingRequest.fromDeviceCode, '用户拒绝');
          setIncomingRequest(null);
        }
      });
    }
  }, [incomingRequest, role]);

  // ========== 清理函数 ==========
  const cleanup = () => {
    stopStatsMonitoring();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    const stream = remoteVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // ========== ICE 连接状态处理 ==========
  const handleIceStateChange = useCallback((state: RTCIceConnectionState, isController: boolean) => {
    devLog('ICE connection state:', state);
    switch (state) {
      case 'connected':
        setConnecting(false);
        setConnected(true);
        setError(null);
        handleConnectionEstablished();
        break;
      case 'disconnected':
        // 网络临时中断，尝试自动恢复
        devLog('ICE disconnected, attempting recovery...');
        setConnected(false);
        scheduleReconnect('网络临时中断');
        break;
      case 'failed':
        devLog('ICE failed, attempting ICE restart...');
        setConnected(false);
        // 尝试 ICE 重启
        attemptIceRestart(isController);
        break;
      case 'closed':
        setConnected(false);
        setConnecting(false);
        break;
    }
  }, [handleConnectionEstablished, scheduleReconnect]);

  // ICE 重启
  const attemptIceRestart = useCallback(async (isController: boolean) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      scheduleReconnect('ICE连接失败');
      return;
    }

    try {
      devLog('Restarting ICE...');
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socketService.sendSDPOffer(remoteDeviceCode, offer);
      devLog('ICE restart offer sent');
    } catch (err) {
      devError('ICE restart failed:', err);
      scheduleReconnect('ICE重启失败');
    }
  }, [remoteDeviceCode, scheduleReconnect]);

  // ========== 作为控制端启动 ==========
  const startAsController = async () => {
    try {
      setConnecting(true);

      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionRef.current = pc;

      // 数据通道
      const dataChannel = pc.createDataChannel('control');
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleDataMessage(data);
        } catch (e) {
          devError('解析消息失败:', e);
        }
      };

      // ICE 状态监听
      pc.oniceconnectionstatechange = () => {
        handleIceStateChange(pc.iceConnectionState, true);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && remoteDeviceCode) {
          socketService.sendICECandidate(remoteDeviceCode, event.candidate);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendSDPOffer(remoteDeviceCode, offer);

    } catch (err: any) {
      devError('启动控制失败:', err);
      setError('启动控制失败: ' + err.message);
      setConnecting(false);
    }
  };

  // ========== 作为被控端处理 SDP offer ==========
  const handleSDPOffer = async (sdp: any, fromCode: string) => {
    try {
      setConnecting(true);
      setRemoteDeviceCode(fromCode);

      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionRef.current = pc;

      pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        dataChannelRef.current = receiveChannel;
        receiveChannel.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleDataMessage(data);
          } catch (err) {
            devError('解析消息失败:', err);
          }
        };
      };

      pc.oniceconnectionstatechange = () => {
        handleIceStateChange(pc.iceConnectionState, false);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && fromCode) {
          socketService.sendICECandidate(fromCode, event.candidate);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendSDPAnswer(fromCode, answer);

      await startScreenShare();

    } catch (err: any) {
      devError('处理 SDP offer 失败:', err);
      setError('连接失败: ' + err.message);
      setConnecting(false);
    }
  };

  // 获取屏幕源
  const loadSources = useCallback(async () => {
    if (window.electronAPI) {
      const sourceList = await window.electronAPI.getSources();
      setSources(sourceList);
      if (sourceList.length > 0) {
        const screenSource = sourceList.find(s => s.name.includes('Screen') || s.name.includes('屏幕'));
        setSelectedSource(screenSource?.id || sourceList[0].id);
      }
      setShowSourceSelect(true);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        stream.getVideoTracks()[0].onended = () => {
          message.warning('对方已结束共享');
          setConnected(false);
        };
        setConnected(true);
        setConnecting(false);
      } catch (err: any) {
        devError('获取屏幕失败:', err);
        setError('无法获取屏幕: ' + err.message);
        setConnecting(false);
      }
    }
  }, []);

  // 开始屏幕共享
  const startScreenShare = useCallback(async () => {
    try {
      let stream: MediaStream;

      if (window.electronAPI && selectedSource) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioEnabled,
          video: {
            // @ts-ignore
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: selectedSource,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080
            }
          }
        } as any);
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: audioEnabled
        });
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }

      stream.getVideoTracks()[0].onended = () => {
        message.warning('屏幕共享已结束');
        setConnected(false);
      };

      setConnecting(false);
      setConnected(true);
      message.success('屏幕共享已启动');

    } catch (err: any) {
      devError('屏幕共享失败:', err);
      setError('无法启动屏幕共享: ' + err.message);
      setConnecting(false);
    }
  }, [selectedSource, audioEnabled]);

  // 发送控制指令
  const sendControlCommand = useCallback((type: string, data: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  // 处理控制指令
  const handleControlCommand = useCallback((data: any) => {
    devLog('Processing control command:', data);
    if (window.electronAPI) {
      if (data.type === 'mouseMove') {
        window.electronAPI.sendRemoteMouseMove?.(data.data);
      } else if (data.type === 'mouseClick') {
        window.electronAPI.sendRemoteMouseClick?.(data.data);
      } else if (data.type === 'keyDown' || data.type === 'keyUp') {
        window.electronAPI.sendRemoteKeyboard?.(data);
      }
    }
  }, []);

  // 处理 DataChannel 消息
  const handleDataMessage = useCallback((data: any) => {
    if (data.type === 'file-start') {
      receivingFilesRef.current.set(data.uid, {
        name: data.name,
        totalChunks: data.totalChunks,
        chunks: new Array(data.totalChunks)
      });
      message.info(`正在接收文件: ${data.name}`);
    } else if (data.type === 'file-chunk') {
      const fileData = receivingFilesRef.current.get(data.uid);
      if (fileData) fileData.chunks[data.index] = data.data;
    } else if (data.type === 'file-end') {
      const fileData = receivingFilesRef.current.get(data.uid);
      if (fileData) {
        receivingFilesRef.current.delete(data.uid);
        try {
          const binary = atob(fileData.chunks.join(''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const url = URL.createObjectURL(new Blob([bytes]));
          const a = document.createElement('a');
          a.href = url;
          a.download = fileData.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          message.success(`文件 "${fileData.name}" 接收完成`);
        } catch {
          message.error(`文件 "${fileData.name}" 接收失败`);
        }
      }
    } else if (data.type === 'clipboard-sync') {
      if (data.subtype === 'text' && data.data) {
        if (window.electronAPI) {
          window.electronAPI.clipboardWriteText(data.data);
        } else {
          navigator.clipboard.writeText(data.data);
        }
        message.info('剪贴板已从远程设备同步');
      }
    } else {
      handleControlCommand(data);
    }
  }, [handleControlCommand]);

  // 鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!connected || role !== 'controller') return;
    const rect = remoteVideoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendControlCommand('mouseMove', { x, y });
  }, [connected, role, sendControlCommand]);

  // 鼠标点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!connected || role !== 'controller') return;
    const rect = remoteVideoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    sendControlCommand('mouseClick', { x, y, button: e.button });
  }, [connected, role, sendControlCommand]);

  // 键盘输入
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!connected || role !== 'controller') return;
    // Ctrl+Alt+Del 特殊处理
    if (e.key === 'Delete' && (e.ctrlKey || e.altKey)) {
      sendControlCommand('specialKey', { key: 'CtrlAltDel' });
      return;
    }
    sendControlCommand('keyDown', {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey
    });
  }, [connected, role, sendControlCommand]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (!connected || role !== 'controller') return;
    sendControlCommand('keyUp', {
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey
    });
  }, [connected, role, sendControlCommand]);

  // 切换全屏
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 手动重连
  const handleManualReconnect = () => {
    cancelReconnect();
    reconnectAttemptsRef.current = 0;
    setError(null);
    setConnecting(true);
    if (socketService.isConnected()) {
      if (role === 'controller' && targetDeviceCode) {
        socketService.requestConnect(targetDeviceCode, password);
      }
    } else {
      socketService.connect();
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    cancelReconnect();
    cleanup();
    // 记录历史
    if (targetDeviceCode && connectionStartTimeRef.current > 0) {
      const duration = Math.round((Date.now() - connectionStartTimeRef.current) / 1000);
      addConnectionHistory({
        id: `hist-${Date.now()}`,
        deviceCode: targetDeviceCode,
        deviceName: targetDeviceName || targetDeviceCode,
        timestamp: Date.now(),
        success: false,
        duration,
      });
    }
    onDisconnect();
  };

  // 保存当前连接
  const handleSaveConnection = () => {
    if (!targetDeviceCode) return;
    addSavedConnection({
      id: `saved-${Date.now()}`,
      deviceCode: targetDeviceCode,
      deviceName: targetDeviceName || targetDeviceCode,
      password,
      lastConnected: new Date().toISOString(),
    });
    message.success('已保存到收藏');
  };

  // 被控端自动加载屏幕
  useEffect(() => {
    if (role === 'controlled') {
      loadSources();
    }
  }, [role, loadSources]);

  // 错误/断开状态 UI
  if (error || disconnectReason) {
    const showReconnect = !connecting && (disconnectReason || error) && !isReconnectingRef.current;
    const showReconnecting = isReconnectingRef.current;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#000',
        color: '#fff',
        gap: 16,
      }}>
        <h2 style={{ color: '#f5222d' }}>
          {error ? '连接出错' : '连接中断'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 400, textAlign: 'center' }}>
          {disconnectReason || error}
        </p>

        {showReconnecting && (
          <Space direction="vertical" align="center" size={12}>
            <Spin indicator={<HeartOutlined spin style={{ fontSize: 32, color: '#faad14' }} />} />
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              正在尝试自动重连（{reconnectAttemptsRef.current}/{RECONNECT_CONFIG.maxAttempts}）...
            </Text>
          </Space>
        )}

        {showReconnect && (
          <Space>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleManualReconnect}
            >
              重连
            </Button>
            <Button onClick={onDisconnect}>
              返回
            </Button>
          </Space>
        )}

        {!showReconnecting && !showReconnect && reconnectAttemptsRef.current >= RECONNECT_CONFIG.maxAttempts && (
          <Space>
            <Button onClick={handleDisconnect}>
              返回
            </Button>
          </Space>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        display: 'flex',
        flexDirection: 'column'
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      {/* 远程桌面画面 */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      >
        {connecting ? (
          <Spin size="large" tip="正在建立连接..." />
        ) : (
          <>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                cursor: role === 'controller' && connected ? 'crosshair' : 'default'
              }}
            />
          </>
        )}

        {!connected && !connecting && role === 'controller' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#fff'
          }}>
            <DesktopOutlined style={{ fontSize: 64, marginBottom: 16 }} />
            <p>等待对方连接...</p>
          </div>
        )}
      </div>

      {/* 控制栏 */}
      <div style={{
        height: '60px',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px'
      }}>
        <Space size="middle">
          {role === 'controlled' && isElectron && (
            <Select
              style={{ width: 200 }}
              placeholder="选择屏幕"
              value={selectedSource}
              onChange={setSelectedSource}
              options={sources.map(s => ({ value: s.id, label: s.name }))}
            />
          )}

          {role === 'controlled' && !connected && (
            <Button
              type="primary"
              icon={<DesktopOutlined />}
              onClick={startScreenShare}
              loading={connecting}
            >
              开始共享屏幕
            </Button>
          )}

          <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
            <Button
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleToggleFullscreen}
              style={{ color: '#fff' }}
            />
          </Tooltip>

          {/* 连接状态 + 质量指示器 */}
          {connected && (
            <Space size={12}>
              <Text style={{ color: '#52c41a', fontSize: 12 }}>
                已连接 {role === 'controller' ? '(控制端)' : '(被控端)'}
              </Text>
              <QualityIndicator
                latency={networkQuality.latency}
                fps={networkQuality.fps}
                packetLoss={networkQuality.packetLoss}
                bandwidth={networkQuality.bandwidth}
                quality={networkQuality.quality}
              />
            </Space>
          )}

          {!connected && !connecting && (
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
              未连接
            </Text>
          )}

          {/* 保存连接按钮（仅控制端且有目标设备时显示） */}
          {connected && role === 'controller' && targetDeviceCode && (
            <Tooltip title="保存到收藏">
              <Button
                type="text"
                icon={<HeartOutlined />}
                onClick={handleSaveConnection}
                style={{ color: '#faad14' }}
              />
            </Tooltip>
          )}

          {connected && (
            <Tooltip title="文件传输">
              <Button
                type="text"
                icon={<FolderOpenOutlined />}
                onClick={() => setFileTransferVisible(true)}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          )}

          {connected && isElectron && (
            <Tooltip title="文件管理">
              <Button
                type="text"
                icon={<FileSearchOutlined />}
                onClick={() => setFileManagerVisible(true)}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          )}

          {connected && isElectron && (
            <Tooltip title="截图">
              <Button
                type="text"
                icon={<CameraOutlined />}
                onClick={() => setScreenshotVisible(true)}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          )}

          {connected && isElectron && (
            <Tooltip title="剪贴板">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => setClipboardVisible(true)}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          )}

          {connected && isElectron && (
            <Tooltip title="打印">
              <Button
                type="text"
                icon={<PrinterOutlined />}
                onClick={handleRemotePrint}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          )}

          <Button
            type="primary"
            danger
            icon={<PhoneOutlined style={{ transform: 'rotate(135deg)' }} />}
            onClick={handleDisconnect}
          >
            断开
          </Button>
        </Space>
      </div>

      {/* 屏幕选择弹窗 */}
      <Modal
        title="选择要共享的屏幕"
        open={showSourceSelect && sources.length > 0 && !connected}
        onCancel={() => setShowSourceSelect(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowSourceSelect(false)}>
            取消
          </Button>,
          <Button key="start" type="primary" onClick={() => {
            setShowSourceSelect(false);
            startScreenShare();
          }}>
            开始共享
          </Button>
        ]}
      >
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <Space>
            <span>共享音频:</span>
            <Switch
              checked={audioEnabled}
              onChange={setAudioEnabled}
              checkedChildren="开"
              unCheckedChildren="关"
            />
            <Text type="secondary">(开启后远程设备将听到您屏幕的声音)</Text>
          </Space>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {sources.map(source => (
            <Card
              key={source.id}
              hoverable
              onClick={() => setSelectedSource(source.id)}
              style={{
                border: selectedSource === source.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
              }}
              cover={<img src={source.thumbnail} alt={source.name} style={{ height: 100, objectFit: 'cover' }} />}
            >
              <Card.Meta title={source.name} />
            </Card>
          ))}
        </div>
      </Modal>

      {/* 文件传输弹窗 */}
      <FileTransfer
        visible={fileTransferVisible}
        onClose={() => setFileTransferVisible(false)}
        dataChannel={dataChannelRef.current}
      />

      {/* 文件管理弹窗 */}
      <RemoteFileManager
        visible={fileManagerVisible}
        onClose={() => setFileManagerVisible(false)}
        dataChannel={dataChannelRef.current}
        isElectron={isElectron}
      />

      {/* 截图弹窗 */}
      <ScreenshotPreview
        visible={screenshotVisible}
        onClose={() => setScreenshotVisible(false)}
        isElectron={isElectron}
      />

      {/* 剪贴板同步弹窗 */}
      <ClipboardSync
        visible={clipboardVisible}
        onClose={() => setClipboardVisible(false)}
        dataChannel={dataChannelRef.current}
        isElectron={isElectron}
      />
    </div>
  );
};

export default RemoteDesktop;

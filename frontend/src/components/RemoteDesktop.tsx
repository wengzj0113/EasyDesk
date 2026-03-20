import React, { useEffect, useRef, useState, useCallback } from 'react';import { Button, message, Space, Tooltip, Spin, Select, Card, Modal, Typography } from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  PhoneOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import socketService from '../services/socketService';
import FileTransfer from './FileTransfer';

const { Text } = Typography;

interface RemoteDesktopProps {
  connectionId: string;
  onDisconnect: () => void;
  role?: 'controller' | 'controlled';
  deviceCode?: string;
  password?: string;
  targetDeviceCode?: string;
}

// 默认 ICE 配置（服务器未下发时的回退）
const DEFAULT_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const RemoteDesktop: React.FC<RemoteDesktopProps> = ({
  connectionId,
  onDisconnect,
  role = 'controller',
  deviceCode = 'CONTROLLER',
  password = '',
  targetDeviceCode = ''
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  // 服务器下发的 ICE 配置（含 TURN），默认回退到纯 STUN
  const iceConfigRef = useRef<RTCConfiguration>(DEFAULT_ICE_CONFIG);
  // 接收中的文件：uid -> { name, totalChunks, chunks }
  const receivingFilesRef = useRef<Map<string, { name: string; totalChunks: number; chunks: string[] }>>(new Map());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ id: string; name: string; thumbnail: string }>>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [showSourceSelect, setShowSourceSelect] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [fileTransferVisible, setFileTransferVisible] = useState(false);

  // 当前连接的对端设备码
  const [remoteDeviceCode, setRemoteDeviceCode] = useState(targetDeviceCode);

  // 检测是否在 Electron 环境中
  useEffect(() => {
    const checkElectron = () => {
      const isE = !!window.electronAPI;
      setIsElectron(isE);
      return isE;
    };
    checkElectron();
  }, []);

  // 初始化 Socket.IO 连接
  useEffect(() => {
    // 连接信令服务器
    socketService.connect();

    // 设置事件回调
    socketService.on('registered', (data) => {
      console.log('Device registered:', data);
      // 控制端：注册成功后立即向目标设备发起连接请求
      if (role === 'controller' && targetDeviceCode) {
        socketService.requestConnect(targetDeviceCode, password);
      }
    });

    socketService.on('incoming-connection', (data) => {
      console.log('Incoming connection request:', data);
      setIncomingRequest(data);
    });

    socketService.on('connection-accepted', async (data) => {
      console.log('Connection accepted, preparing WebRTC...', data);
      // 保存服务器下发的 ICE 配置（含 TURN）
      if (data.iceServers) {
        iceConfigRef.current = data.iceServers;
      }
      // 收到接受通知，开始创建 WebRTC 连接
      if (role === 'controller') {
        // 更新远程设备码
        if (data.fromDeviceCode) {
          setRemoteDeviceCode(data.fromDeviceCode);
        }
        await startAsController();
      }
    });

    socketService.on('prepare-sdp', (data) => {
      console.log('Prepare SDP, ICE config received');
      // 被控端保存服务器下发的 ICE 配置
      if (data.iceServers) {
        iceConfigRef.current = data.iceServers;
      }
    });

    socketService.on('connection-rejected', (data) => {
      message.error('连接被拒绝: ' + data.reason);
      setConnecting(false);
    });

    socketService.on('sdp-offer', async (data) => {
      console.log('Received SDP offer from:', data.fromDeviceCode);
      if (role === 'controlled') {
        await handleSDPOffer(data.sdp, data.fromDeviceCode);
      }
    });

    socketService.on('sdp-answer', async (data) => {
      console.log('Received SDP answer');
      if (peerConnectionRef.current) {
        const answer = new RTCSessionDescription(data.sdp);
        await peerConnectionRef.current.setRemoteDescription(answer);
      }
    });

    socketService.on('ice-candidate', async (data) => {
      console.log('Received ICE candidate');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    socketService.on('control-command', (data) => {
      // 被控端收到控制指令
      handleControlCommand(data);
    });

    socketService.on('error', (data) => {
      message.error('错误: ' + data.message);
      setError(data.message);
    });

    // 注册设备
    setTimeout(() => {
      socketService.register(deviceCode, password, role);
    }, 1000);

    return () => {
      socketService.disconnect();
      cleanup();
    };
  }, []);

  // 如果是被控端，等待连接请求
  useEffect(() => {
    if (role === 'controlled' && incomingRequest) {
      // 自动接受连接（简化版）
      Modal.confirm({
        title: '连接请求',
        content: `设备 ${incomingRequest.fromDeviceCode} 请求远程控制你的电脑，是否接受？`,
        okText: '接受',
        cancelText: '拒绝',
        onOk: async () => {
          socketService.acceptConnection(incomingRequest.fromDeviceCode);
          setRemoteDeviceCode(incomingRequest.fromDeviceCode);
          // 等待控制端创建连接
        },
        onCancel: () => {
          socketService.rejectConnection(incomingRequest.fromDeviceCode, '用户拒绝');
          setIncomingRequest(null);
        }
      });
    }
  }, [incomingRequest, role]);

  // 清理函数
  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    // 停止屏幕共享
    const stream = remoteVideoRef.current?.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // 作为控制端启动
  const startAsController = async () => {
    try {
      setConnecting(true);

      // 创建 WebRTC 连接（使用服务器下发的 ICE 配置）
      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionRef.current = pc;

      // 创建数据通道
      const dataChannel = pc.createDataChannel('control');
      dataChannelRef.current = dataChannel;

      dataChannel.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleDataMessage(data);
        } catch (e) {
          console.error('解析消息失败:', e);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setConnecting(false);
          setConnected(true);
          message.success('连接已建立');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setError('连接已断开');
          setConnected(false);
        }
      };

      // 监听 ICE candidate
      pc.onicecandidate = (event) => {
        if (event.candidate && remoteDeviceCode) {
          socketService.sendICECandidate(remoteDeviceCode, event.candidate);
        }
      };

      // 创建 SDP offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 发送 SDP offer 给被控端
      socketService.sendSDPOffer(remoteDeviceCode, offer);

    } catch (err: any) {
      console.error('启动控制失败:', err);
      setError('启动控制失败: ' + err.message);
      setConnecting(false);
    }
  };

  // 处理收到的 SDP offer（被控端）
  const handleSDPOffer = async (sdp: any, fromCode: string) => {
    try {
      setConnecting(true);
      setRemoteDeviceCode(fromCode);

      const pc = new RTCPeerConnection(iceConfigRef.current);
      peerConnectionRef.current = pc;

      // 监听数据通道
      pc.ondatachannel = (event) => {
        const receiveChannel = event.channel;
        dataChannelRef.current = receiveChannel;

        receiveChannel.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            handleDataMessage(data);
          } catch (err) {
            console.error('解析消息失败:', err);
          }
        };
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected') {
          setConnecting(false);
          setConnected(true);
          message.success('连接已建立');
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && fromCode) {
          socketService.sendICECandidate(fromCode, event.candidate);
        }
      };

      // 设置远程描述
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      // 创建并发送 answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendSDPAnswer(fromCode, answer);

      // 启动屏幕共享
      await startScreenShare();

    } catch (err: any) {
      console.error('处理 SDP offer 失败:', err);
      setError('连接失败: ' + err.message);
      setConnecting(false);
    }
  };

  // 获取屏幕/窗口列表
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
      // 浏览器环境
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
        console.error('获取屏幕失败:', err);
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
        // Electron 环境
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: selectedSource,
              minWidth: 1280,
              maxWidth: 1920,
              minHeight: 720,
              maxHeight: 1080
            }
          }
        });
      } else {
        // 浏览器环境
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        });
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }

      // 添加轨道到 WebRTC
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
      console.error('屏幕共享失败:', err);
      setError('无法启动屏幕共享: ' + err.message);
      setConnecting(false);
    }
  }, [selectedSource]);

  // 发送控制指令
  const sendControlCommand = useCallback((type: string, data: any) => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  // 处理控制指令（被控端）
  const handleControlCommand = useCallback((data: any) => {
    console.log('Processing control command:', data);

    if (window.electronAPI) {
      // 发送控制指令到主进程进行系统级模拟
      if (data.type === 'mouseMove') {
        window.electronAPI.sendRemoteMouseMove?.(data.data);
      } else if (data.type === 'mouseClick') {
        window.electronAPI.sendRemoteMouseClick?.(data.data);
      } else if (data.type === 'keyDown' || data.type === 'keyUp') {
        window.electronAPI.sendRemoteKeyboard?.(data);
      }
    }
  }, []);

  // 处理 DataChannel 消息：路由文件传输消息 vs 控制指令
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

    sendControlCommand('keyDown', {
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

  // 断开连接
  const handleDisconnect = () => {
    cleanup();
    onDisconnect();
  };

  // 如果是被控端，自动加载屏幕源
  useEffect(() => {
    if (role === 'controlled') {
      loadSources();
    }
  }, [role, loadSources]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#000',
        color: '#fff'
      }}>
        <h2 style={{ color: '#f5222d' }}>连接出错</h2>
        <p>{error}</p>
        <Button type="primary" onClick={onDisconnect}>
          返回
        </Button>
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

        {/* 状态提示 */}
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

          {connected && (
            <Text style={{ color: '#52c41a' }}>
              已连接 {role === 'controller' ? '(控制端)' : '(被控端)'}
            </Text>
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
    </div>
  );
};

export default RemoteDesktop;

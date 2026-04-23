import React, { useState, useRef, useCallback } from 'react';
import { Card, Button, Space, Modal, Typography, message } from 'antd';
import {
  PoweroffOutlined,
  ReloadOutlined,
  LockOutlined,
  MoonOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { socketService, type PowerAction } from '../services/socketService';

const { Text } = Typography;

// Constants
const POWER_TIMEOUT_MS = 10000;

interface PowerControlProps {
  deviceCode: string;
  visible: boolean;
  onClose: () => void;
}

interface ConfirmModalState {
  visible: boolean;
  action: PowerAction;
  confirmCode: string;
  loading: boolean;
}

interface ResultModalState {
  visible: boolean;
  success: boolean;
  message: string;
}

const POWER_ACTIONS = [
  {
    key: 'shutdown',
    label: '关机',
    description: '完全关闭设备',
    icon: <PoweroffOutlined />,
    danger: true,
    confirmText: '确定要关闭此设备吗？',
  },
  {
    key: 'restart',
    label: '重启',
    description: '重启设备',
    icon: <ReloadOutlined />,
    danger: true,
    confirmText: '确定要重启此设备吗？',
  },
  {
    key: 'lock',
    label: '锁定',
    description: '锁定屏幕',
    icon: <LockOutlined />,
    danger: false,
    confirmText: '确定要锁定此设备吗？',
  },
  {
    key: 'sleep',
    label: '睡眠',
    description: '进入睡眠模式',
    icon: <MoonOutlined />,
    danger: false,
    confirmText: '确定要让此设备进入睡眠模式吗？',
  },
] as const;

const PowerControl: React.FC<PowerControlProps> = ({ deviceCode, visible, onClose }) => {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    visible: false,
    action: 'shutdown',
    confirmCode: '',
    loading: false,
  });

  const [resultModal, setResultModal] = useState<ResultModalState>({
    visible: false,
    success: false,
    message: '',
  });

  // Use refs to track timeout and prevent stale closures
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentActionRef = useRef<PowerAction>('shutdown');

  // Cleanup timeout on unmount or visibility change
  const clearActionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup socket listeners and timeout
  const cleanupListeners = useCallback((handleResult: (data: { action: PowerAction; success: boolean; error?: string }) => void, handleError: (data: { error: string }) => void) => {
    socketService.off('power-result', handleResult);
    socketService.off('power-error', handleError);
  }, []);

  const handlePowerAction = (action: PowerAction) => {
    const actionConfig = POWER_ACTIONS.find(a => a.key === action);
    if (!actionConfig) return;

    // Generate confirmation code using crypto
    const array = new Uint8Array(3);
    crypto.getRandomValues(array);
    const confirmCode = Array.from(array, b => b.toString(36).padStart(2, '0')).join('').substring(0, 6).toUpperCase();

    setConfirmModal({
      visible: true,
      action,
      confirmCode,
      loading: false,
    });
  };

  const executePowerAction = () => {
    setConfirmModal(prev => ({ ...prev, loading: true }));

    const action = confirmModal.action;
    currentActionRef.current = action;

    // Clear any existing timeout first
    clearActionTimeout();

    const handleResult = (data: { action: PowerAction; success: boolean; error?: string }) => {
      if (data.action !== action) return;

      cleanupListeners(handleResult, handleError);
      clearActionTimeout();

      setConfirmModal(prev => ({ ...prev, visible: false, loading: false }));

      if (data.success) {
        const actionConfig = POWER_ACTIONS.find(a => a.key === data.action);
        message.success(`${actionConfig?.label}命令已发送`);

        if (data.action === 'shutdown') {
          setResultModal({
            visible: true,
            success: true,
            message: '设备正在关机，连接即将断开',
          });
        } else if (data.action === 'restart') {
          setResultModal({
            visible: true,
            success: true,
            message: '设备正在重启，请等待重新连接',
          });
        } else {
          setResultModal({
            visible: true,
            success: true,
            message: '命令已执行',
          });
        }
      } else {
        message.error(data.error || '命令执行失败');
        setResultModal({
          visible: true,
          success: false,
          message: data.error || '命令执行失败',
        });
      }
    };

    const handleError = (data: { error: string }) => {
      cleanupListeners(handleResult, handleError);
      clearActionTimeout();

      setConfirmModal(prev => ({ ...prev, visible: false, loading: false }));
      message.error(data.error);
      setResultModal({
        visible: true,
        success: false,
        message: data.error,
      });
    };

    socketService.on('power-result', handleResult);
    socketService.on('power-error', handleError);

    // Send power command
    socketService.sendPowerCommand(deviceCode, action, confirmModal.confirmCode);

    // 10 second timeout - stored in ref for cleanup
    timeoutRef.current = setTimeout(() => {
      // Use ref to get current action (avoid stale closure)
      if (confirmModal.action === currentActionRef.current && confirmModal.loading) {
        cleanupListeners(handleResult, handleError);
        setConfirmModal(prev => ({ ...prev, visible: false, loading: false }));
        message.warning('命令超时，设备可能未响应');
      }
    }, POWER_TIMEOUT_MS);
  };

  // Cleanup when component unmounts or visibility changes
  React.useEffect(() => {
    return () => {
      clearActionTimeout();
    };
  }, [clearActionTimeout]);

  if (!visible) return null;

  const actionConfig = POWER_ACTIONS.find(a => a.key === confirmModal.action);

  return (
    <>
      <Card
        title={
          <Space>
            <ThunderboltOutlined />
            <span>远程控制</span>
          </Space>
        }
        extra={<Button size="small" onClick={onClose}>关闭</Button>}
        styles={{ body: { padding: 16 } }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {POWER_ACTIONS.map(action => (
            <Button
              key={action.key}
              type="default"
              danger={action.danger}
              icon={action.icon}
              onClick={() => handlePowerAction(action.key)}
              style={{ width: '100%', height: 48, textAlign: 'left' }}
            >
              <Space>
                <span style={{ fontWeight: 500 }}>{action.label}</span>
                <Text type="secondary">{action.description}</Text>
              </Space>
            </Button>
          ))}
        </Space>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <WarningOutlined /> 注意：关机后将无法远程唤醒设备
          </Text>
        </div>
      </Card>

      {/* 确认弹窗 */}
      <Modal
        title={`确认${actionConfig?.label}`}
        open={confirmModal.visible}
        onOk={executePowerAction}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        okText="确认执行"
        cancelText="取消"
        okButtonProps={{ danger: actionConfig?.danger, loading: confirmModal.loading }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>{actionConfig?.confirmText}</Text>

          <div style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
            textAlign: 'center'
          }}>
            <Text type="secondary">确认码</Text>
            <div style={{ fontSize: 24, fontFamily: 'monospace', fontWeight: 'bold' }}>
              {confirmModal.confirmCode}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              请在远程设备上确认此代码
            </Text>
          </div>

          <Text type="secondary" style={{ fontSize: 12 }}>
            远程设备将收到确认提示，需要在设备上确认后才能执行
          </Text>
        </Space>
      </Modal>

      {/* 结果弹窗 */}
      <Modal
        title={resultModal.success ? '操作成功' : '操作失败'}
        open={resultModal.visible}
        onOk={() => setResultModal(prev => ({ ...prev, visible: false }))}
        onCancel={() => setResultModal(prev => ({ ...prev, visible: false }))}
        okText="确定"
        footer={[
          <Button key="ok" type="primary" onClick={() => setResultModal(prev => ({ ...prev, visible: false }))}>
            确定
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
          {resultModal.success ? (
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          )}
          <Text>{resultModal.message}</Text>
        </Space>
      </Modal>
    </>
  );
};

export default PowerControl;

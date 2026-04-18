import React, { useState, useCallback } from 'react';
import { Modal, Button, Space, message, Tabs } from 'antd';
import {
  CopyOutlined,
  ScissorOutlined,
} from '@ant-design/icons';

interface ClipboardSyncProps {
  visible: boolean;
  onClose: () => void;
  dataChannel: RTCDataChannel | null;
  isElectron: boolean;
}

const ClipboardSync: React.FC<ClipboardSyncProps> = ({
  visible,
  onClose,
  dataChannel,
  isElectron
}) => {
  const [activeTab, setActiveTab] = useState('sync');

  const isChannelReady = dataChannel?.readyState === 'open';

  // 发送剪贴板内容到远程
  const handleSendClipboard = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      message.error('此功能仅在桌面客户端中可用');
      return;
    }

    try {
      // 读取剪贴板文本
      const text = await window.electronAPI.clipboardReadText();
      if (text) {
        // 通过 DataChannel 发送
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify({
            type: 'clipboard-sync',
            subtype: 'text',
            data: text
          }));
          message.success('剪贴板内容已发送到远程设备');
        } else {
          message.error('连接未建立');
        }
      } else {
        message.info('剪贴板为空');
      }
    } catch (error: any) {
      message.error('读取剪贴板失败: ' + error.message);
    }
  }, [isElectron, dataChannel]);

  const tabItems = [
    {
      key: 'sync',
      label: (
        <span>
          <CopyOutlined /> 剪贴板同步
        </span>
      ),
      children: (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          {!isElectron ? (
            <div>
              <p>剪贴板同步功能仅在桌面客户端中可用</p>
              <p style={{ color: '#999' }}>请使用 Electron 客户端连接以使用此功能</p>
            </div>
          ) : !isChannelReady ? (
            <div>
              <p>请先建立远程连接</p>
              <p style={{ color: '#999' }}>连接建立后可同步剪贴板</p>
            </div>
          ) : (
            <Space direction="vertical" size="large">
              <div>
                <Button
                  type="primary"
                  size="large"
                  icon={<ScissorOutlined />}
                  onClick={handleSendClipboard}
                >
                  发送本地剪贴板到远程
                </Button>
                <p style={{ marginTop: 8, color: '#999' }}>
                  将本地剪贴板内容发送到远程设备
                </p>
              </div>
              <div>
                <p>远程设备的剪贴板内容会自动同步到本地</p>
              </div>
            </Space>
          )}
        </div>
      )
    }
  ];

  return (
    <Modal
      title="剪贴板同步"
      open={visible}
      onCancel={onClose}
      width={500}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Modal>
  );
};

export default ClipboardSync;

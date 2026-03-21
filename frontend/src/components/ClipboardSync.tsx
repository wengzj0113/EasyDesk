import React, { useState, useCallback } from 'react';
import { Modal, Button, Space, message, Tabs, List, Input } from 'antd';
import {
  CopyOutlined,
  ScissorOutlined,
  EditOutlined,
  CheckCircleOutlined
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
  const [clipboardHistory, setClipboardHistory] = useState<string[]>([]);
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

  // 从远程接收剪贴板内容
  const handleReceiveClipboard = useCallback(async (text: string) => {
    if (!isElectron || !window.electronAPI) {
      // 浏览器环境使用 Clipboard API
      try {
        await navigator.clipboard.writeText(text);
        message.success('已复制到本地剪贴板');
      } catch (error: any) {
        message.error('复制失败: ' + error.message);
      }
      return;
    }

    try {
      await window.electronAPI.clipboardWriteText(text);
      message.success('已复制到本地剪贴板');
    } catch (error: any) {
      message.error('复制失败: ' + error.message);
    }
  }, [isElectron]);

  // 复制历史记录中的内容
  const handleCopyFromHistory = (text: string) => {
    handleReceiveClipboard(text);
  };

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
    },
    {
      key: 'history',
      label: (
        <span>
          <EditOutlined /> 历史记录
        </span>
      ),
      children: (
        <div>
          {clipboardHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
              暂无剪贴板历史记录
            </div>
          ) : (
            <List
              size="small"
              dataSource={clipboardHistory}
              renderItem={(item, index) => (
                <List.Item
                  actions={[
                    <Button
                      key="copy"
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyFromHistory(item)}
                    >
                      复制
                    </Button>
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    title={`记录 ${index + 1}`}
                    description={
                      <div style={{
                        maxWidth: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
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

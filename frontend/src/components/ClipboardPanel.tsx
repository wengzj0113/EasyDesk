import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Switch, List, Button, Space, Typography, Tooltip, Empty, Tag } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import socketService from '../services/socketService';
import { createLogger } from '../utils/logger';

const { Text } = Typography;
const logger = createLogger('ClipboardPanel');

// Constants
const CLIPBOARD_CHECK_INTERVAL_MS = 1000;
const MAX_HISTORY_ITEMS = 10;
const CLIPBOARD_PREVIEW_MAX_LENGTH = 100;

// Generate secure random ID
const generateSecureId = (): string => {
  const array = new Uint8Array(9);
  crypto.getRandomValues(array);
  return `clipboard_${Date.now()}_${Array.from(array, b => b.toString(36).charAt(0)).join('')}`;
};

// Escape HTML to prevent XSS
const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

interface ClipboardItem {
  id: string;
  content: string;
  contentType: 'text' | 'image';
  direction: 'to' | 'from';
  timestamp: number;
}

interface ClipboardPanelProps {
  deviceCode: string;
  visible: boolean;
  onClose: () => void;
  isElectron: boolean;
}

const ClipboardPanel: React.FC<ClipboardPanelProps> = ({
  deviceCode,
  visible,
  onClose,
  isElectron,
}) => {
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastClipboard, setLastClipboard] = useState<string>('');

  // Use refs to track values without causing re-renders
  const lastValueRef = useRef<string>('');
  const lastClipboardRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync refs with state
  useEffect(() => {
    lastClipboardRef.current = lastClipboard;
  }, [lastClipboard]);

  // Polling for local clipboard changes - use refs to avoid stale closures
  useEffect(() => {
    if (!visible || !syncEnabled || !deviceCode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkClipboard = async () => {
      try {
        let text = '';
        if (isElectron && window.electronAPI) {
          text = await window.electronAPI.clipboardReadText();
        } else {
          text = await navigator.clipboard.readText();
        }

        // Use refs to get latest values
        if (text && text !== lastValueRef.current && text !== lastClipboardRef.current) {
          lastValueRef.current = text;
          lastClipboardRef.current = text;
          setLastClipboard(text);

          // Send clipboard content to remote
          socketService.emit('clipboard-change', {
            deviceCode,
            content: text,
            contentType: 'text',
            direction: 'to',
          });
        }
      } catch {
        // Ignore clipboard read errors
      }
    };

    intervalRef.current = setInterval(checkClipboard, CLIPBOARD_CHECK_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, syncEnabled, deviceCode, isElectron]);

  // 监听剪贴板同步事件
  useEffect(() => {
    if (!visible || !deviceCode) return;

    // 请求剪贴板历史
    socketService.emit('clipboard-history', { deviceCode });

    const handleClipboardSync = (data: { content: string; contentType: string; direction: string; fromDeviceCode?: string }) => {
      const newItem: ClipboardItem = {
        id: generateSecureId(),
        content: data.content,
        contentType: data.contentType as 'text' | 'image',
        direction: data.direction as 'to' | 'from',
        timestamp: Date.now(),
      };

      setHistory((prev) => {
        // Avoid adding duplicate content
        if (prev.length > 0 && prev[0].content === data.content) {
          return prev;
        }
        const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS);
        return updated;
      });

      // Write clipboard to local (bidirectional sync)
      if (syncEnabled && data.direction === 'from') {
        (async () => {
          try {
            if (isElectron && window.electronAPI) {
              window.electronAPI.clipboardWriteText(data.content);
            } else {
              await navigator.clipboard.writeText(data.content);
            }
            lastClipboardRef.current = data.content;
            setLastClipboard(data.content);
          } catch {
            // Ignore write errors
          }
        })();
      }
    };

    const handleHistoryResponse = (data: { history: ClipboardItem[] }) => {
      setHistory(
        data.history.map((item, index) => ({
          ...item,
          id: item.id || `history_${Date.now()}_${index}`,
        }))
      );
    };

    socketService.on('clipboard-sync', handleClipboardSync);
    socketService.on('clipboard-history-response', handleHistoryResponse);

    return () => {
      socketService.off('clipboard-sync', handleClipboardSync);
      socketService.off('clipboard-history-response', handleHistoryResponse);
    };
  }, [visible, deviceCode, syncEnabled, isElectron]);

  const copyToClipboard = useCallback(async (item: ClipboardItem) => {
    try {
      if (isElectron && window.electronAPI) {
        window.electronAPI.clipboardWriteText(item.content);
      } else {
        await navigator.clipboard.writeText(item.content);
      }
      setCopiedId(item.id);
      setLastClipboard(item.content);
      setTimeout(() => setCopiedId(null), 2000);

      // 同步到远程
      if (syncEnabled) {
        socketService.emit('clipboard-change', {
          deviceCode,
          content: item.content,
          contentType: item.contentType,
          direction: 'to',
        });
      }
    } catch (err: unknown) {
      logger.error('Failed to copy clipboard:', err);
    }
  }, [deviceCode, syncEnabled, isElectron]);

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    socketService.emit('clipboard-clear', { deviceCode });
  }, [deviceCode]);

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString();
  }, []);

  const previewContent = useCallback((content: string, maxLength = CLIPBOARD_PREVIEW_MAX_LENGTH) => {
    if (content.length > maxLength) {
      return escapeHtml(content.substring(0, maxLength)) + '...';
    }
    return escapeHtml(content);
  }, []);

  if (!visible) return null;

  return (
    <Card
      title={
        <Space>
          <CopyOutlined />
          <span>剪贴板</span>
          <Switch
            size="small"
            checked={syncEnabled}
            onChange={setSyncEnabled}
            checkedChildren={<SyncOutlined />}
            unCheckedChildren="关闭"
          />
        </Space>
      }
      extra={
        <Button size="small" onClick={onClose} icon={<CloseOutlined />} type="text" />
      }
      styles={{ body: { maxHeight: 400, overflow: 'auto' } }}
      style={{ width: 380 }}
    >
      <List
        locale={{
          emptyText: (
            <Empty
              description="暂无剪贴板历史"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        dataSource={history}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            actions={[
              <Tooltip title="复制到剪贴板" key="copy">
                <Button
                  type="text"
                  size="small"
                  icon={copiedId === item.id ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={() => copyToClipboard(item)}
                />
              </Tooltip>,
              <Tooltip title="删除" key="delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteHistoryItem(item.id)}
                />
              </Tooltip>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Tag color={item.direction === 'to' ? 'blue' : 'green'}>
                  {item.direction === 'to' ? '发送' : '接收'}
                </Tag>
              }
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatTime(item.timestamp)}
                  </Text>
                </Space>
              }
              description={
                <Text
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    display: 'block',
                    maxWidth: 280,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <FileTextOutlined style={{ marginRight: 4 }} />
                  {previewContent(item.content)}
                </Text>
              }
            />
          </List.Item>
        )}
      />

      {history.length > 0 && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            共 {history.length}/10 条
          </Text>
          <Button size="small" danger onClick={clearHistory} icon={<DeleteOutlined />}>
            清空历史
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ClipboardPanel;
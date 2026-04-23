import React, { useState, useRef } from 'react';
import { Modal, Upload, Button, List, Progress, Typography, Space, message, Alert, Tag } from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import { createLogger } from '../utils/logger';

const logger = createLogger('FileTransfer');
const { Dragger } = Upload;
const { Text } = Typography;

// 每个分块 32KB，避免 DataChannel 缓冲区溢出
const CHUNK_SIZE = 32 * 1024;
// 最大文件 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

interface FileItem {
  uid: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'paused' | 'done' | 'error';
  progress: number;          // 0-100
  currentChunk: number;      // 当前 chunk 索引
  totalChunks: number;
  error?: string;
  file: File;
  transferredBytes: number;
}

interface FileTransferProps {
  visible: boolean;
  onClose: () => void;
  dataChannel: RTCDataChannel | null;
}

// 正在传输的文件状态（持久化引用）
const activeTransfers = new Map<string, { paused: boolean; aborted: boolean }>();

const FileTransfer: React.FC<FileTransferProps> = ({ visible, onClose, dataChannel }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const transferIdRef = useRef<string | null>(null);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext || ''))
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#f5222d' }} />;
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    return <FileOutlined />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const readChunkAsBase64 = (chunk: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });

  // 等待 DataChannel 缓冲区低于 1MB
  const waitForBuffer = (dc: RTCDataChannel, timeout = 10000): Promise<void> =>
    new Promise((resolve) => {
      const deadline = Date.now() + timeout;
      const check = () => {
        if (dc.readyState !== 'open') { resolve(); return; }
        if (dc.bufferedAmount < 512 * 1024) { resolve(); return; }
        if (Date.now() > deadline) { resolve(); return; }
        setTimeout(check, 50);
      };
      check();
    });

  // 发送单个文件（支持暂停）
  const sendFile = async (
    fileItem: FileItem,
    dc: RTCDataChannel,
    transferId: string
  ) => {
    const { uid, file } = fileItem;
    const totalChunks = fileItem.totalChunks;
    const transfer = activeTransfers.get(uid) || { paused: false, aborted: false };
    activeTransfers.set(uid, transfer);

    // 从断点继续（如果有）
    let startChunk = fileItem.currentChunk;
    if (startChunk === 0) {
      // 发送文件元数据（仅首次开始时）
      dc.send(JSON.stringify({
        type: 'file-start',
        uid,
        name: file.name,
        size: file.size,
        totalChunks
      }));
    }

    try {
      for (let i = startChunk; i < totalChunks; i++) {
        // 检查是否暂停/中止
        if (transfer.aborted) {
          logger.debug('File transfer aborted:', uid);
          return;
        }
        while (transfer.paused) {
          await new Promise(r => setTimeout(r, 200));
          if (transfer.aborted) return;
        }

        const start = i * CHUNK_SIZE;
        const base64 = await readChunkAsBase64(file.slice(start, Math.min(start + CHUNK_SIZE, file.size)));
        await waitForBuffer(dc);
        dc.send(JSON.stringify({ type: 'file-chunk', uid, index: i, data: base64 }));

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        const transferredBytes = Math.min((i + 1) * CHUNK_SIZE, file.size);

        // 更新进度
        setFileList(prev => prev.map(f =>
          f.uid === uid
            ? { ...f, progress, currentChunk: i + 1, transferredBytes }
            : f
        ));
      }

      // 发送结束标记
      dc.send(JSON.stringify({ type: 'file-end', uid }));
      activeTransfers.delete(uid);

      setFileList(prev => prev.map(f =>
        f.uid === uid ? { ...f, status: 'done', progress: 100 } : f
      ));
      message.success(`${file.name} 发送完成`);

    } catch (err: unknown) {
      activeTransfers.delete(uid);
      const msg = err instanceof Error ? err.message : '传输失败';
      setFileList(prev => prev.map(f =>
        f.uid === uid ? { ...f, status: 'error', error: msg } : f
      ));
    }
  };

  const handleSend = async () => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      message.error('传输通道未就绪，请确保已建立远程连接');
      return;
    }

    const pendingFiles = fileList.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (const fileItem of pendingFiles) {
      setFileList(prev => prev.map(f =>
        f.uid === fileItem.uid
          ? { ...f, status: 'uploading', progress: 0, currentChunk: 0 }
          : f
      ));

      const id = `transfer-${Date.now()}-${fileItem.uid}`;
      transferIdRef.current = id;

      await sendFile(fileItem, dataChannel, id);
    }

    setUploading(false);
  };

  // 暂停指定文件
  const handlePause = (uid: string) => {
    const transfer = activeTransfers.get(uid);
    if (transfer) {
      transfer.paused = true;
      setFileList(prev => prev.map(f =>
        f.uid === uid ? { ...f, status: 'paused' } : f
      ));
      logger.debug('File transfer paused:', uid);
    }
  };

  // 恢复指定文件
  const handleResume = async (uid: string) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      message.error('传输通道已断开，无法恢复');
      return;
    }

    const fileItem = fileList.find(f => f.uid === uid);
    if (!fileItem) return;

    const transfer = activeTransfers.get(uid) || { paused: false, aborted: false };
    transfer.paused = false;
    activeTransfers.set(uid, transfer);

    setFileList(prev => prev.map(f =>
      f.uid === uid ? { ...f, status: 'uploading' } : f
    ));

    // 从断点继续传输
    await sendFile(fileItem, dataChannel, `resume-${uid}`);
  };

  // 取消指定文件传输
  const handleCancel = (uid: string) => {
    const transfer = activeTransfers.get(uid);
    if (transfer) {
      transfer.aborted = true;
      activeTransfers.delete(uid);
    }
    setFileList(prev => prev.filter(f => f.uid !== uid));
    message.info('传输已取消');
  };

  const handleRemove = (uid: string) => {
    handleCancel(uid);
  };

  const beforeUpload = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      message.error(`文件过大，最大支持 ${formatFileSize(MAX_FILE_SIZE)}`);
      return false;
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setFileList(prev => [...prev, {
      uid: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
      currentChunk: 0,
      totalChunks,
      file,
      transferredBytes: 0,
    }]);
    return false;
  };

  const isChannelReady = dataChannel?.readyState === 'open';
  const pendingCount = fileList.filter(f => f.status === 'pending').length;
  const activeCount = fileList.filter(f => f.status === 'uploading').length;

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined />
          文件传输
          {activeCount > 0 && <Tag color="blue">正在传输 {activeCount} 个文件</Tag>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
        <Button
          key="send"
          type="primary"
          loading={uploading}
          onClick={handleSend}
          disabled={pendingCount === 0 || !isChannelReady}
          icon={<CloudUploadOutlined />}
        >
          发送 {pendingCount > 0 ? `(${pendingCount}个)` : ''}
        </Button>
      ]}
    >
      {!isChannelReady && (
        <Alert
          message="传输通道未就绪"
          description="文件传输需要先建立远程连接，请先连接到目标设备。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Dragger
        name="file"
        multiple
        showUploadList={false}
        beforeUpload={beforeUpload as any}
        disabled={uploading || !isChannelReady}
        style={{ padding: '20px' }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽文件到此处</p>
        <p className="ant-upload-hint">
          支持批量发送，单个文件最大 {formatFileSize(MAX_FILE_SIZE)}
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 8 }}>
            <Text strong>发送列表</Text>
            <Text type="secondary">({fileList.length} 个文件)</Text>
          </Space>
          <List
            size="small"
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  // 暂停按钮（仅上传中显示）
                  item.status === 'uploading' && (
                    <Button
                      key="pause"
                      type="text"
                      size="small"
                      icon={<PauseCircleOutlined />}
                      onClick={() => handlePause(item.uid)}
                      title="暂停"
                    />
                  ),
                  // 恢复按钮（仅暂停显示）
                  item.status === 'paused' && (
                    <Button
                      key="resume"
                      type="text"
                      size="small"
                      icon={<PlayCircleOutlined />}
                      onClick={() => handleResume(item.uid)}
                      title="继续"
                    />
                  ),
                  // 删除/取消按钮
                  item.status !== 'done' && (
                    <Button
                      key="cancel"
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(item.uid)}
                      title="取消"
                    />
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getFileIcon(item.name)}
                  title={
                    <Space>
                      <Text ellipsis style={{ maxWidth: 200 }}>{item.name}</Text>
                      {item.status === 'done' && <Tag color="success" style={{ fontSize: 10 }}>完成</Tag>}
                      {item.status === 'paused' && <Tag color="warning" style={{ fontSize: 10 }}>已暂停</Tag>}
                      {item.status === 'uploading' && <Tag color="processing" style={{ fontSize: 10 }}>传输中</Tag>}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Space>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatFileSize(item.size)}
                        </Text>
                        {item.status === 'uploading' && (
                          <>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              / {formatFileSize(item.transferredBytes)}
                            </Text>
                          </>
                        )}
                      </Space>
                      {(item.status === 'uploading' || item.status === 'paused') && (
                        <Progress
                          percent={item.progress}
                          size="small"
                          status={item.status === 'paused' ? 'exception' : 'active'}
                          strokeColor={item.status === 'paused' ? '#faad14' : '#1890ff'}
                        />
                      )}
                      {item.status === 'error' && (
                        <Text type="danger" style={{ fontSize: 11 }}>
                          <CloseCircleOutlined /> {item.error}
                        </Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  );
};

export default FileTransfer;

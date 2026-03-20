import React, { useState } from 'react';
import { Modal, Upload, Button, List, Progress, Typography, Space, message, Alert } from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

// 每个分块 32KB，避免 DataChannel 缓冲区溢出
const CHUNK_SIZE = 32 * 1024;

interface FileItem {
  uid: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
  file: File;
}

interface FileTransferProps {
  visible: boolean;
  onClose: () => void;
  dataChannel: RTCDataChannel | null;
}

const FileTransfer: React.FC<FileTransferProps> = ({ visible, onClose, dataChannel }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || ''))
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#f5222d' }} />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
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

  // 等待 DataChannel 缓冲区低于 1MB 再继续发送
  const waitForBuffer = (dc: RTCDataChannel): Promise<void> =>
    new Promise(resolve => {
      const check = () => {
        if (dc.bufferedAmount < 1024 * 1024) resolve();
        else setTimeout(check, 50);
      };
      check();
    });

  const handleSend = async () => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      message.error('传输通道未就绪，请确保已建立远程连接');
      return;
    }

    const pendingFiles = fileList.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setUploading(true);

    for (const fileItem of pendingFiles) {
      const { uid, file } = fileItem;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      try {
        // 发送文件元数据
        dataChannel.send(JSON.stringify({
          type: 'file-start',
          uid,
          name: file.name,
          size: file.size,
          totalChunks
        }));

        // 逐块发送
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const base64 = await readChunkAsBase64(file.slice(start, start + CHUNK_SIZE));
          await waitForBuffer(dataChannel);
          dataChannel.send(JSON.stringify({ type: 'file-chunk', uid, index: i, data: base64 }));

          setFileList(prev => prev.map(f =>
            f.uid === uid
              ? { ...f, progress: Math.round(((i + 1) / totalChunks) * 100), status: 'uploading' }
              : f
          ));
        }

        // 发送结束标记
        dataChannel.send(JSON.stringify({ type: 'file-end', uid }));
        setFileList(prev => prev.map(f =>
          f.uid === uid ? { ...f, status: 'done', progress: 100 } : f
        ));
      } catch (err: any) {
        setFileList(prev => prev.map(f =>
          f.uid === uid ? { ...f, status: 'error', error: err.message } : f
        ));
      }
    }

    setUploading(false);
    message.success('文件发送完成');
  };

  const handleRemove = (uid: string) => {
    setFileList(prev => prev.filter(f => f.uid !== uid));
  };

  const beforeUpload = (file: File) => {
    setFileList(prev => [...prev, {
      uid: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'pending',
      file
    }]);
    return false;
  };

  const isChannelReady = dataChannel?.readyState === 'open';

  return (
    <Modal
      title="文件传输"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>,
        <Button
          key="send"
          type="primary"
          loading={uploading}
          onClick={handleSend}
          disabled={fileList.filter(f => f.status === 'pending').length === 0 || !isChannelReady}
        >
          发送
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
        <p className="ant-upload-hint">支持批量发送，单个文件最大 100MB，文件直接传输至对方设备</p>
      </Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Text strong>发送列表（{fileList.length} 个文件）</Text>
          <List
            size="small"
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  item.status === 'pending' && (
                    <Button
                      key="remove"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(item.uid)}
                    />
                  )
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={getFileIcon(item.name)}
                  title={item.name}
                  description={
                    <Space direction="vertical" size={0}>
                      <Text type="secondary">{formatFileSize(item.size)}</Text>
                      {item.status === 'uploading' && (
                        <Progress percent={item.progress} size="small" status="active" />
                      )}
                      {item.status === 'done' && (
                        <Text type="success"><CheckCircleOutlined /> 发送完成</Text>
                      )}
                      {item.status === 'error' && (
                        <Text type="danger"><CloseCircleOutlined /> {item.error}</Text>
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

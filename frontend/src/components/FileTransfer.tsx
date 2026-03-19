import React, { useState, useRef } from 'react';
import { Modal, Upload, Button, List, Progress, Typography, Space, message, Alert } from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';

const { Dragger } = Upload;
const { Text } = Typography;

interface FileItem {
  uid: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
}

interface FileTransferProps {
  visible: boolean;
  onClose: () => void;
  connectionId: string;
}

const FileTransfer: React.FC<FileTransferProps> = ({ visible, onClose, connectionId }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    }
    if (ext === 'pdf') {
      return <FilePdfOutlined style={{ color: '#f5222d' }} />;
    }
    if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileWordOutlined style={{ color: '#1890ff' }} />;
    }
    return <FileOutlined />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = () => {
    if (fileList.length === 0) {
      message.warning('请选择要传输的文件');
      return;
    }

    setUploading(true);

    // 模拟文件上传
    const uploadedFiles = fileList.map((file, index) => ({
      ...file,
      status: 'uploading' as const,
      progress: 0
    }));
    setFileList(uploadedFiles);

    // 模拟上传进度
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        setFileList(prev => prev.map(f => ({
          ...f,
          progress: 100,
          status: 'done'
        })));

        setUploading(false);
        message.success('文件传输完成');
      } else {
        setFileList(prev => prev.map((f, i) =>
          i === index ? { ...f, progress: Math.floor(progress) } : f
        ));
      }
    }, 300);
  };

  const handleRemove = (uid: string) => {
    setFileList(prev => prev.filter(f => f.uid !== uid));
  };

  const beforeUpload = (file: File) => {
    const newFile: FileItem = {
      uid: file.uid || Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      status: 'pending'
    };
    setFileList(prev => [...prev, newFile]);
    return false;
  };

  return (
    <Modal
      title="文件传输"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="upload"
          type="primary"
          loading={uploading}
          onClick={handleUpload}
          disabled={fileList.length === 0}
        >
          开始传输
        </Button>
      ]}
    >
      <Alert
        message="文件传输说明"
        description="文件将通过加密通道传输给对方，最大支持100MB的文件。请确保网络畅通。"
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Dragger
        name="file"
        multiple
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={uploading}
        style={{ padding: '20px' }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
        <p className="ant-upload-hint">
          支持单个或批量上传，最大100MB
        </p>
      </Dragger>

      {fileList.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Text strong>传输列表 ({fileList.length}个文件)</Text>
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
                        <Text type="success">
                          <CheckCircleOutlined /> 传输完成
                        </Text>
                      )}
                      {item.status === 'error' && (
                        <Text type="danger">
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

import React from 'react';
import { Card, Typography, Empty, Button, Space, List, Tag, Divider, message } from 'antd';
import {
  FolderOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  FileOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const FileCenterPage: React.FC = () => {
  const navigate = useNavigate();

  // 模拟文件列表
  const fileList = [
    {
      id: 1,
      name: '项目文档.pdf',
      size: '2.5 MB',
      type: 'pdf',
      time: '2024-01-15 10:30',
      status: 'completed',
    },
    {
      id: 2,
      name: '屏幕截图.png',
      size: '1.2 MB',
      type: 'image',
      time: '2024-01-14 15:20',
      status: 'completed',
    },
  ];

  const handleUpload = () => {
    message.info('文件上传功能开发中');
  };

  const handleDownload = (fileName: string) => {
    message.info(`下载 ${fileName} 功能开发中`);
  };

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          文件传输
        </Title>
        <Text type="secondary">在远程连接过程中传输文件</Text>
      </div>

      {/* 功能说明卡片 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              background: '#e6f7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FolderOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            </div>
            <div>
              <Title level={5} style={{ margin: 0 }}>远程文件传输</Title>
              <Text type="secondary">在远程控制过程中，快速传输文件到对方设备</Text>
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<UploadOutlined />}>上传文件</Button>
            <Button icon={<DownloadOutlined />}>接收文件</Button>
          </div>
        </Space>
      </Card>

      {/* 文件传输说明 */}
      <Card title="使用方法">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Paragraph>
            1. 先建立<Button type="link" onClick={() => navigate('/')} style={{ padding: 0 }}>远程连接</Button>
          </Paragraph>
          <Paragraph>
            2. 连接成功后，在远程桌面窗口的工具栏中点击"传输文件"按钮
          </Paragraph>
          <Paragraph>
            3. 选择要传输的文件，支持批量传输
          </Paragraph>
          <Paragraph>
            4. 传输过程中可查看进度，传输完成后文件将保存在对方设备的下载目录
          </Paragraph>
        </Space>
      </Card>

      {/* 传输记录 */}
      <Card
        title="传输记录"
        style={{ marginTop: 24 }}
        extra={
          <Button icon={<DeleteOutlined />} danger>
            清空记录
          </Button>
        }
      >
        {fileList.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={fileList}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(item.name)}
                  >
                    下载
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 4,
                      background: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileOutlined style={{ fontSize: 20, color: '#666' }} />
                    </div>
                  }
                  title={
                    <Space>
                      <span>{item.name}</span>
                      <Tag color="green">{item.status}</Tag>
                    </Space>
                  }
                  description={
                    <Space split={<Divider type="vertical" />}>
                      <span>{item.size}</span>
                      <span>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {item.time}
                      </span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无传输记录"
          />
        )}
      </Card>

      {/* 注意事项 */}
      <Card style={{ marginTop: 24 }} title="注意事项">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            • 单个文件大小限制: 100MB
          </Text>
          <Text type="secondary">
            • 支持的文件格式: 文档、图片、视频、压缩包等常见格式
          </Text>
          <Text type="secondary">
            • 传输速度取决于网络环境
          </Text>
          <Text type="secondary">
            • 为保护隐私，传输的文件不会保存到服务器
          </Text>
        </Space>
      </Card>
    </div>
  );
};

export default FileCenterPage;

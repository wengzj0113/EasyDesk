import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import {
  FolderOpenOutlined,
  ApiOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const FileCenterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>文件传输</Title>
        <Text type="secondary">通过远程连接直接传输文件到对方设备</Text>
      </div>

      {/* 功能说明 */}
      <Card>
        <Space align="start" size={16}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: '#e6f7ff', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FolderOpenOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>P2P 直接传输</Title>
            <Text type="secondary">
              文件通过 WebRTC DataChannel 点对点加密传输，不经过服务器，速度快且安全。
            </Text>
          </div>
        </Space>
        <Divider style={{ margin: '16px 0' }} />
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <Space align="start">
            <ApiOutlined style={{ color: '#1890ff', marginTop: 3 }} />
            <div>
              <Text strong>如何使用</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                1. 在<Text
                  type="secondary"
                  style={{ color: '#1890ff', cursor: 'pointer' }}
                  onClick={() => navigate('/')}
                >
                  主页
                </Text>建立远程连接<br />
                2. 连接成功后，点击控制栏中的文件夹图标<br />
                3. 选择文件并点击「发送」，文件将直接传输至对方设备<br />
                4. 接收方会自动弹出下载提示
              </Paragraph>
            </div>
          </Space>
          <Space align="start">
            <SafetyCertificateOutlined style={{ color: '#52c41a', marginTop: 3 }} />
            <div>
              <Text strong>安全性</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                传输全程端对端加密（DTLS），文件不会经过或保存到服务器
              </Paragraph>
            </div>
          </Space>
          <Space align="start">
            <ThunderboltOutlined style={{ color: '#faad14', marginTop: 3 }} />
            <div>
              <Text strong>限制说明</Text>
              <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
                单个文件最大 100MB；传输速度取决于双方网络环境；需要先建立远程连接才能传输文件
              </Paragraph>
            </div>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default FileCenterPage;

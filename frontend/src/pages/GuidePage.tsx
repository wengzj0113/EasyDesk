import React from 'react';
import { Card, Typography, Button, Steps, Row, Col, List, Alert } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, UserOutlined, CrownOutlined, LockOutlined, CheckCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const GuidePage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <LockOutlined style={{ fontSize: '32px', color: '#1890ff' }} />,
      title: '免登录连接',
      description: '无需注册，输入设备码和密码即可远程控制'
    },
    {
      icon: <UserOutlined style={{ fontSize: '32px', color: '#52c41a' }} />,
      title: '一键直连',
      description: '登录后绑定设备，再次连接无需输入密码'
    },
    {
      icon: <CrownOutlined style={{ fontSize: '32px', color: '#faad14' }} />,
      title: 'VIP特权',
      description: '专属线路、超清画质、不限速传输'
    }
  ];

  return (
    <div style={{ padding: '50px', maxWidth: 900, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
        返回首页
      </Button>

      <Title level={2} style={{ textAlign: 'center', marginBottom: 40 }}>使用指南</Title>

      {/* 功能特点 */}
      <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
        {features.map((item, index) => (
          <Col xs={24} md={8} key={index}>
            <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
              <div style={{ marginBottom: 12 }}>{item.icon}</div>
              <Title level={4}>{item.title}</Title>
              <Text type="secondary">{item.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 被控端设置 */}
      <Card title="🔧 被控端设置（需要被控制的电脑）" style={{ marginBottom: 24 }}>
        <Alert
          message="重要：被控电脑必须按以下步骤操作"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Steps
          current={0}
          direction="vertical"
          items={[
            {
              title: '安装 EasyDesk 客户端',
              description: '在被控电脑上下载并安装 EasyDesk'
            },
            {
              title: '打开客户端',
              description: '运行 EasyDesk，进入主界面'
            },
            {
              title: '选择"被控端"模式',
              description: '点击"发起远程协助" → 选择"被控端 - 让别人控制我的电脑"'
            },
            {
              title: '等待连接',
              description: '保持页面开启，不要关闭浏览器'
            }
          ]}
        />
      </Card>

      {/* 控制端操作 */}
      <Card title="🎮 控制端操作（发起控制的电脑）" style={{ marginBottom: 24 }}>
        <Steps
          current={0}
          direction="vertical"
          items={[
            {
              title: '获取被控设备信息',
              description: '在被控电脑上获取9位设备码（如 123456789）和连接密码'
            },
            {
              title: '发起连接',
              description: '在你的电脑上打开 EasyDesk → 输入设备码和密码 → 点击"连接设备"'
            },
            {
              title: '等待对方确认',
              description: '被控端会收到连接请求，点击"接受"即可建立连接'
            },
            {
              title: '开始远程控制',
              description: '连接成功后即可远程操作对方电脑'
            }
          ]}
        />
      </Card>

      {/* 注意事项 */}
      <Card title="⚠️ 注意事项" style={{ marginBottom: 24 }}>
        <List
          size="small"
          dataSource={[
            '被控电脑必须保持 EasyDesk 客户端开启状态',
            '被控电脑选择"被控端"模式后才能接收连接',
            '设备码为9位纯数字，如 123456789',
            '连接密码为6位纯数字',
            '确保两台电脑都能访问互联网',
            '建议使用 Chrome 或 Edge 浏览器获得最佳体验'
          ]}
          renderItem={(item) => (
            <List.Item>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              {item}
            </List.Item>
          )}
        />
      </Card>

      <div style={{ textAlign: 'center' }}>
        <Button type="primary" icon={<DesktopOutlined />} size="large" onClick={() => navigate('/connection')} style={{ marginRight: 16 }}>
          发起远程控制
        </Button>
        <Button icon={<SettingOutlined />} onClick={() => navigate('/')}>
          打开被控模式
        </Button>
      </div>
    </div>
  );
};

export default GuidePage;

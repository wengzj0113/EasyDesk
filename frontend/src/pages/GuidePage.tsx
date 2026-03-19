import React from 'react';
import { Card, Typography, Button, Steps, Row, Col, List } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, UserOutlined, CrownOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
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

  const steps = [
    {
      title: '获取设备信息',
      description: '在被控设备上获取6位设备码和连接密码',
    },
    {
      title: '发起连接',
      description: '在连接页面输入设备码和密码',
    },
    {
      title: '等待确认',
      description: '对方接受连接请求后建立连接',
    },
    {
      title: '开始控制',
      description: '连接成功后即可远程操作对方设备',
    }
  ];

  return (
    <div style={{ padding: '50px', maxWidth: 900, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: '24px' }}
      >
        返回首页
      </Button>

      <Title level={2} style={{ textAlign: 'center', marginBottom: '40px' }}>
        使用指南
      </Title>

      {/* 功能特点 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        {features.map((item, index) => (
          <Col xs={24} md={8} key={index}>
            <Card hoverable style={{ textAlign: 'center', height: '100%' }}>
              <div style={{ marginBottom: '12px' }}>{item.icon}</div>
              <Title level={4}>{item.title}</Title>
              <Text type="secondary">{item.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 连接步骤 */}
      <Card title="连接步骤" style={{ marginBottom: '24px' }}>
        <Steps current={-1} items={steps} />

        <div style={{ marginTop: '32px' }}>
          <Paragraph>
            <Text strong>温馨提示：</Text>
          </Paragraph>
          <List
            size="small"
            dataSource={[
              '首次连接需要在被控设备上安装EasyDesk客户端',
              '确保网络畅通，防火墙已开放相应端口',
              '如遇连接问题，请检查设备是否在线',
              '建议在被控设备上设置访问密码保护'
            ]}
            renderItem={(item) => (
              <List.Item>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                {item}
              </List.Item>
            )}
          />
        </div>
      </Card>

      {/* 登录用户指南 */}
      <Card title="登录用户专属功能">
        <List
          size="small"
          dataSource={[
            '绑定自己的设备，一键直连无需密码',
            '查看设备在线状态，随时远程控制',
            '享受VIP专属线路和超清画质',
            '查看连接历史记录'
          ]}
          renderItem={(item) => (
            <List.Item>
              <UserOutlined style={{ color: '#1890ff', marginRight: '8px' }} />
              {item}
            </List.Item>
          )}
        />
        <Button
          type="primary"
          icon={<DesktopOutlined />}
          onClick={() => navigate('/connection')}
          size="large"
          style={{ marginTop: '16px' }}
        >
          立即体验
        </Button>
      </Card>
    </div>
  );
};

export default GuidePage;

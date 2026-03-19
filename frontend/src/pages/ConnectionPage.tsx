import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Card, Alert, Steps, Radio, Space, Layout } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, CheckCircleOutlined, LoadingOutlined, MonitorOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { connectionAPI } from '../services/api';
import { useStore } from '../store/useStore';
import RemoteDesktop from '../components/RemoteDesktop';

const { Title, Text } = Typography;
const { Content } = Layout;

const ConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { token } = useStore();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'requesting' | 'waiting' | 'connected'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [connectionMode, setConnectionMode] = useState<'controller' | 'controlled'>('controller');

  const onFinish = async (values: { deviceCode: string; password: string }) => {
    setLoading(true);
    setConnecting(true);
    setConnectionStatus('requesting');

    try {
      const res = await connectionAPI.connect({
        deviceCode: values.deviceCode.toUpperCase(),
        password: values.password
      });

      setConnectionInfo(res);
      setConnectionStatus('waiting');
      message.success('连接请求已发送，等待对方确认');

      // 模拟等待响应（实际通过WebSocket）
      setTimeout(() => {
        setConnecting(false);
        message.info('连接已建立');
        setConnectionStatus('connected');
      }, 3000);
    } catch (error: any) {
      setConnecting(false);
      setConnectionStatus('idle');
      message.error(error.response?.data?.error || '连接失败，请检查设备码和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setConnectionStatus('idle');
    setConnectionInfo(null);
    setConnecting(false);
  };

  const handleDisconnect = () => {
    handleReset();
  };

  // 已连接状态，显示远程桌面
  if (connectionStatus === 'connected') {
    return (
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        <Content style={{ padding: 0, height: '100%' }}>
          <RemoteDesktop
            connectionId={connectionInfo?.connectionId || 'connection'}
            onDisconnect={handleDisconnect}
            role={connectionMode}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Content style={{ padding: '50px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
          style={{ marginBottom: '24px' }}
        >
          返回首页
        </Button>

        <Card>
          <Title level={3} style={{ marginBottom: '24px', textAlign: 'center' }}>
            {connectionMode === 'controller' ? '远程控制' : '等待被控制'}
          </Title>

          {/* 模式选择 */}
          <Radio.Group
            value={connectionMode}
            onChange={(e) => setConnectionMode(e.target.value)}
            style={{ width: '100%', marginBottom: '24px' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="controller">
                <Space>
                  <MonitorOutlined />
                  <span>控制端 - 控制别人的电脑</span>
                </Space>
              </Radio>
              <Radio value="controlled">
                <Space>
                  <DesktopOutlined />
                  <span>被控端 - 让别人控制我的电脑</span>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>

          {connectionStatus !== 'idle' && (
            <Steps
              current={connectionStatus === 'requesting' ? 0 : connectionStatus === 'waiting' ? 1 : 2}
              style={{ marginBottom: '24px' }}
              items={[
                { title: '发起请求', icon: connectionStatus === 'requesting' ? <LoadingOutlined /> : <CheckCircleOutlined /> },
                { title: '等待确认', icon: connectionStatus === 'waiting' ? <LoadingOutlined /> : connectionStatus === 'connected' ? <CheckCircleOutlined /> : null },
                { title: '连接成功', icon: connectionStatus === 'connected' ? <CheckCircleOutlined /> : null }
              ]}
            />
          )}

          {connectionStatus === 'connected' && connectionInfo ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <DesktopOutlined style={{ fontSize: '64px', color: '#52c41a', marginBottom: '16px' }} />
              <Title level={4}>连接成功</Title>
              <Text type="secondary">设备: {connectionInfo.deviceInfo?.deviceName}</Text>
              <div style={{ marginTop: '24px' }}>
                <Button type="primary" onClick={() => message.info('远程桌面功能开发中')}>
                  开始远程控制
                </Button>
                <Button style={{ marginLeft: '8px' }} onClick={handleReset}>
                  断开连接
                </Button>
              </div>
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              disabled={connecting}
            >
              {connectionMode === 'controlled' ? (
                // 被控端模式
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <DesktopOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} />
                  <Title level={4}>等待连接...</Title>
                  <Text type="secondary">
                    请让对方输入您的设备码进行连接
                  </Text>
                  <div style={{ marginTop: '24px' }}>
                    <Alert
                      message="设备码获取方式"
                      description="在已绑定的设备列表中查看您的设备码"
                      type="info"
                      showIcon
                    />
                  </div>
                </div>
              ) : (
                // 控制端模式
                <>
                  <Form.Item
                    label="设备码"
                    name="deviceCode"
                    rules={[
                      { required: true, message: '请输入设备码' },
                      { len: 6, message: '设备码必须是6位' }
                    ]}
                  >
                    <Input
                      placeholder="请输入6位设备码"
                      style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 'bold' }}
                      maxLength={6}
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    label="连接密码"
                    name="password"
                    rules={[{ required: true, message: '请输入连接密码' }]}
                  >
                    <Input.Password placeholder="请输入连接密码" size="large" />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      size="large"
                      loading={loading}
                      icon={<DesktopOutlined />}
                    >
                      {connecting ? '正在连接...' : '连接设备'}
                    </Button>
                  </Form.Item>
                </>
              )}
            </Form>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px', color: '#999' }}>
            {token ? '您已登录，可享受更稳定的连接服务' : '免登录即可连接，无需注册账户'}
          </div>

          {!token && (
            <Alert
              message="提示"
              description="登录后可绑定设备，一键直连，无需输入密码"
              type="info"
              showIcon
              style={{ marginTop: '16px' }}
              action={
                <Button size="small" onClick={() => navigate('/guide')}>
                  查看教程
                </Button>
              }
            />
          )}
        </Card>
      </div>
    </Content>
  );
};

export default ConnectionPage;

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message, Card, Alert, Steps, Radio, Space, Layout } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, CheckCircleOutlined, LoadingOutlined, MonitorOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getSessionDeviceCode, getSessionPassword } from '../utils/deviceCode';
import RemoteDesktop from '../components/RemoteDesktop';

const { Title, Text } = Typography;
const { Content } = Layout;

const ConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { token } = useStore();

  // 从 HomePage 跳转时携带的 state
  const locationState = location.state as { deviceCode?: string; password?: string; role?: string } | null;

  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'requesting' | 'connected'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [connectionMode, setConnectionMode] = useState<'controller' | 'controlled'>(
    (locationState?.role as 'controller' | 'controlled') || 'controller'
  );

  // 从 HomePage 带参跳转时自动填充表单
  useEffect(() => {
    if (locationState?.deviceCode) {
      form.setFieldsValue({
        deviceCode: locationState.deviceCode,
        password: locationState.password || '',
      });
    }
  }, []);

  const onFinish = async (values: { deviceCode: string; password: string }) => {
    setLoading(true);
    setConnectionStatus('requesting');
    try {
      // 发起连接后直接进入 RemoteDesktop，
      // RemoteDesktop 会通过 socketService 完成握手
      setConnectionInfo({
        targetDeviceCode: values.deviceCode.toUpperCase(),
        password: values.password,
      });
      setConnectionStatus('connected');
      message.success('连接请求已发出，等待对方确认...');
    } catch (error: any) {
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
  };

  const handleDisconnect = () => {
    handleReset();
    navigate('/');
  };

  // 控制端：已连接，展示远程桌面
  if (connectionStatus === 'connected' && connectionMode === 'controller' && connectionInfo) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        <Content style={{ padding: 0, height: '100%' }}>
          <RemoteDesktop
            connectionId={connectionInfo.targetDeviceCode}
            onDisconnect={handleDisconnect}
            role="controller"
            deviceCode={getSessionDeviceCode()}
            password=""
            targetDeviceCode={connectionInfo.targetDeviceCode}
          />
        </Content>
      </Layout>
    );
  }

  // 被控端：直接展示远程桌面（等待他人连接）
  if (connectionMode === 'controlled') {
    return (
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        <Content style={{ padding: 0, height: '100%' }}>
          <RemoteDesktop
            connectionId="controlled-session"
            onDisconnect={() => navigate('/')}
            role="controlled"
            deviceCode={getSessionDeviceCode()}
            password={getSessionPassword()}
            targetDeviceCode=""
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Content style={{ padding: '50px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
          返回首页
        </Button>

        <Card>
          <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>
            {connectionMode === 'controller' ? '远程控制' : '等待被控制'}
          </Title>

          {/* 模式选择 */}
          <Radio.Group
            value={connectionMode}
            onChange={(e) => setConnectionMode(e.target.value)}
            style={{ width: '100%', marginBottom: 24 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="controller">
                <Space><MonitorOutlined /><span>控制端 - 控制别人的电脑</span></Space>
              </Radio>
              <Radio value="controlled">
                <Space><DesktopOutlined /><span>被控端 - 让别人控制我的电脑</span></Space>
              </Radio>
            </Space>
          </Radio.Group>

          {connectionStatus === 'requesting' && (
            <Steps
              current={0}
              style={{ marginBottom: 24 }}
              items={[
                { title: '发起请求', icon: <LoadingOutlined /> },
                { title: '等待确认' },
                { title: '连接成功', icon: connectionStatus === 'connected' ? <CheckCircleOutlined /> : undefined }
              ]}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} disabled={loading}>
            <Form.Item
              label="设备码"
              name="deviceCode"
              rules={[
                { required: true, message: '请输入设备码' },
                { len: 9, message: '设备码必须是9位' }
              ]}
            >
              <Input
                placeholder="请输入9位数字设备码"
                style={{ letterSpacing: '6px', fontWeight: 'bold' }}
                maxLength={9}
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
                连接设备
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 16, color: '#999' }}>
            {token ? '您已登录，可享受更稳定的连接服务' : '免登录即可连接，无需注册账户'}
          </div>

          {!token && (
            <Alert
              message="提示"
              description="登录后可绑定设备，一键直连，无需输入密码"
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      </div>
    </Content>
  );
};

export default ConnectionPage;

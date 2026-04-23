import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message, Card, Alert, Steps, Radio, Space, Layout, Tooltip, Divider, List, Tag, Empty, Skeleton, Modal } from 'antd';
import { ArrowLeftOutlined, DesktopOutlined, CheckCircleOutlined, LoadingOutlined, MonitorOutlined, SwapOutlined, HeartOutlined, ClockCircleOutlined, DeleteOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore, type SavedConnection } from '../store/useStore';
import { getSessionDeviceCode, getSessionPassword } from '../utils/deviceCode';
import RemoteDesktop from '../components/RemoteDesktop';

const { Title, Text } = Typography;
const { Content } = Layout;

const ConnectionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const { token, savedConnections, connectionHistory, removeSavedConnection } = useStore();
  const [mounted, setMounted] = React.useState(false);

  // Mount animation
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 从 HomePage 跳转时携带的 state
  const locationState = location.state as { deviceCode?: string; password?: string; role?: string } | null;

  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'requesting' | 'connected'>('idle');
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [connectionMode, setConnectionMode] = useState<'controller' | 'controlled'>(
    (locationState?.role as 'controller' | 'controlled') || 'controlled'
  );

  // 从 HomePage 带参跳转时自动填充表单
  useEffect(() => {
    if (locationState?.deviceCode) {
      form.setFieldsValue({
        deviceCode: locationState.deviceCode,
        password: locationState.password || '',
      });
    }
  }, [form, locationState]);

  // 快速连接（从收藏）
  const handleQuickConnect = (conn: SavedConnection) => {
    form.setFieldsValue({
      deviceCode: conn.deviceCode,
      password: conn.password || '',
    });
    setConnectionInfo({
      targetDeviceCode: conn.deviceCode,
      targetDeviceName: conn.deviceName,
      password: conn.password || '',
    });
    setConnectionStatus('connected');
    message.success(`正在连接 ${conn.deviceName || conn.deviceCode}...`);
  };

  // 快速连接历史
  const handleQuickHistory = (item: typeof connectionHistory[0]) => {
    form.setFieldsValue({
      deviceCode: item.deviceCode,
      password: '',
    });
    setConnectionInfo({
      targetDeviceCode: item.deviceCode,
      targetDeviceName: item.deviceName,
      password: '',
    });
    setConnectionStatus('connected');
    message.success(`正在连接 ${item.deviceName || item.deviceCode}...`);
  };

  const formatDeviceCode = (value: string): string => {
    const digits = value.replace(/\D/g, '').substring(0, 9);
    const formatted = digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    return formatted.trim();
  };

  const onFinish = async (values: { deviceCode: string; password: string }) => {
    setLoading(true);
    setConnectionStatus('requesting');
    try {
      setConnectionInfo({
        targetDeviceCode: values.deviceCode.toUpperCase(),
        password: values.password,
      });
      setConnectionStatus('connected');
      message.success('连接请求已发出，等待对方确认...');
    } catch (error: unknown) {
      setConnectionStatus('idle');
      message.error({
        content: '连接失败，请检查设备码和密码是否正确',
        duration: 3,
      });
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
    Modal.confirm({
      title: '确定断开连接？',
      content: '确定要断开当前远程连接吗？',
      okText: '确定断开',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        handleReset();
        navigate('/');
      },
    });
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
            targetDeviceName={connectionInfo.targetDeviceName}
          />
        </Content>
      </Layout>
    );
  }

  // 被控端：直接展示远程桌面
  if (connectionMode === 'controlled') {
    return (
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000
        }}>
          <Tooltip title="切换到控制端">
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={() => setConnectionMode('controller')}
              size="large"
            >
              切换到控制端
            </Button>
          </Tooltip>
        </div>
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

  // 控制端：连接表单
  return (
    <Content style={{
      padding: 'clamp(16px, 4vw, 50px)',
      background: '#f0f2f5',
      minHeight: '100vh',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
          返回首页
        </Button>

        <Card>
          <Title level={3} style={{ marginBottom: 24, textAlign: 'center' }}>
            {connectionMode === 'controller' ? '远程控制' : '等待被控制'}
          </Title>

          {/* 收藏连接快捷入口 */}
          {savedConnections.length > 0 ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <HeartOutlined style={{ color: '#faad14' }} />
                  <Text strong>收藏设备</Text>
                </Space>
                <List
                  size="small"
                  dataSource={savedConnections.slice(0, 3)}
                  renderItem={(conn: SavedConnection) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '8px 0' }}
                      onClick={() => handleQuickConnect(conn)}
                      extra={
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          danger
                          aria-label="删除收藏"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedConnection(conn.id);
                          }}
                        />
                      }
                    >
                      <List.Item.Meta
                        title={<Space>
                          <DesktopOutlined />
                          <span>{conn.deviceName}</span>
                          {conn.isOnline === false && <Tag color="default">离线</Tag>}
                          {conn.isOnline === true && <Tag color="success">在线</Tag>}
                        </Space>}
                        description={<Text type="secondary" style={{ fontFamily: 'monospace', letterSpacing: 2 }}>{conn.deviceCode}</Text>}
                      />
                    </List.Item>
                  )}
                />
              </div>
              <Divider style={{ margin: '12px 0' }} />
            </>
          ) : (
            <>
              <Card style={{ textAlign: 'center', padding: 24, marginBottom: 16 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical">
                      <Text type="secondary">暂无收藏的设备</Text>
                      <Button type="link" onClick={() => navigate('/guide')}>
                        如何连接设备？
                      </Button>
                    </Space>
                  }
                />
              </Card>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          {/* 最近连接 */}
          {connectionHistory.length > 0 ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <ClockCircleOutlined style={{ color: '#1890ff' }} />
                  <Text strong>最近连接</Text>
                </Space>
                <List
                  size="small"
                  dataSource={connectionHistory.slice(0, 3)}
                  renderItem={(item) => (
                    <List.Item
                      style={{ cursor: 'pointer', padding: '8px 0' }}
                      onClick={() => handleQuickHistory(item)}
                    >
                      <List.Item.Meta
                        title={<Text>{item.deviceName}</Text>}
                        description={
                          <Space>
                            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {item.deviceCode}
                            </Text>
                            <Tag color={item.success ? 'success' : 'default'} style={{ fontSize: 10 }}>
                              {item.success ? '成功' : '断开'}
                            </Tag>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {new Date(item.timestamp).toLocaleString()}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
              <Divider style={{ margin: '12px 0' }} />
            </>
          ) : (
            <>
              <Card style={{ textAlign: 'center', padding: 24, marginBottom: 16 }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical">
                      <Text type="secondary">暂无连接历史</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        连接设备后会自动记录历史
                      </Text>
                    </Space>
                  }
                />
              </Card>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          {/* 模式选择 */}
          <Radio.Group
            value={connectionMode}
            onChange={(e) => setConnectionMode(e.target.value)}
            style={{ width: '100%', marginBottom: 24 }}
            aria-label="选择控制模式"
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="controller" aria-label="控制端模式">
                <Tooltip title="作为控制端，主动连接并控制其他设备">
                  <Space><MonitorOutlined /><span>控制端 - 控制别人的电脑</span></Space>
                </Tooltip>
              </Radio>
              <Radio value="controlled" aria-label="被控端模式">
                <Tooltip title="作为被控端，等待其他设备连接">
                  <Space><DesktopOutlined /><span>被控端 - 让别人控制我的电脑</span></Space>
                </Tooltip>
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
                { title: '连接成功', icon: <CheckCircleOutlined /> }
              ]}
            />
          )}

          {loading ? (
            <Card style={{ marginBottom: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Skeleton.Input active size="large" style={{ width: '100%' }} />
                <Skeleton.Input active size="large" style={{ width: '100%' }} />
                <Skeleton.Button active size="large" style={{ width: 120 }} />
              </Space>
            </Card>
          ) : (
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
                size="large"
                maxLength={11}
                onChange={(e) => {
                  const formatted = formatDeviceCode(e.target.value);
                  if (formatted !== e.target.value) {
                    form.setFieldValue('deviceCode', formatted);
                  }
                }}
                suffix={
                  <Tooltip title="格式: 123 456 789">
                    <InfoCircleOutlined style={{ color: '#999' }} />
                  </Tooltip>
                }
                style={{ letterSpacing: '6px', fontWeight: 'bold' }}
              />
            </Form.Item>

            <Form.Item
              label="连接密码"
              name="password"
              rules={[
                { required: true, message: '请输入连接密码' },
                { min: 6, max: 6, message: '密码必须是6位纯数字' }
              ]}
            >
              <Input.Password
                placeholder="6位纯数字密码"
                size="large"
                maxLength={6}
                prefix={<LockOutlined />}
              />
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
          )}

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

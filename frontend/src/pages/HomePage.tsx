import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Switch,
  Input,
  Button,
  Space,
  Tag,
  Divider,
  message,
  Alert,
  QRCode,
  Modal,
  InputNumber,
  Select,
} from 'antd';
import {
  DesktopOutlined,
  LockOutlined,
  CopyOutlined,
  UserOutlined,
  SettingOutlined,
  LinkOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

const { Title, Text, Paragraph } = Typography;
const { Password } = Input;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useStore();

  // 允许被控状态
  const [allowControl, setAllowControl] = useState(false);
  const [deviceCode, setDeviceCode] = useState('ABC123');
  const [tempPassword, setTempPassword] = useState('123456');

  // 远程控制输入
  const [remoteCode, setRemoteCode] = useState('');
  const [remotePassword, setRemotePassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  // 设备信息
  const [deviceName] = useState('我的电脑');
  const [connectionStatus, setConnectionStatus] = useState<'offline' | 'online' | 'controlling'>('online');

  // 复制设备码
  const copyDeviceCode = () => {
    navigator.clipboard.writeText(deviceCode);
    message.success('设备码已复制到剪贴板');
  };

  // 开始远程控制
  const handleStartControl = () => {
    if (!remoteCode || remoteCode.length !== 6) {
      message.error('请输入6位设备码');
      return;
    }
    if (!remotePassword) {
      message.error('请输入连接密码');
      return;
    }
    setConnecting(true);
    // 跳转到连接页面
    navigate('/connection', { state: { deviceCode: remoteCode, password: remotePassword } });
  };

  // 切换允许控制
  const handleToggleControl = (checked: boolean) => {
    setAllowControl(checked);
    if (checked) {
      message.success('已开启允许控制，其他设备可以远程连接');
    } else {
      message.info('已关闭允许控制');
    }
  };

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          远程控制
        </Title>
        <Text type="secondary">发起远程控制或允许其他设备控制本机</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：允许控制本设备 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DesktopOutlined />
                <span>允许控制本设备</span>
              </Space>
            }
            style={{ height: '100%' }}
            extra={
              <Switch
                checked={allowControl}
                onChange={handleToggleControl}
                checkedChildren="已开启"
                unCheckedChildren="已关闭"
              />
            }
          >
            {/* 设备状态 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ marginBottom: 8 }}>
                <Tag
                  icon={allowControl ? <WifiOutlined /> : <DisconnectOutlined />}
                  color={allowControl ? 'success' : 'default'}
                >
                  {allowControl ? '在线 - 等待连接' : '离线'}
                </Tag>
              </div>
              <Title level={4} style={{ margin: 0 }}>{deviceName}</Title>
              <Text type="secondary">Windows</Text>
            </div>

            <Divider />

            {/* 设备码显示 */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                设备码（分享给他人）
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={deviceCode}
                  readOnly
                  style={{
                    fontWeight: 'bold',
                    fontSize: 18,
                    textAlign: 'center',
                    letterSpacing: 4,
                  }}
                  size="large"
                />
                <Button
                  size="large"
                  icon={<CopyOutlined />}
                  onClick={copyDeviceCode}
                >
                  复制
                </Button>
              </Space.Compact>
            </div>

            {/* 临时密码 */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                临时密码
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Password
                  value={tempPassword}
                  readOnly
                  size="large"
                  style={{ textAlign: 'center' }}
                />
                <Button
                  size="large"
                  icon={<SettingOutlined />}
                  onClick={() => message.info('密码设置功能开发中')}
                >
                  修改
                </Button>
              </Space.Compact>
            </div>

            {/* 使用提示 */}
            {!token && (
              <Alert
                message="提示"
                description="登录后可绑定设备，开启长期自动允许控制，无需每次手动开启"
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                action={
                  <Button size="small" onClick={() => navigate('/guide')}>
                    了解更多
                  </Button>
                }
              />
            )}
          </Card>
        </Col>

        {/* 右侧：远程控制设备 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <LinkOutlined />
                <span>远程控制设备</span>
              </Space>
            }
            style={{ height: '100%' }}
          >
            {/* 连接模式选择 */}
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                连接方式
              </Text>
              <Space>
                <Tag color="blue" icon={<DesktopOutlined />}>
                  设备码连接
                </Tag>
                {token && (
                  <Tag icon={<UserOutlined />}>
                    设备列表
                  </Tag>
                )}
              </Space>
            </div>

            {/* 设备码输入 */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                对方设备码
              </Text>
              <Input
                placeholder="请输入6位设备码"
                value={remoteCode}
                onChange={(e) => setRemoteCode(e.target.value.toUpperCase())}
                maxLength={6}
                size="large"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 4,
                  fontWeight: 'bold',
                  fontSize: 18,
                  textAlign: 'center',
                }}
              />
            </div>

            {/* 密码输入 */}
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                连接密码
              </Text>
              <Password
                placeholder="请输入连接密码"
                value={remotePassword}
                onChange={(e) => setRemotePassword(e.target.value)}
                size="large"
                style={{ textAlign: 'center' }}
              />
            </div>

            {/* 连接按钮 */}
            <Button
              type="primary"
              size="large"
              block
              icon={<DesktopOutlined />}
              onClick={handleStartControl}
              loading={connecting}
              style={{ height: 48, fontSize: 16 }}
            >
              {connecting ? '正在连接...' : '开始远程控制'}
            </Button>

            {/* 帮助链接 */}
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">
                不知道设备码？
                <Button type="link" onClick={() => navigate('/guide')} style={{ padding: 0 }}>
                  查看教程
                </Button>
              </Text>
            </div>

            {/* 最近连接 */}
            <Divider orientation="left">最近连接</Divider>
            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
              <Text type="secondary">暂无最近连接记录</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 底部快捷操作 */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card size="small">
            <Space split={<Divider type="vertical" />}>
              <Button type="link" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
                高级设置
              </Button>
              <Button type="link" icon={<DesktopOutlined />} onClick={() => navigate('/connection')}>
                发起远程协助
              </Button>
              <Button type="link" icon={<UserOutlined />} onClick={() => navigate('/devices')}>
                设备管理
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HomePage;

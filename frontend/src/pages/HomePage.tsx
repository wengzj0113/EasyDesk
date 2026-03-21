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
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { deviceAPI } from '../services/api';
import { getSessionDeviceCode, getSessionPassword, setSessionDeviceCode, setSessionPassword } from '../utils/deviceCode';

const { Title, Text } = Typography;
const { Password } = Input;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useStore();

  const [allowControl, setAllowControl] = useState(false);
  const [deviceCode, setDeviceCode] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  const [remoteCode, setRemoteCode] = useState('');
  const [remotePassword, setRemotePassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  // 加载设备码：登录时从 API 获取，未登录时使用本地会话码
  useEffect(() => {
    setConnecting(false); // 重置连接状态（返回首页时）
    if (token) {
      setLoadingCode(true);
      deviceAPI.getDeviceCode()
        .then((res: any) => {
          setDeviceCode(res.deviceCode);
          setTempPassword(res.accessPassword || getSessionPassword());
          // 同步到 sessionStorage 供 ConnectionPage 使用
          setSessionDeviceCode(res.deviceCode);
          setSessionPassword(res.accessPassword || getSessionPassword());
        })
        .catch(() => {
          setDeviceCode(getSessionDeviceCode());
          setTempPassword(getSessionPassword());
        })
        .finally(() => setLoadingCode(false));
    } else {
      setDeviceCode(getSessionDeviceCode());
      setTempPassword(getSessionPassword());
    }
  }, [token]);

  const copyDeviceCode = () => {
    navigator.clipboard.writeText(deviceCode);
    message.success('设备码已复制到剪贴板');
  };

  const handleStartControl = () => {
    if (!remoteCode || remoteCode.length !== 9) {
      message.error('请输入6位设备码');
      return;
    }
    if (!remotePassword) {
      message.error('请输入连接密码');
      return;
    }
    setConnecting(true);
    navigate('/connection', { state: { deviceCode: remoteCode, password: remotePassword, role: 'controller' } });
  };

  const handleToggleControl = (checked: boolean) => {
    setAllowControl(checked);
    message.success(checked ? '已开启允许控制，其他设备可以远程连接' : '已关闭允许控制');
  };

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>远程控制</Title>
        <Text type="secondary">发起远程控制或允许其他设备控制本机</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：允许控制本设备 */}
        <Col xs={24} lg={12}>
          <Card
            title={<Space><DesktopOutlined /><span>被控端设置</span></Space>}
            style={{ height: '100%' }}
          >
            <Alert
              message="想要别人远程控制你的电脑？点击下方按钮开启被控模式"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <Button
              type={allowControl ? 'default' : 'primary'}
              size="large"
              block
              icon={allowControl ? <CheckCircleOutlined /> : <DesktopOutlined />}
              onClick={() => {
                if (!allowControl) {
                  // 点击开启被控模式，跳转到连接页面选择被控端
                  navigate('/connection', { state: { role: 'controlled' } });
                }
              }}
              style={{ marginBottom: 16, height: 50, fontSize: 16 }}
            >
              {allowControl ? '已开启被控模式（等待连接中）' : '开启被控模式'}
            </Button>

            {!allowControl && (
              <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                开启后，他人可以通过设备码远程控制你的电脑
              </Text>
            )}

            {allowControl && (
              <>
                <Divider />

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Tag
                      icon={<WifiOutlined />}
                      color="success"
                    >
                      在线 - 等待连接
                    </Tag>
                  </div>
                  <Title level={4} style={{ margin: 0 }}>我的电脑</Title>
                  <Text type="secondary">Windows</Text>
                </div>

                <Divider />

                {/* 设备码 */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    你的设备码
                  </Text>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={deviceCode}
                      readOnly
                      disabled={loadingCode}
                      style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
                      size="large"
                    />
                    <Button size="large" icon={<CopyOutlined />} onClick={copyDeviceCode} disabled={!deviceCode}>
                      复制
                    </Button>
                  </Space.Compact>
                </div>

                {/* 临时密码 */}
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>连接密码</Text>
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
                      onClick={() => navigate('/devices')}
                    >
                      修改
                    </Button>
                  </Space.Compact>
                </div>
              </>
            )}
          </Card>
        </Col>
              </Text>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={deviceCode}
                  readOnly
                  disabled={loadingCode}
                  style={{ fontWeight: 'bold', fontSize: 18, textAlign: 'center', letterSpacing: 4 }}
                  size="large"
                />
                <Button size="large" icon={<CopyOutlined />} onClick={copyDeviceCode} disabled={!deviceCode}>
                  复制
                </Button>
              </Space.Compact>
            </div>

            {/* 临时密码 */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>临时密码</Text>
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
                  onClick={() => navigate('/devices')}
                >
                  修改
                </Button>
              </Space.Compact>
            </div>

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
            title={<Space><LinkOutlined /><span>远程控制设备</span></Space>}
            style={{ height: '100%' }}
          >
            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>连接方式</Text>
              <Space>
                <Tag color="blue" icon={<DesktopOutlined />}>设备码连接</Tag>
                {token && <Tag icon={<UserOutlined />}>设备列表</Tag>}
              </Space>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>对方设备码</Text>
              <Input
                placeholder="请输入9位数字"
                value={remoteCode}
                onChange={(e) => setRemoteCode(e.target.value.replace(/\D/g, '').slice(0, 9))}
                maxLength={9}
                size="large"
                style={{ letterSpacing: 8, fontWeight: 'bold', fontSize: 20, textAlign: 'center' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>连接密码</Text>
              <Password
                placeholder="请输入连接密码"
                value={remotePassword}
                onChange={(e) => setRemotePassword(e.target.value)}
                size="large"
                style={{ textAlign: 'center' }}
              />
            </div>

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

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">
                不知道设备码？
                <Button type="link" onClick={() => navigate('/guide')} style={{ padding: 0 }}>
                  查看教程
                </Button>
              </Text>
            </div>

            <Divider orientation="left">最近连接</Divider>
            <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
              <Text type="secondary">暂无最近连接记录</Text>
            </div>
          </Card>
        </Col>
      </Row>

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

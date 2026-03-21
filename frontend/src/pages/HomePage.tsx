import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
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
  CopyOutlined,
  SettingOutlined,
  UserOutlined,
  SettingOutlined as SettingsOutlined,
  WifiOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
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

  const [deviceCode, setDeviceCode] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);

  // 加载设备码：登录时从 API 获取，未登录时使用本地会话码
  useEffect(() => {
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

  return (
    <div style={{ padding: '0 0 24px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>远程控制</Title>
        <Text type="secondary">本设备已被控，等待远程连接</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：显示被控端状态 */}
        <Col xs={24} lg={16}>
          <Card
            title={<Space><DesktopOutlined /><span>本机状态</span></Space>}
          >
            {/* 状态提示 */}
            <Alert
              message="已开启被控模式，他人可以通过设备码远程控制你的电脑"
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 24 }}
            />

            {/* 在线状态 */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Tag
                icon={<WifiOutlined />}
                color="success"
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                在线 - 等待连接
              </Tag>
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
                  style={{ fontWeight: 'bold', fontSize: 20, textAlign: 'center', letterSpacing: 6 }}
                  size="large"
                />
                <Button size="large" icon={<CopyOutlined />} onClick={copyDeviceCode} disabled={!deviceCode}>
                  复制
                </Button>
              </Space.Compact>
            </div>

            {/* 连接密码 */}
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

        {/* 右侧：远程连接按钮 */}
        <Col xs={24} lg={8}>
          <Card
            title={<Space><DesktopOutlined /><span>远程连接</span></Space>}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Text type="secondary">
                点击下方按钮，切换到控制端模式，远程控制其他设备
              </Text>
            </div>

            <Button
              type="primary"
              size="large"
              block
              icon={<ArrowRightOutlined />}
              iconPosition="end"
              onClick={() => navigate('/connection', { state: { role: 'controller' } })}
              style={{ height: 56, fontSize: 16 }}
            >
              远程连接
            </Button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary">
                不知道设备码？
                <Button type="link" onClick={() => navigate('/guide')} style={{ padding: 0 }}>
                  查看教程
                </Button>
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24}>
          <Card size="small">
            <Space split={<Divider type="vertical" />}>
              <Button type="link" icon={<SettingsOutlined />} onClick={() => navigate('/settings')}>
                高级设置
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

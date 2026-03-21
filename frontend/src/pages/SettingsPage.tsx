import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, List, Switch, Slider, Select, Space, Divider, message } from 'antd';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  LockOutlined,
  VideoCameraOutlined,
  SoundOutlined,
  InfoCircleOutlined,
  SaveOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { settingsAPI } from '../services/api';

const { Title, Text } = Typography;

interface UserSettings {
  videoQuality: string;
  frameRate: number;
  audioEnabled: boolean;
  notificationEnabled: boolean;
  autoConnect: boolean;
  savePassword: boolean;
}

const defaultSettings: UserSettings = {
  videoQuality: '720p',
  frameRate: 30,
  audioEnabled: true,
  notificationEnabled: true,
  autoConnect: false,
  savePassword: false,
};

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useStore();

  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 加载设置
  useEffect(() => {
    if (user) {
      setLoading(true);
      settingsAPI.get()
        .then((res: any) => {
          if (res.settings) {
            setSettings({ ...defaultSettings, ...res.settings });
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      message.warning('请先登录以保存设置');
      return;
    }
    setSaving(true);
    try {
      await settingsAPI.save(settings);
      message.success('设置已保存');
    } catch (error) {
      message.error('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearUser();
    message.success('已退出登录');
    navigate('/');
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const settingsItems = [
    {
      icon: <VideoCameraOutlined />,
      title: '画质设置',
      description: '远程桌面画质和帧率',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>视频质量</Text>
            <Select
              value={settings.videoQuality}
              onChange={(value) => updateSetting('videoQuality', value)}
              style={{ width: '100%', marginTop: 8 }}
              options={[
                { value: '480p', label: '流畅 (480p)' },
                { value: '720p', label: '高清 (720p)' },
                { value: '1080p', label: '超清 (1080p)' },
              ]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Text>帧率: {settings.frameRate}fps</Text>
            <Slider
              min={15}
              max={60}
              value={settings.frameRate}
              onChange={(value) => updateSetting('frameRate', value)}
            />
          </div>
        </Space>
      ),
    },
    {
      icon: <SoundOutlined />,
      title: '音频设置',
      description: '远程音频传输',
      content: (
        <Space>
          <Text>开启音频</Text>
          <Switch
            checked={settings.audioEnabled}
            onChange={(checked) => updateSetting('audioEnabled', checked)}
          />
        </Space>
      ),
    },
    {
      icon: <BellOutlined />,
      title: '通知设置',
      description: '连接请求和状态通知',
      content: (
        <Space>
          <Text>开启通知</Text>
          <Switch
            checked={settings.notificationEnabled}
            onChange={(checked) => updateSetting('notificationEnabled', checked)}
          />
        </Space>
      ),
    },
    {
      icon: <LockOutlined />,
      title: '安全设置',
      description: '密码和登录安全',
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Text>自动连接</Text>
            <Switch
              checked={settings.autoConnect}
              onChange={(checked) => updateSetting('autoConnect', checked)}
            />
          </Space>
          <div style={{ marginTop: 8 }}>
            <Space>
              <Text>记住密码</Text>
              <Switch
                checked={settings.savePassword}
                onChange={(checked) => updateSetting('savePassword', checked)}
              />
            </Space>
          </div>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '50px', maxWidth: 800, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
        返回首页
      </Button>

      <Title level={3}>
        <SettingOutlined style={{ marginRight: 8 }} />
        设置
      </Title>

      {/* 用户信息 */}
      <Card style={{ marginBottom: 24 }} title={<><UserOutlined /> 账户信息</>}>
        {user ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div><Text type="secondary">用户名: </Text><Text strong>{user.username}</Text></div>
            <div><Text type="secondary">邮箱: </Text><Text strong>{user.email}</Text></div>
            <div>
              <Text type="secondary">VIP状态: </Text>
              <Text style={{ color: user.vipStatus ? '#faad14' : '#999' }}>
                {user.vipStatus ? '已开通VIP' : '未开通'}
              </Text>
            </div>
            <Divider />
            <Button danger onClick={handleLogout}>退出登录</Button>
          </Space>
        ) : (
          <div>
            <Text type="secondary">未登录</Text>
            <Button type="primary" style={{ marginLeft: 16 }} onClick={() => navigate('/')}>
              登录
            </Button>
          </div>
        )}
      </Card>

      {/* 设置项 */}
      <Card>
        <List
          itemLayout="vertical"
          dataSource={settingsItems}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={item.icon}
                title={item.title}
                description={item.description}
              />
              <div style={{ marginTop: 16 }}>{item.content}</div>
            </List.Item>
          )}
        />
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          size="large"
          onClick={handleSave}
          loading={saving}
          disabled={!user}
        >
          {user ? '保存设置' : '登录后可保存设置'}
        </Button>
      </div>

      <Card style={{ marginTop: 24 }} title={<><InfoCircleOutlined /> 关于</>}>
        <Space direction="vertical">
          <Text>EasyDesk 远程桌面 v1.1.0</Text>
          <Text type="secondary">极简远程桌面，简单远控</Text>
        </Space>
      </Card>
    </div>
  );
};

export default SettingsPage;

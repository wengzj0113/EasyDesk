import React from 'react';
import { Layout, Button, Space, Avatar, Dropdown, Modal, Form, Input, message } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined, SettingOutlined, HistoryOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { authAPI } from '../services/api';

const { Header: AntHeader } = Layout;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, setUser, setToken, clearUser } = useStore();
  const [loginModalVisible, setLoginModalVisible] = React.useState(false);
  const [registerModalVisible, setRegisterModalVisible] = React.useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authAPI.login(values);
      setToken(res.token);
      setUser(res.user);
      // 同时存储到localStorage供API拦截器使用
      localStorage.setItem('token', res.token);
      message.success('登录成功');
      setLoginModalVisible(false);
      loginForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: { username: string; password: string; email: string }) => {
    setLoading(true);
    try {
      const res = await authAPI.register(values);
      setToken(res.token);
      setUser(res.user);
      // 同时存储到localStorage供API拦截器使用
      localStorage.setItem('token', res.token);
      message.success('注册成功');
      setRegisterModalVisible(false);
      registerForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearUser();
    localStorage.removeItem('token');
    message.success('已退出登录');
    navigate('/');
  };

  const userMenu = {
    items: [
      {
        key: 'devices',
        label: '我的设备',
        icon: <UserOutlined />,
        onClick: () => navigate('/devices'),
      },
      {
        key: 'history',
        label: '连接历史',
        icon: <HistoryOutlined />,
        onClick: () => navigate('/history'),
      },
      {
        key: 'vip',
        label: 'VIP服务',
        icon: <CrownOutlined />,
        onClick: () => navigate('/vip'),
      },
      {
        key: 'settings',
        label: '设置',
        icon: <SettingOutlined />,
        onClick: () => navigate('/settings'),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
  };

  return (
    <>
      <AntHeader style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => navigate('/')}>
          EasyDesk
        </div>

        <Space>
          {token && user ? (
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer', color: '#fff' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <span>{user.username}</span>
                {user.vipStatus && <span style={{ color: '#faad14' }}>VIP</span>}
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Button type="text" style={{ color: '#fff' }} icon={<LoginOutlined />} onClick={() => setLoginModalVisible(true)}>
                登录
              </Button>
              <Button type="primary" onClick={() => setRegisterModalVisible(true)}>
                注册
              </Button>
            </Space>
          )}
        </Space>
      </AntHeader>

      {/* 登录弹窗 */}
      <Modal
        title="登录"
        open={loginModalVisible}
        onCancel={() => setLoginModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={loginForm} layout="vertical" onFinish={handleLogin}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 注册弹窗 */}
      <Modal
        title="注册"
        open={registerModalVisible}
        onCancel={() => setRegisterModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={registerForm} layout="vertical" onFinish={handleRegister}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '用户名至少3个字符' }]}>
            <Input placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效的邮箱' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6个字符' }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              注册
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AppHeader;

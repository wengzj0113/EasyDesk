import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { authAPI } from '../services/api';
import { useStore } from '../store/useStore';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose, onLoginSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { setUser, setToken } = useStore();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await authAPI.login(values);
      setToken(res.token);
      setUser(res.user);
      message.success('登录成功');
      form.resetFields();
      onLoginSuccess?.();
    } catch (error: any) {
      message.error(error.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="登录"
      open={visible}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleLogin}>
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
  );
};

export default LoginModal;
import React, { useEffect, useState } from 'react';
import { Card, Typography, Button, Table, Tag, Modal, Form, Input, Space, Popconfirm, message, Empty, Spin, Divider, Descriptions } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CopyOutlined, DeleteOutlined, DesktopOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { deviceAPI } from '../services/api';
import { useStore } from '../store/useStore';

const { Title, Text } = Typography;

interface Device {
  _id: string;
  deviceCode: string;
  deviceName: string;
  platform: string;
  isOnline: boolean;
  accessPassword: string;
  boundDevices: Array<{
    deviceId: {
      _id: string;
      deviceCode: string;
      deviceName: string;
      isOnline: boolean;
    };
    deviceName: string;
    boundAt: string;
  }>;
  lastSeen: string;
}

const DeviceManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [myDevice, setMyDevice] = useState<Device | null>(null);
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [bindForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    fetchMyDevice();
  }, []);

  const fetchMyDevice = async () => {
    setLoading(true);
    try {
      const res = await deviceAPI.getDeviceCode();
      setMyDevice(res);
      // 获取绑定设备列表
      const boundRes = await deviceAPI.getMyDevices();
      setDevices(boundRes.devices || []);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取设备信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleBindDevice = async (values: { deviceCode: string; deviceName: string }) => {
    try {
      await deviceAPI.bindDevice({
        deviceCode: values.deviceCode.toUpperCase(),
        deviceName: values.deviceName
      });
      message.success('设备绑定成功');
      setBindModalVisible(false);
      bindForm.resetFields();
      fetchMyDevice();
    } catch (error: any) {
      message.error(error.response?.data?.error || '绑定失败');
    }
  };

  const handleUnbindDevice = async (deviceId: string) => {
    try {
      await deviceAPI.unbindDevice(deviceId);
      message.success('设备解绑成功');
      fetchMyDevice();
    } catch (error: any) {
      message.error(error.response?.data?.error || '解绑失败');
    }
  };

  const handleUpdatePassword = async (values: { newPassword: string }) => {
    try {
      await deviceAPI.updatePassword(values);
      message.success('密码更新成功');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(error.response?.data?.error || '密码更新失败');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  const boundColumns = [
    {
      title: '设备名称',
      dataIndex: ['deviceId', 'deviceName'],
      key: 'deviceName',
    },
    {
      title: '设备码',
      dataIndex: ['deviceId', 'deviceCode'],
      key: 'deviceCode',
      render: (code: string) => <Tag color="blue">{code}</Tag>
    },
    {
      title: '在线状态',
      dataIndex: ['deviceId', 'isOnline'],
      key: 'isOnline',
      render: (online: boolean) => (
        <Tag color={online ? 'green' : 'default'}>{online ? '在线' : '离线'}</Tag>
      )
    },
    {
      title: '绑定时间',
      dataIndex: 'boundAt',
      key: 'boundAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="确定解绑此设备吗？"
          onConfirm={() => handleUnbindDevice(record.deviceId._id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            解绑
          </Button>
        </Popconfirm>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '50px', maxWidth: 900, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: '24px' }}
      >
        返回首页
      </Button>

      <Title level={3}>我的设备</Title>

      {/* 本机设备信息 */}
      <Card style={{ marginBottom: '24px' }} title={<><DesktopOutlined /> 本机设备信息</>}>
        {myDevice ? (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="设备码">
                <Space>
                  <Text strong style={{ fontSize: '18px', letterSpacing: '2px' }}>
                    {myDevice.deviceCode}
                  </Text>
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => copyToClipboard(myDevice.deviceCode)}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="设备名称">
                {myDevice.deviceName || '我的设备'}
              </Descriptions.Item>
              <Descriptions.Item label="在线状态">
                <Tag color={myDevice.isOnline ? 'green' : 'default'}>
                  {myDevice.isOnline ? '在线' : '离线'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最后活跃">
                {myDevice.lastSeen ? new Date(myDevice.lastSeen).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Space>
              <Button icon={<QrcodeOutlined />} onClick={() => message.info('二维码功能开发中')}>
                显示二维码
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchMyDevice()}>
                刷新状态
              </Button>
              <Button icon={<CopyOutlined />} onClick={() => setPasswordModalVisible(true)}>
                修改密码
              </Button>
            </Space>
          </>
        ) : (
          <Empty description="无法获取设备信息" />
        )}
      </Card>

      {/* 绑定设备列表 */}
      <Card
        title="已绑定设备"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setBindModalVisible(true)}>
            绑定新设备
          </Button>
        }
      >
        {myDevice && myDevice.boundDevices && myDevice.boundDevices.length > 0 ? (
          <Table
            dataSource={myDevice.boundDevices}
            columns={boundColumns}
            rowKey={(record) => record.deviceId._id}
            pagination={false}
          />
        ) : (
          <Empty description="暂无绑定设备">
            <Button type="primary" onClick={() => setBindModalVisible(true)}>
              绑定第一个设备
            </Button>
          </Empty>
        )}
      </Card>

      {/* 绑定设备弹窗 */}
      <Modal
        title="绑定设备"
        open={bindModalVisible}
        onCancel={() => setBindModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={bindForm} layout="vertical" onFinish={handleBindDevice}>
          <Form.Item
            label="设备码"
            name="deviceCode"
            rules={[
              { required: true, message: '请输入设备码' },
              { len: 6, message: '设备码必须是6位' }
            ]}
          >
            <Input placeholder="请输入6位设备码" maxLength={6} />
          </Form.Item>
          <Form.Item
            label="设备名称（可选）"
            name="deviceName"
          >
            <Input placeholder="自定义设备名称" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              绑定设备
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改密码弹窗 */}
      <Modal
        title="修改访问密码"
        open={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleUpdatePassword}>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagementPage;

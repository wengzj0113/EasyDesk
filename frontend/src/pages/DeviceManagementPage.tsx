import React, { useEffect, useState, useCallback } from 'react';
import { Card, Typography, Button, Table, Tag, Modal, Form, Input, Space, Popconfirm, message, Empty, Spin, Divider, Descriptions, QRCode, Radio, Tooltip, Switch, DatePicker } from 'antd';
import { PlusOutlined, CopyOutlined, DeleteOutlined, DesktopOutlined, QrcodeOutlined, ReloadOutlined, LinkOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { deviceAPI, UnattendedSettings } from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text } = Typography;

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
  unattendedAccess?: {
    enabled: boolean;
    trustedUntil?: string | null;
    allowedControllers?: string[];
    requirePassword: boolean;
  };
}

interface UnattendedSettingsForm {
  enabled: boolean;
  trustedUntil: dayjs.Dayjs | null;
  requirePassword: boolean;
  allowedControllers: string[];
}

const DeviceManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myDevice, setMyDevice] = useState<Device | null>(null);
  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [unattendedModalVisible, setUnattendedModalVisible] = useState(false);
  const [unattendedSettings, setUnattendedSettings] = useState<UnattendedSettingsForm>({
    enabled: false,
    trustedUntil: null,
    requirePassword: true,
    allowedControllers: [],
  });
  const [bindForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [unattendedForm] = Form.useForm();

  const fetchMyDevice = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await deviceAPI.getDeviceCode();
      setMyDevice(res);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '获取设备信息失败';
      message.error({
        content: (
          <Space>
            <span>{errorMessage}</span>
            <Button type="link" size="small" onClick={() => fetchMyDevice()}>
              重试
            </Button>
          </Space>
        ),
        duration: 0,
        key: 'device-load-error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyDevice();
  }, [fetchMyDevice]);

  const loadDevices = useCallback(() => {
    fetchMyDevice();
  }, [fetchMyDevice]);

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

  const handleOpenUnattendedModal = async () => {
    if (myDevice) {
      setUnattendedSettings({
        enabled: myDevice.unattendedAccess?.enabled || false,
        trustedUntil: myDevice.unattendedAccess?.trustedUntil
          ? dayjs(myDevice.unattendedAccess.trustedUntil)
          : null,
        requirePassword: myDevice.unattendedAccess?.requirePassword !== false,
        allowedControllers: myDevice.unattendedAccess?.allowedControllers || [],
      });
      setUnattendedModalVisible(true);
    }
  };

  const handleSaveUnattendedSettings = async () => {
    try {
      const settings: UnattendedSettings = {
        enabled: unattendedSettings.enabled,
        trustedUntil: unattendedSettings.trustedUntil?.toDate() || null,
        requirePassword: unattendedSettings.requirePassword,
        allowedControllers: unattendedSettings.allowedControllers,
      };
      await deviceAPI.updateUnattended(myDevice!._id, settings);
      message.success('无人值守访问设置已更新');
      setUnattendedModalVisible(false);
      fetchMyDevice();
    } catch (error: any) {
      message.error(error.response?.data?.error || '设置更新失败');
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
        <Space>
          <Button
            type="link"
            icon={<LinkOutlined />}
            aria-label={`连接设备 ${record.deviceId?.deviceName || ''}`}
            onClick={() => navigate('/connection', {
              state: {
                deviceCode: record.deviceId.deviceCode,
                role: 'controller'
              }
            })}
            disabled={!record.deviceId.isOnline}
          >
            连接
          </Button>
          <Popconfirm
            title="确定解绑此设备？"
            description={
              <Space direction="vertical">
                <Text>设备名称: <Text strong>{record.deviceId?.deviceName || record.deviceName}</Text></Text>
                <Text type="secondary">解绑后可以在连接页面重新绑定</Text>
              </Space>
            }
            onConfirm={() => handleUnbindDevice(record.deviceId._id)}
            okText="确定解绑"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} aria-label="解绑设备">
              解绑
            </Button>
          </Popconfirm>
        </Space>
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
    <div style={{ padding: 'clamp(16px, 4vw, 50px)', maxWidth: 900, margin: '0 auto' }}>
      <PageHeader
        title="设备管理"
        subtitle="管理已绑定的远程设备"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setBindModalVisible(true)}>
            绑定新设备
          </Button>
        }
      />

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
              <Tooltip title="扫码可直接连接本设备">
                <Button icon={<QrcodeOutlined />} onClick={() => setQrModalVisible(true)}>
                  显示二维码
                </Button>
              </Tooltip>
              <Button icon={<ReloadOutlined />} onClick={() => fetchMyDevice()}>
                刷新状态
              </Button>
              <Button icon={<CopyOutlined />} onClick={() => setPasswordModalVisible(true)}>
                修改密码
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={handleOpenUnattendedModal}
                type={myDevice?.unattendedAccess?.enabled ? 'primary' : 'default'}
              >
                无人值守
                {myDevice?.unattendedAccess?.enabled && <Tag color="success" style={{ marginLeft: 8 }}>已开启</Tag>}
              </Button>
            </Space>
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text type="secondary">无法获取设备信息</Text>
                <Button type="link" onClick={loadDevices}>
                  点击重试
                </Button>
              </Space>
            }
          />
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
              { len: 9, message: '设备码必须是9位' }
            ]}
          >
            <Input placeholder="请输入9位设备码" maxLength={9} />
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
            label="密码类型"
            name="type"
            initialValue="access"
          >
            <Radio.Group>
              <Radio.Button value="access">临时密码</Radio.Button>
              <Radio.Button value="permanent">长期密码</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位纯数字' },
              { pattern: /^\d+$/, message: '密码必须是纯数字' }
            ]}
          >
            <Input.Password placeholder="请输入6位纯数字密码" maxLength={6} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              确认修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title="设备二维码"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>,
          <Button key="copy" type="primary" onClick={() => {
            const text = `设备码: ${myDevice?.deviceCode || ''}\n密码: ${myDevice?.accessPassword || ''}`;
            navigator.clipboard.writeText(text);
            message.success('已复制到剪贴板');
          }}>
            复制信息
          </Button>
        ]}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <QRCode
            value={`easydesk://${myDevice?.deviceCode || ''}`}
            size={200}
            style={{ marginBottom: 16 }}
          />
          <div>
            <Text strong style={{ fontSize: 18, letterSpacing: 2 }}>
              {myDevice?.deviceCode}
            </Text>
          </div>
          <Text type="secondary">扫码可直接连接本设备</Text>
        </div>
      </Modal>

      {/* 无人值守访问设置弹窗 */}
      <Modal
        title="无人值守访问设置"
        open={unattendedModalVisible}
        onOk={handleSaveUnattendedSettings}
        onCancel={() => setUnattendedModalVisible(false)}
        okText="保存设置"
        cancelText="取消"
      >
        <Form form={unattendedForm} layout="vertical">
          <Form.Item
            label="启用无人值守访问"
            extra="开启后，已授权的设备可以无需确认直接连接"
          >
            <Switch
              checked={unattendedSettings.enabled}
              onChange={(checked) => setUnattendedSettings({
                ...unattendedSettings,
                enabled: checked
              })}
            />
            {unattendedSettings.enabled && (
              <Tag color="success" style={{ marginLeft: 12 }}>
                已启用
              </Tag>
            )}
          </Form.Item>

          <Form.Item
            label="连接时仍需密码验证"
            extra="即使开启无人值守，连接时仍需输入访问密码"
          >
            <Switch
              checked={unattendedSettings.requirePassword}
              onChange={(checked) => setUnattendedSettings({
                ...unattendedSettings,
                requirePassword: checked
              })}
            />
            {unattendedSettings.requirePassword && (
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                密码验证：启用
              </Text>
            )}
            {!unattendedSettings.requirePassword && (
              <Text type="warning" style={{ display: 'block', marginTop: 8 }}>
                安全提示：关闭密码验证后，任何授权设备均可直接连接
              </Text>
            )}
          </Form.Item>

          <Form.Item
            label="有效期（可选）"
            extra="设置后，无人值守访问将在指定时间后自动失效"
          >
            <DatePicker
              value={unattendedSettings.trustedUntil}
              onChange={(date) => setUnattendedSettings({
                ...unattendedSettings,
                trustedUntil: date
              })}
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="不设置则永久有效"
              style={{ width: '100%' }}
            />
            {unattendedSettings.trustedUntil && (
              <Button
                type="link"
                size="small"
                onClick={() => setUnattendedSettings({
                  ...unattendedSettings,
                  trustedUntil: null
                })}
                style={{ padding: 0, marginTop: 4 }}
              >
                清除有效期
              </Button>
            )}
          </Form.Item>

          <Divider />

          <Form.Item
            label="当前设备信息"
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="设备码">
                <Text strong style={{ fontFamily: 'monospace' }}>
                  {myDevice?.deviceCode}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="在线状态">
                <Tag color={myDevice?.isOnline ? 'green' : 'default'}>
                  {myDevice?.isOnline ? '在线' : '离线'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="已绑定控制器数量">
                <Text>{myDevice?.boundDevices?.length || 0} 台</Text>
              </Descriptions.Item>
            </Descriptions>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DeviceManagementPage;

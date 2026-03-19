import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Button, Space, Empty, Spin, DatePicker, Row, Col } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DesktopOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { connectionAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ConnectionRecord {
  _id: string;
  deviceId: {
    _id: string;
    deviceCode: string;
    deviceName: string;
    platform: string;
  };
  connectionType: string;
  status: string;
  startTime: string;
  endTime?: string;
  dataTransferred?: number;
  quality?: {
    resolution: string;
    fps: number;
    latency: number;
  };
}

const ConnectionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await connectionAPI.getConnectionStatus();
      setConnections(res.connections || []);
    } catch (error) {
      console.error('获取连接历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return '-';
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const duration = Math.floor((end - start) / 1000);

    if (duration < 60) return `${duration}秒`;
    if (duration < 3600) return `${Math.floor(duration / 60)}分钟`;
    return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分钟`;
  };

  const formatDataSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (time: string) => new Date(time).toLocaleString(),
      sorter: (a: ConnectionRecord, b: ConnectionRecord) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    },
    {
      title: '设备',
      dataIndex: ['deviceId', 'deviceName'],
      key: 'device',
      render: (_: any, record: ConnectionRecord) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.deviceId?.deviceName || '-'}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.deviceId?.deviceCode || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'connectionType',
      key: 'connectionType',
      render: (type: string) => (
        <Tag color={type === 'bound' ? 'blue' : 'default'}>
          {type === 'bound' ? '绑定设备' : '临时连接'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          connected: 'success',
          connecting: 'processing',
          disconnected: 'default',
          error: 'error'
        };
        const textMap: Record<string, string> = {
          connected: '已连接',
          connecting: '连接中',
          disconnected: '已断开',
          error: '连接失败'
        };
        return <Tag color={colorMap[status] || 'default'}>{textMap[status] || status}</Tag>;
      },
    },
    {
      title: '时长',
      key: 'duration',
      render: (_: any, record: ConnectionRecord) => formatDuration(record.startTime, record.endTime),
    },
    {
      title: '传输数据',
      dataIndex: 'dataTransferred',
      key: 'dataTransferred',
      render: (size: number) => formatDataSize(size || 0),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ConnectionRecord) => (
        <Button
          type="link"
          icon={<DesktopOutlined />}
          onClick={() => message.info('重新连接功能开发中')}
        >
          重连
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '50px', maxWidth: 1200, margin: '0 auto' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: '24px' }}
      >
        返回首页
      </Button>

      <Title level={3}>
        <HistoryOutlined style={{ marginRight: '8px' }} />
        连接历史
      </Title>

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Text type="secondary">
              共 {connections.length} 条连接记录
            </Text>
          </Col>
          <Col>
            <Space>
              <RangePicker />
              <Button icon={<ReloadOutlined />} onClick={fetchConnections}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>

        {connections.length > 0 ? (
          <Table
            dataSource={connections}
            columns={columns}
            rowKey="_id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        ) : (
          <Empty
            description="暂无连接记录"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/connection')}>
              开始连接
            </Button>
          </Empty>
        )}
      </Card>
    </div>
  );
};

export default ConnectionHistoryPage;

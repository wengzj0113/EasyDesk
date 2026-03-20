import React, { useEffect, useState, useCallback } from 'react';
import { Card, Table, Tag, Typography, Button, Space, Empty, Spin, DatePicker, Row, Col, message } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DesktopOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { connectionAPI } from '../services/api';
import type { RangePickerProps } from 'antd/es/date-picker';
import type { Dayjs } from 'dayjs';

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
}

const ConnectionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRecord[]>([]);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchConnections = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize: 10 };
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }
      const res: any = await connectionAPI.getHistory(params);
      setConnections(res.connections || []);
      setTotal(res.pagination?.total || 0);
    } catch (error) {
      console.error('获取连接历史失败:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchConnections(1);
    setPage(1);
  }, [fetchConnections]);

  const handleDateChange: RangePickerProps['onChange'] = (_, dateStrings) => {
    setDateRange(dateStrings[0] && dateStrings[1] ? [dateStrings[0], dateStrings[1]] : null);
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return '-';
    const duration = Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000);
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
      key: 'device',
      render: (_: any, record: ConnectionRecord) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.deviceId?.deviceName || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
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
        const map: Record<string, { color: string; text: string }> = {
          connected:    { color: 'success',    text: '已连接' },
          connecting:   { color: 'processing', text: '连接中' },
          disconnected: { color: 'default',    text: '已断开' },
          error:        { color: 'error',      text: '连接失败' },
        };
        const { color, text } = map[status] || { color: 'default', text: status };
        return <Tag color={color}>{text}</Tag>;
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
          onClick={() => {
            if (record.deviceId?.deviceCode) {
              navigate('/connection', { state: { deviceCode: record.deviceId.deviceCode, role: 'controller' } });
            } else {
              message.warning('无法获取设备信息');
            }
          }}
        >
          重连
        </Button>
      ),
    },
  ];

  if (loading && connections.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '50px', maxWidth: 1200, margin: '0 auto' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 24 }}>
        返回首页
      </Button>

      <Title level={3}>
        <HistoryOutlined style={{ marginRight: 8 }} />
        连接历史
      </Title>

      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Text type="secondary">共 {total} 条连接记录</Text>
          </Col>
          <Col>
            <Space>
              <RangePicker showTime onChange={handleDateChange} />
              <Button icon={<ReloadOutlined />} onClick={() => fetchConnections(page)} loading={loading}>
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
            loading={loading}
            pagination={{
              current: page,
              pageSize: 10,
              total,
              showTotal: (t) => `共 ${t} 条记录`,
              onChange: (p) => { setPage(p); fetchConnections(p); },
            }}
          />
        ) : (
          <Empty description="暂无连接记录" image={Empty.PRESENTED_IMAGE_SIMPLE}>
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

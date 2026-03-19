import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Button, Tag, message, Modal, Spin, List, Typography } from 'antd';
import { ArrowLeftOutlined, CrownOutlined, CheckCircleOutlined, ThunderboltOutlined, CrownFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { vipAPI } from '../services/api';
import { useStore } from '../store/useStore';

const { Title, Text, Paragraph } = Typography;

interface VIPPlan {
  key: string;
  name: string;
  price: number;
  duration: number;
  features: string[];
  recommended?: boolean;
}

const VIPIPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [loading, setLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(true);
  const [vipStatus, setVipStatus] = useState<{ isVip: boolean; vipExpireTime?: string; remainingDays?: number }>({ isVip: false });
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<VIPPlan | null>(null);

  const plans: VIPPlan[] = [
    {
      key: 'month',
      name: '月度VIP',
      price: 9.9,
      duration: 30,
      features: ['专属高速线路', '超清画质(1080P)', '不限速传输', '优先客服']
    },
    {
      key: 'quarter',
      name: '季度VIP',
      price: 26.9,
      duration: 90,
      features: ['专属高速线路', '超清画质(1080P)', '不限速传输', '优先客服', '节省10%'],
      recommended: true
    },
    {
      key: 'year',
      name: '年度VIP',
      price: 89.9,
      duration: 365,
      features: ['专属高速线路', '超清画质(2K)', '不限速传输', '优先客服', '专属客服', '节省17%']
    }
  ];

  useEffect(() => {
    fetchVipStatus();
  }, []);

  const fetchVipStatus = async () => {
    setVipLoading(true);
    try {
      const res = await vipAPI.getVIPStatus();
      setVipStatus(res);
    } catch (error) {
      // 未登录时不显示错误
    } finally {
      setVipLoading(false);
    }
  };

  const handlePurchase = (plan: VIPPlan) => {
    if (!user) {
      message.warning('请先登录后再购买VIP');
      return;
    }
    setSelectedPlan(plan);
    setPaymentModalVisible(true);
  };

  const handlePayment = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    try {
      // 创建支付订单
      await vipAPI.createPayment({ plan: selectedPlan.key });

      // 模拟支付成功（测试用）
      const res = await (vipAPI as any).simulatePayment?.({ plan: selectedPlan.key })
        .catch(() => null);

      message.success('VIP购买成功！');

      // 更新用户状态
      if (res) {
        setUser({ ...user, vipStatus: true, vipExpireTime: res.vipExpireTime });
      } else {
        setUser({ ...user, vipStatus: true });
      }

      setVipStatus({ isVip: true, vipExpireTime: res?.vipExpireTime });
      setPaymentModalVisible(false);
    } catch (error: any) {
      message.error(error.response?.data?.error || '支付失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (vipLoading) {
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

      <Title level={2} style={{ textAlign: 'center', marginBottom: '16px' }}>
        <CrownOutlined style={{ color: '#faad14', marginRight: '12px' }} />
        升级VIP，享受极致体验
      </Title>

      <Paragraph style={{ textAlign: 'center', marginBottom: '40px', color: '#666' }}>
        专属线路、超清画质、不限速传输，让远程控制更流畅
      </Paragraph>

      {/* VIP状态展示 */}
      {user && vipStatus.isVip && (
        <Card style={{ marginBottom: '40px', background: 'linear-gradient(135deg, #fff7e6 0%, #fff 100%)', border: '1px solid #ffe7ba' }}>
          <Row align="middle" gutter={24}>
            <Col>
              <CrownFilled style={{ fontSize: '48px', color: '#faad14' }} />
            </Col>
            <Col>
              <Title level={4} style={{ marginBottom: '4px' }}>您已是VIP会员</Title>
              <Text type="secondary">
                VIP有效期至：{vipStatus.vipExpireTime ? new Date(vipStatus.vipExpireTime).toLocaleDateString() : '永久'}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      <Row gutter={[24, 24]}>
        {plans.map((plan) => (
          <Col xs={24} md={8} key={plan.key}>
            <Card
              hoverable
              style={{
                height: '100%',
                border: plan.recommended ? '2px solid #faad14' : undefined,
                position: 'relative'
              }}
              title={
                <div style={{ textAlign: 'center' }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {plan.name}
                  </Title>
                  {plan.recommended && (
                    <Tag color="gold" style={{ marginTop: '4px' }}>推荐</Tag>
                  )}
                </div>
              }
            >
              {vipStatus.isVip && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '20px',
                  background: '#faad14',
                  color: '#fff',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                    已开通
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Title level={1} style={{ color: '#faad14', marginBottom: '8px', marginTop: plan.recommended ? '20px' : 0 }}>
                  ¥{plan.price}
                </Title>
                <Text type="secondary">/{plan.duration}天</Text>
              </div>

              <List
                size="small"
                dataSource={plan.features}
                renderItem={(item) => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    {item}
                  </List.Item>
                )}
                style={{ marginBottom: '24px' }}
              />

              <Button
                type={plan.recommended ? 'primary' : 'default'}
                block
                size="large"
                onClick={() => handlePurchase(plan)}
                icon={<ThunderboltOutlined />}
                style={plan.recommended ? { background: '#faad14', borderColor: '#faad14' } : {}}
              >
                {vipStatus.isVip ? '续费' : '立即购买'}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 支付确认弹窗 */}
      <Modal
        title={<><CrownOutlined /> 确认支付</>}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handlePayment}
        confirmLoading={loading}
        okText="确认支付"
        cancelText="取消"
      >
        {selectedPlan && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Title level={3}>¥{selectedPlan.price}</Title>
            <Text type="secondary">{selectedPlan.name} - {selectedPlan.duration}天</Text>
            <div style={{ marginTop: '20px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
              <Text>支付方式：模拟支付（测试用）</Text>
              <br />
              <Text type="secondary">实际项目中将接入微信支付/支付宝</Text>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VIPIPage;

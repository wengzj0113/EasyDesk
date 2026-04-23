import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Space, Breadcrumb, Typography } from 'antd';
import { ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Where to go back, defaults to home */
  backTo?: string;
  /** Optional action buttons on the right */
  actions?: React.ReactNode;
}

/**
 * Reusable page header component with back navigation and breadcrumbs
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backTo = '/',
  actions,
}) => {
  const navigate = useNavigate();

  return (
    <div style={{ marginBottom: 24 }}>
      <Space style={{ marginBottom: 8 }} size="middle">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate(backTo);
            }
          }}
        >
          返回
        </Button>
        <Breadcrumb
          items={[
            {
              title: (
                <button
                  onClick={() => navigate('/')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  aria-label="返回首页"
                >
                  <HomeOutlined />
                </button>
              ),
            },
            { title },
          ]}
        />
      </Space>
      <Space align="baseline" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </div>
        {actions && <div>{actions}</div>}
      </Space>
    </div>
  );
};

export default PageHeader;
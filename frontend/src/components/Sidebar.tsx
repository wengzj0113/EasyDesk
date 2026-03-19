import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  DesktopOutlined,
  AppstoreOutlined,
  FolderOutlined,
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;
const { Title } = Typography;

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onCollapse }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DesktopOutlined />,
      label: '远程控制',
    },
    {
      key: '/devices',
      icon: <AppstoreOutlined />,
      label: '设备列表',
    },
    {
      key: '/files',
      icon: <FolderOutlined />,
      label: '文件传输',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '高级设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={200}
      style={{
        background: '#001529',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Logo 区域 */}
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {collapsed ? (
          <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        ) : (
          <>
            <UserOutlined style={{ fontSize: 24, color: '#1890ff', marginRight: 8 }} />
            <Title
              level={4}
              style={{
                color: '#fff',
                margin: 0,
                fontSize: 16,
                whiteSpace: 'nowrap',
              }}
            >
              EasyDesk
            </Title>
          </>
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          background: 'transparent',
          borderRight: 0,
          marginTop: 16,
        }}
      />
    </Sider>
  );
};

export default Sidebar;

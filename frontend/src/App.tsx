import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// 组件
import { ProtectedRoute } from './components';
import MainLayout from './components/MainLayout';

// 页面组件
import HomePage from './pages/HomePage';
import ConnectionPage from './pages/ConnectionPage';
import DeviceManagementPage from './pages/DeviceManagementPage';
import VIPIPage from './pages/VIPIPage';
import GuidePage from './pages/GuidePage';
import ConnectionHistoryPage from './pages/ConnectionHistoryPage';
import SettingsPage from './pages/SettingsPage';
import FileCenterPage from './pages/FileCenterPage';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/connection" element={<ConnectionPage />} />
            <Route path="/devices" element={
              <ProtectedRoute>
                <DeviceManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/files" element={<FileCenterPage />} />
            <Route path="/vip" element={<VIPIPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/history" element={
              <ProtectedRoute>
                <ConnectionHistoryPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </MainLayout>
      </HashRouter>
    </ConfigProvider>
  );
}

export default App;

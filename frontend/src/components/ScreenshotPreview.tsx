import React, { useState, useCallback } from 'react';
import { Modal, Button, Space, message, InputNumber, Select, Slider, Image, Spin } from 'antd';
import {
  CameraOutlined,
  DownloadOutlined,
  CopyOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons';

interface ScreenshotPreviewProps {
  visible: boolean;
  onClose: () => void;
  isElectron: boolean;
}

const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  visible,
  onClose,
  isElectron
}) => {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);

  // 截图
  const handleCapture = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      message.error('截图功能仅在桌面客户端中可用');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.captureScreen();
      if (result.success) {
        setScreenshot(result.data);
        message.success('截图成功');
      } else {
        message.error(result.error || '截图失败');
      }
    } catch (error: any) {
      message.error(error.message || '截图失败');
    } finally {
      setLoading(false);
    }
  }, [isElectron]);

  // 下载截图
  const handleDownload = useCallback(async () => {
    if (!screenshot || !window.electronAPI) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultName = `EasyDesk_${timestamp}.png`;

      const result = await window.electronAPI.saveFileDialog(defaultName);
      if (result.success && result.filePath) {
        // 移除 data:image/png;base64, 前缀
        const base64Data = screenshot.split(',')[1];
        const saveResult = await window.electronAPI.saveFile(result.filePath, base64Data);
        if (saveResult.success) {
          message.success('保存成功');
        } else {
          message.error(saveResult.error || '保存失败');
        }
      }
    } catch (error: any) {
      message.error(error.message);
    }
  }, [screenshot]);

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    if (!screenshot) return;

    try {
      // 转换为 blob
      const response = await fetch(screenshot);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      message.success('已复制到剪贴板');
    } catch (error: any) {
      message.error('复制失败: ' + error.message);
    }
  }, [screenshot]);

  // 删除截图
  const handleDelete = useCallback(() => {
    setScreenshot(null);
  }, []);

  // 关闭时清除截图
  const handleClose = () => {
    setScreenshot(null);
    setZoom(100);
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          远程截图
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={screenshot ? 900 : 500}
      footer={[
        <Button key="capture" type="primary" onClick={handleCapture} loading={loading}>
          <CameraOutlined /> 截图
        </Button>,
        screenshot && (
          <>
            <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
              保存
            </Button>,
            <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>,
            <Button key="delete" danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除
            </Button>
          </>
        ),
        <Button key="close" onClick={handleClose}>
          关闭
        </Button>
      ]}
    >
      {!isElectron ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>截图功能仅在桌面客户端中可用</p>
          <p>请使用 Electron 客户端连接以使用此功能</p>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <p>正在截图...</p>
        </div>
      ) : screenshot ? (
        <div>
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <Space>
              <ZoomOutOutlined />
              <Slider
                style={{ width: 150 }}
                min={25}
                max={200}
                value={zoom}
                onChange={setZoom}
              />
              <ZoomInOutlined />
              <span>{zoom}%</span>
            </Space>
          </div>
          <div style={{
            overflow: 'auto',
            maxHeight: 500,
            textAlign: 'center',
            background: '#f5f5f5'
          }}>
            <Image
              src={screenshot}
              style={{
                maxWidth: `${zoom}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center'
              }}
              preview={false}
            />
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <CameraOutlined style={{ fontSize: 48, color: '#ccc' }} />
          <p>点击上方"截图"按钮进行屏幕截图</p>
          <p style={{ color: '#999' }}>截图将保存在本地设备</p>
        </div>
      )}
    </Modal>
  );
};

export default ScreenshotPreview;

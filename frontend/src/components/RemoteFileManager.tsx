import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Table,
  Breadcrumb,
  Button,
  Space,
  Input,
  Modal as AntModal,
  Upload,
  message,
  Tooltip,
  Spin,
  Select
} from 'antd';
import {
  FolderOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  HomeOutlined,
  UpOutlined,
  ReloadOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  DesktopOutlined
} from '@ant-design/icons';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedTime: number;
}

interface RemoteFileManagerProps {
  visible: boolean;
  onClose: () => void;
  dataChannel: RTCDataChannel | null;
  isElectron: boolean;
}

const RemoteFileManager: React.FC<RemoteFileManagerProps> = ({
  visible,
  onClose,
  dataChannel,
  isElectron
}) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [drives, setDrives] = useState<Array<{ name: string; path: string }>>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<FileItem | null>(null);
  const [newName, setNewName] = useState('');
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadFileList, setUploadFileList] = useState<File[]>([]);

  const CHUNK_SIZE = 32 * 1024;

  // 初始化加载磁盘列表
  useEffect(() => {
    if (visible && isElectron && window.electronAPI) {
      window.electronAPI.getDrives().then((result: any) => {
        if (result.success) {
          setDrives(result.drives);
          if (result.drives.length > 0) {
            setCurrentPath(result.drives[0].path);
          }
        }
      });
    }
  }, [visible, isElectron]);

  // 加载目录内容
  const loadDirectory = useCallback(async (path: string) => {
    if (!isElectron || !window.electronAPI) {
      message.error('文件管理仅在桌面客户端可用');
      return;
    }

    setLoading(true);
    try {
      const result = await window.electronAPI.readDirectory(path);
      if (result.success) {
        setFiles(result.items);
        setCurrentPath(path);
        setSelectedRowKeys([]);
      } else {
        message.error(result.error || '无法读取目录');
      }
    } catch (error: any) {
      message.error(error.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [isElectron]);

  // 当路径变化时加载目录
  useEffect(() => {
    if (visible && currentPath) {
      loadDirectory(currentPath);
    }
  }, [visible, currentPath, loadDirectory]);

  // 刷新当前目录
  const handleRefresh = () => {
    loadDirectory(currentPath);
  };

  // 返回上级目录
  const handleGoUp = () => {
    const parts = currentPath.split(/[/\\]/);
    if (parts.length > 1) {
      parts.pop();
      let newPath = parts.join('\\') || parts.join('/');
      if (currentPath.includes(':\\')) {
        newPath = parts[0] + '\\';
      }
      setCurrentPath(newPath);
    }
  };

  // 双击打开目录或文件
  const handleDoubleClick = (record: FileItem) => {
    if (record.isDirectory) {
      setCurrentPath(record.path);
    } else {
      // 尝试打开文件
      message.info('文件打开功能开发中');
    }
  };

  // 删除文件/目录
  const handleDelete = async () => {
    if (selectedRowKeys.length === 0) return;

    const selectedFiles = files.filter(f => selectedRowKeys.includes(f.path));
    const isDirectory = selectedFiles.some(f => f.isDirectory);

    AntModal.confirm({
      title: '确认删除',
      content: `确定要删除 ${selectedFiles.length} 个项目吗？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      onOk: async () => {
        setLoading(true);
        try {
          for (const file of selectedFiles) {
            const result = await window.electronAPI!.deleteItem(file.path, file.isDirectory);
            if (!result.success) {
              message.error(`删除 ${file.name} 失败: ${result.error}`);
            }
          }
          message.success('删除成功');
          loadDirectory(currentPath);
        } catch (error: any) {
          message.error(error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 重命名
  const handleRename = () => {
    if (selectedRowKeys.length !== 1) return;
    const file = files.find(f => f.path === selectedRowKeys[0]);
    if (file) {
      setRenameTarget(file);
      setNewName(file.name);
      setRenameModalVisible(true);
    }
  };

  const confirmRename = async () => {
    if (!renameTarget || !newName || !window.electronAPI) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.renameItem(renameTarget.path, newName);
      if (result.success) {
        message.success('重命名成功');
        setRenameModalVisible(false);
        loadDirectory(currentPath);
      } else {
        message.error(result.error || '重命名失败');
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName || !window.electronAPI) return;

    setLoading(true);
    try {
      const newPath = currentPath.endsWith('\\') || currentPath.endsWith('/')
        ? currentPath + newFolderName
        : currentPath + '\\' + newFolderName;

      const result = await window.electronAPI.createDirectory(newPath);
      if (result.success) {
        message.success('创建成功');
        setCreateFolderVisible(false);
        setNewFolderName('');
        loadDirectory(currentPath);
      } else {
        message.error(result.error || '创建失败');
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const handleDownload = async (record: FileItem) => {
    if (!window.electronAPI) return;

    try {
      const result = await window.electronAPI.readFile(record.path, { encoding: 'buffer' });
      if (result.success) {
        // 弹出保存对话框
        const saveResult = await window.electronAPI.saveFileDialog(record.name);
        if (saveResult.success && saveResult.filePath) {
          const writeResult = await window.electronAPI.saveFile(saveResult.filePath, result.data);
          if (writeResult.success) {
            message.success('保存成功');
          } else {
            message.error(writeResult.error || '保存失败');
          }
        }
      } else {
        message.error(result.error || '读取文件失败');
      }
    } catch (error: any) {
      message.error(error.message);
    }
  };

  // 上传文件
  const handleUpload = async () => {
    if (uploadFileList.length === 0 || !window.electronAPI) return;

    setLoading(true);
    try {
      for (const file of uploadFileList) {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const targetPath = currentPath.endsWith('\\') || currentPath.endsWith('/')
            ? currentPath + file.name
            : currentPath + '\\' + file.name;

          const result = await window.electronAPI.saveFile(targetPath, base64);
          if (!result.success) {
            message.error(`上传 ${file.name} 失败: ${result.error}`);
          }
        };

        reader.onerror = () => {
          message.error(`读取 ${file.name} 失败`);
        };
      }

      message.success('上传完成');
      setUploadModalVisible(false);
      setUploadFileList([]);
      loadDirectory(currentPath);
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取文件图标
  const getFileIcon = (record: FileItem) => {
    if (record.isDirectory) return <FolderOutlined style={{ color: '#faad14' }} />;

    const ext = record.name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return <FileImageOutlined style={{ color: '#1890ff' }} />;
    }
    if (ext === 'pdf') return <FilePdfOutlined style={{ color: '#f5222d' }} />;
    if (['xls', 'xlsx'].includes(ext || '')) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (['doc', 'docx'].includes(ext || '')) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    return <FileUnknownOutlined />;
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileItem) => (
        <Space>
          {getFileIcon(record)}
          <span>{name}</span>
        </Space>
      )
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number, record: FileItem) => record.isDirectory ? '-' : formatSize(size)
    },
    {
      title: '修改时间',
      dataIndex: 'modifiedTime',
      key: 'modifiedTime',
      width: 180,
      render: (time: number) => formatTime(time)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: FileItem) => (
        <Space>
          {!record.isDirectory && (
            <Tooltip title="下载">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(record);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const isChannelReady = dataChannel?.readyState === 'open';

  // 切换驱动器
  const handleDriveChange = (path: string) => {
    setCurrentPath(path);
  };

  return (
    <Modal
      title="远程文件管理"
      open={visible}
      onCancel={onClose}
      width={900}
      height={600}
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
    >
      {!isElectron ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>文件管理功能仅在桌面客户端中可用</p>
          <p>请使用 Electron 客户端连接以使用此功能</p>
        </div>
      ) : (
        <>
          {/* 工具栏 */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Select
                style={{ width: 120 }}
                value={drives.find(d => currentPath.startsWith(d.path))?.path || currentPath}
                onChange={handleDriveChange}
                placeholder="选择磁盘"
              >
                {drives.map(drive => (
                  <Select.Option key={drive.path} value={drive.path}>
                    <Space>
                      <DesktopOutlined />
                      {drive.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              <Button icon={<UpOutlined />} onClick={handleGoUp} title="返回上级" />
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} title="刷新" />
              <Button icon={<PlusOutlined />} onClick={() => setCreateFolderVisible(true)}>
                新建文件夹
              </Button>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setUploadModalVisible(true)}>
                上传文件
              </Button>
              {selectedRowKeys.length > 0 && (
                <>
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={handleDelete}
                  >
                    删除 ({selectedRowKeys.length})
                  </Button>
                  {selectedRowKeys.length === 1 && (
                    <Button icon={<EditOutlined />} onClick={handleRename}>
                      重命名
                    </Button>
                  )}
                </>
              )}
            </Space>
          </div>

          {/* 路径导航 */}
          <Breadcrumb style={{ marginBottom: 16 }}>
            <Breadcrumb.Item>
              <a onClick={() => currentPath && setCurrentPath('')}>
                <HomeOutlined /> 根目录
              </a>
            </Breadcrumb.Item>
            {currentPath && (
              <Breadcrumb.Item>{currentPath}</Breadcrumb.Item>
            )}
          </Breadcrumb>

          {/* 文件列表 */}
          <Spin spinning={loading}>
            <Table
              dataSource={files}
              columns={columns}
              rowKey="path"
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys
              }}
              onRow={(record) => ({
                onDoubleClick: () => handleDoubleClick(record)
              })}
              pagination={false}
              size="small"
              style={{ height: 400, overflow: 'auto' }}
            />
          </Spin>
        </>
      )}

      {/* 重命名对话框 */}
      <AntModal
        title="重命名"
        open={renameModalVisible}
        onOk={confirmRename}
        onCancel={() => setRenameModalVisible(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="请输入新名称"
        />
      </AntModal>

      {/* 创建文件夹对话框 */}
      <AntModal
        title="新建文件夹"
        open={createFolderVisible}
        onOk={handleCreateFolder}
        onCancel={() => {
          setCreateFolderVisible(false);
          setNewFolderName('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <Input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="请输入文件夹名称"
        />
      </AntModal>

      {/* 上传文件对话框 */}
      <AntModal
        title="上传文件"
        open={uploadModalVisible}
        onOk={handleUpload}
        onCancel={() => {
          setUploadModalVisible(false);
          setUploadFileList([]);
        }}
        okText="上传"
        cancelText="取消"
        okButtonProps={{ disabled: uploadFileList.length === 0 }}
      >
        <Upload.Dragger
          multiple
          beforeUpload={(file) => {
            setUploadFileList(prev => [...prev, file]);
            return false;
          }}
          fileList={uploadFileList.map((f, i) => ({
            uid: String(i),
            name: f.name,
            size: f.size,
            status: 'ready'
          }))}
          onRemove={(file) => {
            setUploadFileList(prev => prev.filter(f => f.name !== file.name));
          }}
        >
          <p className="ant-upload-drag-icon">
            <FolderOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">支持多文件上传</p>
        </Upload.Dragger>
      </AntModal>
    </Modal>
  );
};

export default RemoteFileManager;

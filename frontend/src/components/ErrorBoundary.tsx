/**
 * ErrorBoundary 错误边界组件
 * 捕获子组件树的 JavaScript 错误，显示友好的错误提示并防止整个应用崩溃
 * 遵循 React 错误边界模式，需要使用类组件实现 componentDidCatch
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { WarningOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  /** 错误回调（可选，用于日志上报） */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** 错误后显示的回退组件 */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary 错误边界组件
 * 捕获子树中的 JavaScript 错误并渲染备用 UI
 * 仅在类组件中可用（React 限制）
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * 生命周期方法：捕获子组件渲染期间的错误
   * @param error - 被捕获的错误对象
   * @param errorInfo - 包含组件堆栈信息的 ErrorInfo 对象
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 更新状态以渲染备用 UI
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });

    // 调用错误回调（用于日志上报）
    this.props.onError?.(error, errorInfo);

    // 生产环境可以在这里上报错误到监控服务
    if (process.env.NODE_ENV === 'production') {
      console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }
  }

  /**
   * 重置错误状态，尝试恢复应用
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    // 如果有错误且有自定义 fallback，渲染 fallback
    if (hasError && fallback) {
      return fallback;
    }

    // 如果有错误，渲染错误提示 UI
    if (hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            background: '#f5f5f5',
          }}
        >
          <Result
            status="error"
            icon={<WarningOutlined />}
            title="应用出现了一些问题"
            subTitle="抱歉，应用遇到了错误。请尝试刷新页面或返回首页"
            extra={[
              <Button
                key="reload"
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
              >
                刷新页面
              </Button>,
              <Button
                key="home"
                icon={<HomeOutlined />}
                onClick={() => {
                  this.handleReset();
                  window.location.hash = '#/';
                }}
              >
                返回首页
              </Button>,
            ]}
          />
          {process.env.NODE_ENV === 'development' && error && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: '#fff',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                maxWidth: 800,
                width: '100%',
                overflow: 'auto',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Error:
              </Text>
              <pre
                style={{
                  fontSize: 12,
                  color: '#f5222d',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {error.toString()}
              </pre>
              {errorInfo && (
                <>
                  <Text strong style={{ display: 'block', marginTop: 16, marginBottom: 8 }}>
                    Component Stack:
                  </Text>
                  <pre
                    style={{
                      fontSize: 12,
                      color: '#595959',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      margin: 0,
                    }}
                  >
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    // 正常渲染子组件
    return children;
  }
}

export default ErrorBoundary;
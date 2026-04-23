import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { Card, Input, Button, Space, Switch, Typography } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { socketService } from '../services/socketService';
import { createLogger } from '../utils/logger';

const { Text } = Typography;
const logger = createLogger('ShellTerminal');

interface ShellTerminalProps {
  deviceCode: string;
  visible: boolean;
  onClose: () => void;
}

const ShellTerminal: React.FC<ShellTerminalProps> = ({ deviceCode, visible, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [localEcho, setLocalEcho] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  // 处理 shell 结果
  const handleShellResult = useCallback((data: { sessionId: string; output: string; error?: string; exitCode: number }) => {
    if (!xtermRef.current) return;

    // 检查是否是对应当前待处理的命令
    if (pendingSessionId !== data.sessionId) return;

    setIsExecuting(false);
    setPendingSessionId(null);

    // 移除 "Executing..." 行
    const term = xtermRef.current;
    term.write('\r\n');

    // 显示输出
    if (data.output) {
      // ANSI 颜色处理
      const lines = data.output.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) term.write('\r\n');
        term.write(line);
      });
    }

    // 显示错误
    if (data.error) {
      term.write(`\r\n\x1b[31m[Error]\x1b[0m ${data.error}`);
    }

    // 显示退出码（如果非零）
    if (data.exitCode !== 0) {
      term.write(`\r\n\x1b[33m[Exit Code: ${data.exitCode}]\x1b[0m`);
    }

    // 显示提示符
    term.write('\r\n');
    writePrompt(term);
  }, [pendingSessionId]);

  // 处理 shell 错误
  const handleShellError = useCallback((data: { sessionId: string; error: string }) => {
    if (!xtermRef.current) return;

    if (pendingSessionId !== data.sessionId) return;

    setIsExecuting(false);
    setPendingSessionId(null);

    const term = xtermRef.current;
    term.write('\r\n');
    term.write(`\x1b[31m[Shell Error]\x1b[0m ${data.error}\r\n`);
    writePrompt(term);
  }, [pendingSessionId]);

  // 写入提示符
  const writePrompt = (term: Terminal) => {
    term.write(`\x1b[32m$\x1b[0m `);
  };

  // 初始化 xterm
  useEffect(() => {
    if (!visible || !terminalRef.current || xtermRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        cursorAccent: '#1e1e1e',
        selectionBackground: '#264f78',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
      rows: 18,
      scrollback: 1000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    try {
      terminal.open(terminalRef.current);
      fitAddon.fit();
    } catch (err) {
      logger.error('Failed to open terminal:', err);
      return;
    }

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 写入欢迎信息
    terminal.write('\x1b[36m╔════════════════════════════════════════╗\x1b[0m\r\n');
    terminal.write('\x1b[36m║      EasyDesk Remote Shell v1.0       ║\x1b[0m\r\n');
    terminal.write('\x1b[36m╚════════════════════════════════════════╝\x1b[0m\r\n');
    terminal.write(`\r\n\x1b[33m[Connected to device: ${deviceCode}]\x1b[0m\r\n`);
    terminal.write('\x1b[90mType "help" for available commands, "clear" to clear screen\x1b[0m\r\n');
    terminal.write('\r\n');
    writePrompt(terminal);

    // 处理终端输入
    let currentLine = '';
    terminal.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter
      if (code === 13) {
        const cmd = currentLine.trim();
        currentLine = '';

        if (cmd) {
          // 添加到历史
          setCommandHistory(prev => [...prev.slice(-49), cmd]);
          setHistoryIndex(-1);

          // 执行命令
          executeCommand(cmd);
        } else {
          terminal.write('\r\n');
          writePrompt(terminal);
        }
      }
      // Backspace
      else if (code === 127 || code === 8) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          terminal.write('\b \b');
        }
      }
      // Ctrl+C
      else if (code === 3) {
        terminal.write('^C');
        currentLine = '';
        if (isExecuting && pendingSessionId) {
          setIsExecuting(false);
          setPendingSessionId(null);
          terminal.write('\r\n');
          writePrompt(terminal);
        }
      }
      // Ctrl+L (clear screen)
      else if (code === 12) {
        terminal.write('\x1b[2J\x1b[H');
        writePrompt(terminal);
      }
      // 普通字符
      else if (code >= 32) {
        currentLine += data;
        terminal.write(data);
      }
    });

    // 监听 shell 结果和错误
    socketService.on('shell-result', handleShellResult);
    socketService.on('shell-error', handleShellError);

    // 窗口大小变化时重新适应
    const handleResize = () => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {
          // 忽略大小调整错误
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      socketService.off('shell-result', handleShellResult);
      socketService.off('shell-error', handleShellError);

      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, deviceCode, handleShellResult, handleShellError, isExecuting, pendingSessionId]);

  // Execute command - wrapped in useCallback to avoid stale closures
  const executeCommand = useCallback((cmd: string) => {
    const term = xtermRef.current;
    if (!term) return;

    // 本地回显命令
    if (localEcho) {
      term.write('\r\n');
    }

    // 清屏命令（本地处理）
    if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
      term.write('\x1b[2J\x1b[H');
      writePrompt(term);
      return;
    }

    // 帮助命令（本地处理）
    if (cmd.toLowerCase() === 'help') {
      term.write('\r\n');
      term.write('\x1b[36mAvailable commands:\x1b[0m\r\n');
      term.write('  help     - Show this help message\r\n');
      term.write('  clear    - Clear the terminal screen\r\n');
      term.write('  exit     - Close shell connection\r\n');
      term.write('  <any>    - Execute on remote device\r\n');
      writePrompt(term);
      return;
    }

    // 退出命令
    if (cmd.toLowerCase() === 'exit') {
      term.write('\r\n');
      term.write('\x1b[33mClosing shell...\x1b[0m\r\n');
      onClose();
      return;
    }

    // Generate session ID using crypto
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    const sessionId = `shell_${Date.now()}_${Array.from(array, b => b.toString(36).charAt(0)).join('')}`;
    setPendingSessionId(sessionId);
    setIsExecuting(true);

    // 显示执行指示器
    term.write('\x1b[90mExecuting...\x1b[0m\r\n');

    // 发送命令到服务器
    socketService.executeShell(deviceCode, cmd, sessionId);
  }, [deviceCode, localEcho, onClose]);

  // 处理输入框按键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (command.trim()) {
        // 将命令写入终端
        if (xtermRef.current && localEcho) {
          xtermRef.current.write(`\r\n`);
        }
        executeCommand(command);
        setHistoryIndex(-1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        const cmd = commandHistory[commandHistory.length - 1 - newIndex] || '';
        setCommand(cmd);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const cmd = commandHistory[commandHistory.length - 1 - newIndex] || '';
        setCommand(cmd);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  // 清屏
  const clearTerminal = () => {
    if (xtermRef.current) {
      xtermRef.current.write('\x1b[2J\x1b[H');
      writePrompt(xtermRef.current);
    }
  };

  // 发送按钮点击
  const handleSend = () => {
    if (command.trim()) {
      if (xtermRef.current && localEcho) {
        xtermRef.current.write(`\r\n`);
      }
      executeCommand(command);
      setHistoryIndex(-1);
    }
  };

  if (!visible) return null;

  return (
    <Card
      title={
        <Space>
          <Text strong>远程Shell</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            设备: {deviceCode}
          </Text>
        </Space>
      }
      extra={
        <Space>
          <Switch
            checkedChildren="回显"
            unCheckedChildren="静默"
            checked={localEcho}
            onChange={setLocalEcho}
            size="small"
          />
          <Button icon={<ClearOutlined />} size="small" onClick={clearTerminal}>
            清屏
          </Button>
          <Button size="small" onClick={onClose}>
            关闭
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0, height: 'calc(100% - 52px)', overflow: 'hidden' } }}
      style={{ height: '100%' }}
    >
      {/* xterm 终端容器 */}
      <div
        ref={terminalRef}
        style={{
          height: 'calc(100% - 48px)',
          background: '#1e1e1e',
          padding: '8px 4px 4px 8px',
          overflow: 'hidden',
        }}
      />

      {/* 命令输入区 */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入命令，按 Enter 执行"
          prefix={<Text style={{ color: '#52c41a', fontWeight: 'bold' }}>$</Text>}
          suffix={
            <Button
              type="primary"
              icon={<SendOutlined />}
              size="small"
              onClick={handleSend}
              disabled={!command.trim() || isExecuting}
              loading={isExecuting}
            />
          }
          disabled={isExecuting}
        />
        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
          提示: 按 ↑/↓ 键浏览命令历史, Ctrl+C 中断执行, Ctrl+L 清屏
        </Text>
      </div>
    </Card>
  );
};

export default ShellTerminal;

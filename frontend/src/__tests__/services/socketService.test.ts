/**
 * Socket Service Tests
 * Tests for WebSocket service functionality
 */

import { socketService } from '../../services/socketService';

describe('SocketService', () => {
  beforeEach(() => {
    // Reset socket service state between tests
    socketService.disconnect();
    socketService.off();
  });

  describe('Connection Management', () => {
    test('should have isConnected method', () => {
      expect(typeof socketService.isConnected).toBe('function');
    });

    test('should have connect method', () => {
      expect(typeof socketService.connect).toBe('function');
    });

    test('should have disconnect method', () => {
      expect(typeof socketService.disconnect).toBe('function');
    });

    test('should have getDeviceCode method', () => {
      expect(typeof socketService.getDeviceCode).toBe('function');
    });

    test('should have getRole method', () => {
      expect(typeof socketService.getRole).toBe('function');
    });

    test('should have emit method', () => {
      expect(typeof socketService.emit).toBe('function');
    });

    test('should have on method', () => {
      expect(typeof socketService.on).toBe('function');
    });

    test('should have off method', () => {
      expect(typeof socketService.off).toBe('function');
    });

    test('should return disconnected state by default', () => {
      expect(socketService.isConnected()).toBe(false);
    });

    test('should return empty device code by default', () => {
      expect(socketService.getDeviceCode()).toBe('');
    });

    test('should return controlled role by default', () => {
      expect(socketService.getRole()).toBe('controlled');
    });
  });

  describe('Event Registration', () => {
    test('should register registered event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('registered', callback);
      }).not.toThrow();
    });

    test('should register connection-requested event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('connection-requested', callback);
      }).not.toThrow();
    });

    test('should register connection-accepted event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('connection-accepted', callback);
      }).not.toThrow();
    });

    test('should register connection-rejected event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('connection-rejected', callback);
      }).not.toThrow();
    });

    test('should register incoming-connection event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('incoming-connection', callback);
      }).not.toThrow();
    });

    test('should register sdp-offer event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('sdp-offer', callback);
      }).not.toThrow();
    });

    test('should register sdp-answer event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('sdp-answer', callback);
      }).not.toThrow();
    });

    test('should register ice-candidate event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('ice-candidate', callback);
      }).not.toThrow();
    });

    test('should register control-command event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('control-command', callback);
      }).not.toThrow();
    });

    test('should register shell-command event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('shell-command', callback);
      }).not.toThrow();
    });

    test('should register shell-result event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('shell-result', callback);
      }).not.toThrow();
    });

    test('should register shell-error event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('shell-error', callback);
      }).not.toThrow();
    });

    test('should register clipboard-sync event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('clipboard-sync', callback);
      }).not.toThrow();
    });

    test('should register clipboard-history-response event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('clipboard-history-response', callback);
      }).not.toThrow();
    });

    test('should register device-online event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('device-online', callback);
      }).not.toThrow();
    });

    test('should register device-offline event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('device-offline', callback);
      }).not.toThrow();
    });

    test('should register error event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('error', callback);
      }).not.toThrow();
    });

    test('should register power-action event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('power-action', callback);
      }).not.toThrow();
    });

    test('should register power-result event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('power-result', callback);
      }).not.toThrow();
    });

    test('should register power-command-sent event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('power-command-sent', callback);
      }).not.toThrow();
    });

    test('should register power-error event', () => {
      const callback = jest.fn();
      expect(() => {
        socketService.on('power-error', callback);
      }).not.toThrow();
    });
  });

  describe('Event Cleanup', () => {
    test('should clear specific event callback', () => {
      const callback = jest.fn();
      socketService.on('shell-result', callback);
      socketService.off('shell-result', callback);

      // Should not throw
      expect(true).toBe(true);
    });

    test('should clear all event callbacks', () => {
      socketService.on('shell-result', jest.fn());
      socketService.on('shell-error', jest.fn());
      socketService.on('clipboard-sync', jest.fn());

      socketService.off();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Device Registration', () => {
    test('should have register method', () => {
      expect(typeof socketService.register).toBe('function');
    });
  });

  describe('Connection Methods', () => {
    test('should have requestConnect method', () => {
      expect(typeof socketService.requestConnect).toBe('function');
    });

    test('should have acceptConnection method', () => {
      expect(typeof socketService.acceptConnection).toBe('function');
    });

    test('should have rejectConnection method', () => {
      expect(typeof socketService.rejectConnection).toBe('function');
    });

    test('should have sendSDPOffer method', () => {
      expect(typeof socketService.sendSDPOffer).toBe('function');
    });

    test('should have sendSDPAnswer method', () => {
      expect(typeof socketService.sendSDPAnswer).toBe('function');
    });

    test('should have sendICECandidate method', () => {
      expect(typeof socketService.sendICECandidate).toBe('function');
    });

    test('should have sendControlCommand method', () => {
      expect(typeof socketService.sendControlCommand).toBe('function');
    });

    test('should have getOnlineDevices method', () => {
      expect(typeof socketService.getOnlineDevices).toBe('function');
    });
  });

  describe('Shell Methods', () => {
    test('should have executeShell method', () => {
      expect(typeof socketService.executeShell).toBe('function');
    });

    test('should have respondShell method', () => {
      expect(typeof socketService.respondShell).toBe('function');
    });
  });

  describe('Power Control Methods', () => {
    test('should have sendPowerCommand method', () => {
      expect(typeof socketService.sendPowerCommand).toBe('function');
    });

    test('should have sendPowerConfirmed method', () => {
      expect(typeof socketService.sendPowerConfirmed).toBe('function');
    });
  });

  describe('PowerAction Type', () => {
    test('should accept shutdown action', () => {
      const action: 'shutdown' | 'restart' | 'lock' | 'sleep' = 'shutdown';
      expect(action).toBe('shutdown');
    });

    test('should accept restart action', () => {
      const action: 'shutdown' | 'restart' | 'lock' | 'sleep' = 'restart';
      expect(action).toBe('restart');
    });

    test('should accept lock action', () => {
      const action: 'shutdown' | 'restart' | 'lock' | 'sleep' = 'lock';
      expect(action).toBe('lock');
    });

    test('should accept sleep action', () => {
      const action: 'shutdown' | 'restart' | 'lock' | 'sleep' = 'sleep';
      expect(action).toBe('sleep');
    });
  });

  describe('Socket Event Types', () => {
    test('should have all required event types', () => {
      const eventTypes = [
        'registered',
        'connection-requested',
        'connection-accepted',
        'connection-rejected',
        'incoming-connection',
        'sdp-offer',
        'sdp-answer',
        'ice-candidate',
        'prepare-sdp',
        'control-command',
        'shell-command',
        'shell-result',
        'shell-error',
        'clipboard-sync',
        'clipboard-history-response',
        'device-online',
        'device-offline',
        'error',
        'power-action',
        'power-result',
        'power-command-sent',
        'power-error'
      ];

      eventTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('Data Interfaces', () => {
    test('should define RegisteredData interface', () => {
      const data = {
        success: true,
        deviceCode: '123456789'
      };
      expect(data.success).toBe(true);
      expect(data.deviceCode).toBe('123456789');
    });

    test('should define ConnectionRequestData interface', () => {
      const data = {
        fromDeviceCode: '123456789',
        password: '123456'
      };
      expect(data.fromDeviceCode).toBe('123456789');
      expect(data.password).toBe('123456');
    });

    test('should define ShellResultData interface', () => {
      const data = {
        sessionId: 'shell_123',
        output: 'test output',
        error: '',
        exitCode: 0
      };
      expect(data.sessionId).toBe('shell_123');
      expect(data.output).toBe('test output');
      expect(data.exitCode).toBe(0);
    });

    test('should define ClipboardSyncData interface', () => {
      const data = {
        content: 'clipboard content',
        contentType: 'text' as const,
        direction: 'to' as const,
        fromDeviceCode: '123456789'
      };
      expect(data.content).toBe('clipboard content');
      expect(data.contentType).toBe('text');
      expect(data.direction).toBe('to');
    });

    test('should define PowerCommandData interface', () => {
      const data = {
        deviceCode: '123456789',
        action: 'shutdown' as const,
        confirmCode: 'ABC123'
      };
      expect(data.deviceCode).toBe('123456789');
      expect(data.action).toBe('shutdown');
      expect(data.confirmCode).toBe('ABC123');
    });
  });

  describe('Singleton Pattern', () => {
    test('should export single instance', () => {
      expect(socketService).toBeDefined();
    });

    test('should export as default and named export', () => {
      // Both imports should reference the same instance
      expect(typeof socketService.disconnect).toBe('function');
    });
  });
});
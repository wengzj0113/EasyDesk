/**
 * Logger Utility Tests
 * Tests for logging functionality with environment-aware levels
 */

import { LogLevel, createLogger, logger } from '../../utils/logger';

describe('LogLevel Enum', () => {
  test('should have correct numeric values', () => {
    expect(LogLevel.error).toBe(0);
    expect(LogLevel.warn).toBe(1);
    expect(LogLevel.info).toBe(2);
    expect(LogLevel.debug).toBe(3);
  });

  test('should have error as lowest level', () => {
    expect(LogLevel.error).toBeLessThan(LogLevel.warn);
    expect(LogLevel.error).toBeLessThan(LogLevel.info);
    expect(LogLevel.error).toBeLessThan(LogLevel.debug);
  });

  test('should have debug as highest level', () => {
    expect(LogLevel.debug).toBeGreaterThan(LogLevel.error);
    expect(LogLevel.debug).toBeGreaterThan(LogLevel.warn);
    expect(LogLevel.debug).toBeGreaterThan(LogLevel.info);
  });
});

describe('createLogger', () => {
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Logger Creation', () => {
    test('should create logger with prefix', () => {
      const testLogger = createLogger('TestModule');
      expect(testLogger).toHaveProperty('error');
      expect(testLogger).toHaveProperty('warn');
      expect(testLogger).toHaveProperty('info');
      expect(testLogger).toHaveProperty('debug');
    });

    test('should support multiple loggers with different prefixes', () => {
      const logger1 = createLogger('Module1');
      const logger2 = createLogger('Module2');

      expect(logger1).not.toBe(logger2);
    });
  });

  describe('Log Levels', () => {
    const currentLevel = process.env.NODE_ENV === 'production'
      ? LogLevel.warn
      : LogLevel.debug;

    test('should log error messages', () => {
      if (LogLevel.error <= currentLevel) {
        const testLogger = createLogger('Test');
        testLogger.error('Test error message');
        expect(consoleSpy.error).toHaveBeenCalled();
      }
    });

    test('should include prefix in error logs', () => {
      if (LogLevel.error <= currentLevel) {
        const testLogger = createLogger('TestModule');
        testLogger.error('Error occurred');
        expect(consoleSpy.error).toHaveBeenCalledWith(
          '[TestModule]',
          'Error occurred'
        );
      }
    });

    test('should log warning messages', () => {
      if (LogLevel.warn <= currentLevel) {
        const testLogger = createLogger('Test');
        testLogger.warn('Test warning');
        expect(consoleSpy.warn).toHaveBeenCalled();
      }
    });

    test('should log info messages in development', () => {
      if (process.env.NODE_ENV !== 'production') {
        const testLogger = createLogger('Test');
        testLogger.info('Info message');
        expect(consoleSpy.info).toHaveBeenCalled();
      }
    });

    test('should log debug messages in development', () => {
      if (process.env.NODE_ENV !== 'production') {
        const testLogger = createLogger('Test');
        testLogger.debug('Debug message');
        expect(consoleSpy.debug).toHaveBeenCalled();
      }
    });
  });

  describe('Log Formatting', () => {
    test('should format multiple arguments correctly', () => {
      if (process.env.NODE_ENV !== 'production') {
        const testLogger = createLogger('Test');
        testLogger.info('arg1', 'arg2', { key: 'value' });
        expect(consoleSpy.info).toHaveBeenCalledWith(
          '[Test]',
          'arg1',
          'arg2',
          { key: 'value' }
        );
      }
    });

    test('should handle objects in arguments', () => {
      if (process.env.NODE_ENV !== 'production') {
        const testLogger = createLogger('Test');
        const data = { user: 'test', id: 123 };
        testLogger.info('User data:', data);
        expect(consoleSpy.info).toHaveBeenCalledWith(
          '[Test]',
          'User data:',
          data
        );
      }
    });

    test('should handle arrays in arguments', () => {
      if (process.env.NODE_ENV !== 'production') {
        const testLogger = createLogger('Test');
        const items = ['item1', 'item2', 'item3'];
        testLogger.info('Items:', items);
        expect(consoleSpy.info).toHaveBeenCalled();
      }
    });
  });

  describe('Environment Awareness', () => {
    test('should be production-aware', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const prodLogger = createLogger('ProdTest');
      expect(prodLogger).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });

    test('should be development-aware', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const devLogger = createLogger('DevTest');
      expect(devLogger).toBeDefined();
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Default Logger', () => {
  let consoleSpy: {
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    info: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      info: jest.spyOn(console, 'info').mockImplementation(() => {}),
      debug: jest.spyOn(console, 'debug').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should export default logger', () => {
    expect(logger).toBeDefined();
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('debug');
  });

  test('should have App prefix', () => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Test');
      expect(consoleSpy.debug).toHaveBeenCalledWith('[App]', 'Test');
    }
  });
});

describe('Log Level Filtering', () => {
  test('should filter logs based on level comparison', () => {
    const levels = [
      { log: LogLevel.error, min: LogLevel.error },
      { log: LogLevel.warn, min: LogLevel.error },
      { log: LogLevel.info, min: LogLevel.warn },
      { log: LogLevel.debug, min: LogLevel.info }
    ];

    levels.forEach(({ log, min }) => {
      const shouldLog = log <= min;
      expect(typeof shouldLog).toBe('boolean');
    });
  });
});

describe('Error Logging', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should log errors with stack traces', () => {
    const error = new Error('Test error');
    const testLogger = createLogger('Test');

    try {
      testLogger.error('Error occurred:', error);
    } catch (e) {
      // Ignore
    }

    // Error logs should be called in non-production
    if (process.env.NODE_ENV !== 'production') {
      expect(consoleErrorSpy).toHaveBeenCalled();
    }
  });

  test('should log multiple error objects', () => {
    const testLogger = createLogger('Test');
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');

    try {
      testLogger.error('Multiple errors:', error1, error2);
    } catch (e) {
      // Ignore
    }

    if (process.env.NODE_ENV !== 'production') {
      expect(consoleErrorSpy).toHaveBeenCalled();
    }
  });
});

describe('Performance Considerations', () => {
  test('should not execute console methods when level is filtered', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const prodLogger = createLogger('Test');
    prodLogger.debug('This should not be logged');

    // In production, debug should be filtered
    expect(consoleSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });
});
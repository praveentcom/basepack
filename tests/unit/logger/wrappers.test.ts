/**
 * Unit tests for logger wrappers
 */

import { 
  wrapPino, 
  wrapWinston, 
  wrapBunyan, 
  consoleLogger 
} from '../../../src/logger/wrappers';

// Mock console methods to test consoleLogger
const mockConsoleDebug = jest.fn();
const mockConsoleInfo = jest.fn();
const mockConsoleWarn = jest.fn();
const mockConsoleError = jest.fn();

// Store original console methods
const originalConsoleDebug = console.debug;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

describe('Logger Wrappers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    console.debug = mockConsoleDebug;
    console.info = mockConsoleInfo;
    console.warn = mockConsoleWarn;
    console.error = mockConsoleError;
  });

  afterAll(() => {
    // Restore original console methods
    console.debug = originalConsoleDebug;
    console.info = originalConsoleInfo;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('wrapPino', () => {
    it('should wrap a pino logger', () => {
      const mockPinoLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapPino(mockPinoLogger);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockPinoLogger.debug).toHaveBeenCalledWith('debug message');
      expect(mockPinoLogger.info).toHaveBeenCalledWith('info message');
      expect(mockPinoLogger.warn).toHaveBeenCalledWith('warn message');
      expect(mockPinoLogger.error).toHaveBeenCalledWith('error message');
    });

    it('should pass additional arguments to pino logger', () => {
      const mockPinoLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapPino(mockPinoLogger);

      logger.debug('debug message', { key: 'value' });
      logger.info('info message', 123, 'string');
      logger.warn('warn message', { obj: { nested: true } });
      logger.error('error message', new Error('test error'));

      expect(mockPinoLogger.debug).toHaveBeenCalledWith({ args: [{ key: 'value' }] }, 'debug message');
      expect(mockPinoLogger.info).toHaveBeenCalledWith({ args: [123, 'string'] }, 'info message');
      expect(mockPinoLogger.warn).toHaveBeenCalledWith({ args: [{ obj: { nested: true } }] }, 'warn message');
      expect(mockPinoLogger.error).toHaveBeenCalledWith({ args: [new Error('test error')] }, 'error message');
    });
  });

  describe('wrapWinston', () => {
    it('should wrap a winston logger', () => {
      const mockWinstonLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapWinston(mockWinstonLogger);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('debug message');
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('info message');
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('warn message');
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('error message');
    });

    it('should pass additional arguments to winston logger', () => {
      const mockWinstonLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapWinston(mockWinstonLogger);

      logger.debug('debug message', { key: 'value' });
      logger.info('info message', 123, 'string');
      logger.warn('warn message', { obj: { nested: true } });
      logger.error('error message', new Error('test error'));

      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('debug message', { key: 'value' });
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('info message', 123, 'string');
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('warn message', { obj: { nested: true } });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('error message', new Error('test error'));
    });
  });

  describe('wrapBunyan', () => {
    it('should wrap a bunyan logger', () => {
      const mockBunyanLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapBunyan(mockBunyanLogger);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockBunyanLogger.debug).toHaveBeenCalledWith('debug message');
      expect(mockBunyanLogger.info).toHaveBeenCalledWith('info message');
      expect(mockBunyanLogger.warn).toHaveBeenCalledWith('warn message');
      expect(mockBunyanLogger.error).toHaveBeenCalledWith('error message');
    });

    it('should pass additional arguments to bunyan logger', () => {
      const mockBunyanLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const logger = wrapBunyan(mockBunyanLogger);

      logger.debug('debug message', { key: 'value' });
      logger.info('info message', 123, 'string');
      logger.warn('warn message', { obj: { nested: true } });
      logger.error('error message', new Error('test error'));

      expect(mockBunyanLogger.debug).toHaveBeenCalledWith({ args: [{ key: 'value' }] }, 'debug message');
      expect(mockBunyanLogger.info).toHaveBeenCalledWith({ args: [123, 'string'] }, 'info message');
      expect(mockBunyanLogger.warn).toHaveBeenCalledWith({ args: [{ obj: { nested: true } }] }, 'warn message');
      expect(mockBunyanLogger.error).toHaveBeenCalledWith({ args: [new Error('test error')] }, 'error message');
    });
  });

  describe('consoleLogger', () => {
    it('should create a logger that uses console methods', () => {
      const logger = consoleLogger();

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsoleDebug).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should colorize Basepack log messages', () => {
      const logger = consoleLogger();

      logger.debug('Basepack Email: Test message');
      logger.info('Basepack Cache: Another message');
      logger.warn('Basepack Storage: Warning message');
      logger.error('Basepack Queue: Error message');

      // Check that ANSI color codes are included
      expect(mockConsoleDebug).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
    });

    it('should handle non-Basepack messages', () => {
      const logger = consoleLogger();

      logger.debug('Regular debug message');
      logger.info('Regular info message');
      logger.warn('Regular warn message');
      logger.error('Regular error message');

      expect(mockConsoleDebug).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleInfo).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('\x1b['));
    });

    it('should format object arguments', () => {
      const logger = consoleLogger();
      
      const testObj = { key: 'value', nested: { prop: true } };
      logger.info('Basepack Test: Message with object', testObj);
      
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('[2mBasepack Test:[0m [36mMessage with object[0m')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('key')
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining('value')
      );
    });
  });
});

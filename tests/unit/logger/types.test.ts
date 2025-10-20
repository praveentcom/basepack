/**
 * Unit tests for logger types
 */

import { Logger, noopLogger } from '../../../src/logger/types';

describe('Logger Types', () => {
  describe('noopLogger', () => {
    it('should have all required methods', () => {
      expect(noopLogger).toHaveProperty('debug');
      expect(noopLogger).toHaveProperty('info');
      expect(noopLogger).toHaveProperty('warn');
      expect(noopLogger).toHaveProperty('error');
    });

    it('should not throw errors when called', () => {
      expect(() => {
        noopLogger.debug('test debug');
        noopLogger.info('test info');
        noopLogger.warn('test warn');
        noopLogger.error('test error');
      }).not.toThrow();
    });

    it('should accept any number of arguments', () => {
      expect(() => {
        noopLogger.debug('test', { obj: 'value' }, 'another arg');
        noopLogger.info('test', 123, true);
        noopLogger.warn('test', null, undefined);
        noopLogger.error('test', new Error('test'), { context: 'data' });
      }).not.toThrow();
    });
  });

  describe('Logger interface', () => {
    it('should be implementable', () => {
      const customLogger: Logger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      expect(customLogger.debug).toBeDefined();
      expect(customLogger.info).toBeDefined();
      expect(customLogger.warn).toBeDefined();
      expect(customLogger.error).toBeDefined();

      customLogger.debug('debug message');
      customLogger.info('info message');
      customLogger.warn('warn message');
      customLogger.error('error message');

      expect(customLogger.debug).toHaveBeenCalledWith('debug message');
      expect(customLogger.info).toHaveBeenCalledWith('info message');
      expect(customLogger.warn).toHaveBeenCalledWith('warn message');
      expect(customLogger.error).toHaveBeenCalledWith('error message');
    });
  });
});

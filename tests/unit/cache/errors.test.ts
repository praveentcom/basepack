/**
 * Unit tests for cache errors
 */

import {
  CacheError,
  CacheValidationError,
  CacheProviderError,
  CacheConnectionError,
  CacheTimeoutError,
  isCacheError,
  isCacheValidationError,
  isCacheProviderError,
  isCacheConnectionError,
  isCacheTimeoutError,
} from '../../../src/cache/errors';

describe('Cache Errors', () => {
  describe('CacheError', () => {
    it('should create error with all properties', () => {
      const error = new CacheError(
        'Test error',
        'redis',
        500,
        new Error('Original'),
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheError);
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('redis');
      expect(error.statusCode).toBe(500);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('CacheError');
    });

    it('should create error with minimal properties', () => {
      const error = new CacheError('Test error', 'redis');

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('redis');
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
      expect(error.isRetryable).toBe(false);
    });

    it('should create from existing CacheError', () => {
      const original = new CacheError('Original error', 'redis', 500, undefined, true);
      const converted = CacheError.from(original, 'redis');

      expect(converted).toBe(original);
    });

    it('should create from Error', () => {
      const original = new Error('Test error');
      const converted = CacheError.from(original, 'redis', true);

      expect(converted).toBeInstanceOf(CacheError);
      expect(converted.message).toBe('Test error');
      expect(converted.provider).toBe('redis');
      expect(converted.isRetryable).toBe(true);
    });

    it('should create from string', () => {
      const converted = CacheError.from('String error', 'redis');

      expect(converted).toBeInstanceOf(CacheError);
      expect(converted.message).toBe('String error');
      expect(converted.provider).toBe('redis');
    });

    it('should extract status code from error object', () => {
      const errorWithStatus = { message: 'Error', statusCode: 503 };
      const converted = CacheError.from(errorWithStatus, 'redis');

      expect(converted.statusCode).toBe(503);
    });
  });

  describe('CacheValidationError', () => {
    it('should create validation error', () => {
      const error = new CacheValidationError('Invalid key', 'key');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheValidationError);
      expect(error.message).toBe('Invalid key');
      expect(error.field).toBe('key');
      expect(error.name).toBe('CacheValidationError');
    });
  });

  describe('CacheProviderError', () => {
    it('should create provider error', () => {
      const error = new CacheProviderError('redis', 'Provider not found');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheProviderError);
      expect(error.provider).toBe('redis');
      expect(error.message).toBe('Provider not found');
      expect(error.name).toBe('CacheProviderError');
    });
  });

  describe('CacheConnectionError', () => {
    it('should create connection error', () => {
      const originalError = new Error('Connection refused');
      const error = new CacheConnectionError(
        'Failed to connect',
        'redis',
        originalError
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheError);
      expect(error).toBeInstanceOf(CacheConnectionError);
      expect(error.message).toBe('Failed to connect');
      expect(error.provider).toBe('redis');
      expect(error.originalError).toBe(originalError);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('CacheConnectionError');
    });
  });

  describe('CacheTimeoutError', () => {
    it('should create timeout error', () => {
      const error = new CacheTimeoutError('Operation timed out', 'redis', 5000);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheError);
      expect(error).toBeInstanceOf(CacheTimeoutError);
      expect(error.message).toBe('Operation timed out');
      expect(error.provider).toBe('redis');
      expect(error.timeout).toBe(5000);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('CacheTimeoutError');
    });
  });

  describe('Type Guards', () => {
    it('isCacheError should identify CacheError', () => {
      const error = new CacheError('Test', 'redis');
      const regularError = new Error('Test');

      expect(isCacheError(error)).toBe(true);
      expect(isCacheError(regularError)).toBe(false);
      expect(isCacheError('string')).toBe(false);
      expect(isCacheError(null)).toBe(false);
    });

    it('isCacheValidationError should identify CacheValidationError', () => {
      const error = new CacheValidationError('Invalid', 'field');
      const regularError = new Error('Test');

      expect(isCacheValidationError(error)).toBe(true);
      expect(isCacheValidationError(regularError)).toBe(false);
      expect(isCacheValidationError(new CacheError('Test', 'redis'))).toBe(false);
    });

    it('isCacheProviderError should identify CacheProviderError', () => {
      const error = new CacheProviderError('redis', 'Not found');
      const regularError = new Error('Test');

      expect(isCacheProviderError(error)).toBe(true);
      expect(isCacheProviderError(regularError)).toBe(false);
    });

    it('isCacheConnectionError should identify CacheConnectionError', () => {
      const error = new CacheConnectionError('Failed', 'redis');
      const regularError = new Error('Test');

      expect(isCacheConnectionError(error)).toBe(true);
      expect(isCacheConnectionError(regularError)).toBe(false);
    });

    it('isCacheTimeoutError should identify CacheTimeoutError', () => {
      const error = new CacheTimeoutError('Timeout', 'redis', 5000);
      const regularError = new Error('Test');

      expect(isCacheTimeoutError(error)).toBe(true);
      expect(isCacheTimeoutError(regularError)).toBe(false);
    });

    it('should handle inheritance correctly', () => {
      const connectionError = new CacheConnectionError('Failed', 'redis');
      const timeoutError = new CacheTimeoutError('Timeout', 'redis', 5000);

      // Connection and Timeout errors are also CacheErrors
      expect(isCacheError(connectionError)).toBe(true);
      expect(isCacheError(timeoutError)).toBe(true);

      // But not the other way around
      expect(isCacheConnectionError(timeoutError)).toBe(false);
      expect(isCacheTimeoutError(connectionError)).toBe(false);
    });
  });
});


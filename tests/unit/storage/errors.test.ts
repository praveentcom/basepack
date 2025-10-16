/**
 * Unit tests for storage errors
 */

import {
  StorageError,
  StorageValidationError,
  StorageProviderError,
  isStorageError,
  isStorageValidationError,
  isStorageProviderError,
} from '../../../src/storage/errors';
import { StorageProvider } from '../../../src/storage/types';

describe('Storage Errors', () => {
  describe('StorageError', () => {
    it('should create error with all properties', () => {
      const originalError = new Error('Original error');
      const error = new StorageError(
        'Test error',
        StorageProvider.S3,
        500,
        originalError,
        true
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe(StorageProvider.S3);
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('StorageError');
    });

    it('should create error with minimal properties', () => {
      const error = new StorageError('Test error', StorageProvider.GCS);

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe(StorageProvider.GCS);
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
      expect(error.isRetryable).toBe(false);
    });

    it('should preserve stack trace', () => {
      const error = new StorageError('Test error', StorageProvider.S3);
      expect(error.stack).toBeDefined();
    });

    describe('from static method', () => {
      it('should return StorageError as is', () => {
        const original = new StorageError('Test', StorageProvider.S3, 500);
        const result = StorageError.from(original, StorageProvider.GCS);

        expect(result).toBe(original);
      });

      it('should convert Error to StorageError', () => {
        const original = new Error('Test error');
        const result = StorageError.from(original, StorageProvider.S3, true);

        expect(result).toBeInstanceOf(StorageError);
        expect(result.message).toBe('Test error');
        expect(result.provider).toBe(StorageProvider.S3);
        expect(result.isRetryable).toBe(true);
      });

      it('should extract statusCode property', () => {
        const original = { message: 'Error', statusCode: 429 };
        const result = StorageError.from(original, StorageProvider.S3);

        expect(result.statusCode).toBe(429);
      });

      it('should extract status property', () => {
        const original = { message: 'Error', status: 503 };
        const result = StorageError.from(original, StorageProvider.GCS);

        expect(result.statusCode).toBe(503);
      });

      it('should extract httpStatusCode from $metadata (AWS SDK)', () => {
        const original = {
          message: 'Error',
          $metadata: { httpStatusCode: 404 }
        };
        const result = StorageError.from(original, StorageProvider.S3);

        expect(result.statusCode).toBe(404);
      });

      it('should handle non-error objects', () => {
        const result = StorageError.from('String error', StorageProvider.S3);

        expect(result.message).toBe('String error');
        expect(result.provider).toBe(StorageProvider.S3);
      });

      it('should default isRetryable to false', () => {
        const result = StorageError.from(new Error('Test'), StorageProvider.S3);
        expect(result.isRetryable).toBe(false);
      });
    });
  });

  describe('StorageValidationError', () => {
    it('should create validation error', () => {
      const error = new StorageValidationError('Invalid key', 'key');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageValidationError);
      expect(error.message).toBe('Invalid key');
      expect(error.field).toBe('key');
      expect(error.name).toBe('StorageValidationError');
    });

    it('should preserve stack trace', () => {
      const error = new StorageValidationError('Invalid', 'field');
      expect(error.stack).toBeDefined();
    });
  });

  describe('StorageProviderError', () => {
    it('should create provider error', () => {
      const error = new StorageProviderError(
        StorageProvider.S3,
        'Provider not configured'
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageProviderError);
      expect(error.provider).toBe(StorageProvider.S3);
      expect(error.message).toBe('Provider not configured');
      expect(error.name).toBe('StorageProviderError');
    });

    it('should preserve stack trace', () => {
      const error = new StorageProviderError(
        StorageProvider.GCS,
        'Missing credentials'
      );
      expect(error.stack).toBeDefined();
    });
  });

  describe('Type Guards', () => {
    describe('isStorageError', () => {
      it('should return true for StorageError', () => {
        const error = new StorageError('Test', StorageProvider.S3);
        expect(isStorageError(error)).toBe(true);
      });

      it('should return false for StorageValidationError', () => {
        const error = new StorageValidationError('Test', 'field');
        expect(isStorageError(error)).toBe(false);
      });

      it('should return false for StorageProviderError', () => {
        const error = new StorageProviderError(StorageProvider.S3, 'Test');
        expect(isStorageError(error)).toBe(false);
      });

      it('should return false for regular Error', () => {
        const error = new Error('Test');
        expect(isStorageError(error)).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isStorageError('string')).toBe(false);
        expect(isStorageError(null)).toBe(false);
        expect(isStorageError(undefined)).toBe(false);
        expect(isStorageError(123)).toBe(false);
        expect(isStorageError({})).toBe(false);
      });
    });

    describe('isStorageValidationError', () => {
      it('should return true for StorageValidationError', () => {
        const error = new StorageValidationError('Test', 'field');
        expect(isStorageValidationError(error)).toBe(true);
      });

      it('should return false for StorageError', () => {
        const error = new StorageError('Test', StorageProvider.S3);
        expect(isStorageValidationError(error)).toBe(false);
      });

      it('should return false for StorageProviderError', () => {
        const error = new StorageProviderError(StorageProvider.S3, 'Test');
        expect(isStorageValidationError(error)).toBe(false);
      });

      it('should return false for regular Error', () => {
        const error = new Error('Test');
        expect(isStorageValidationError(error)).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isStorageValidationError('string')).toBe(false);
        expect(isStorageValidationError(null)).toBe(false);
        expect(isStorageValidationError(undefined)).toBe(false);
      });
    });

    describe('isStorageProviderError', () => {
      it('should return true for StorageProviderError', () => {
        const error = new StorageProviderError(StorageProvider.S3, 'Test');
        expect(isStorageProviderError(error)).toBe(true);
      });

      it('should return false for StorageError', () => {
        const error = new StorageError('Test', StorageProvider.S3);
        expect(isStorageProviderError(error)).toBe(false);
      });

      it('should return false for StorageValidationError', () => {
        const error = new StorageValidationError('Test', 'field');
        expect(isStorageProviderError(error)).toBe(false);
      });

      it('should return false for regular Error', () => {
        const error = new Error('Test');
        expect(isStorageProviderError(error)).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isStorageProviderError('string')).toBe(false);
        expect(isStorageProviderError(null)).toBe(false);
        expect(isStorageProviderError(undefined)).toBe(false);
      });
    });
  });
});


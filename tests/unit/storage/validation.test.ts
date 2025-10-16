/**
 * Unit tests for storage validation
 */

import {
  validateKey,
  validateUrl,
  validateFileUpload,
  validateUrlUpload,
  validateFileDownload,
  validateFileDelete,
  validateSignedUrl,
} from '../../../src/storage/validation';
import { StorageValidationError } from '../../../src/storage/errors';

describe('Storage Validation', () => {
  describe('validateKey', () => {
    it('should accept valid keys', () => {
      expect(() => validateKey('file.txt')).not.toThrow();
      expect(() => validateKey('documents/report.pdf')).not.toThrow();
      expect(() => validateKey('images/2024/photo.jpg')).not.toThrow();
      expect(() => validateKey('folder/subfolder/file.txt')).not.toThrow();
    });

    it('should reject empty keys', () => {
      expect(() => validateKey('')).toThrow(StorageValidationError);
      expect(() => validateKey('   ')).toThrow(StorageValidationError);
    });

    it('should reject non-string keys', () => {
      expect(() => validateKey(null as any)).toThrow(StorageValidationError);
      expect(() => validateKey(undefined as any)).toThrow(StorageValidationError);
      expect(() => validateKey(123 as any)).toThrow(StorageValidationError);
    });

    it('should reject keys with .. path segments', () => {
      expect(() => validateKey('folder/../file.txt')).toThrow(StorageValidationError);
      expect(() => validateKey('../file.txt')).toThrow(StorageValidationError);
      expect(() => validateKey('folder/../../file.txt')).toThrow(StorageValidationError);
    });

    it('should use custom field name in error message', () => {
      try {
        validateKey('', 'customField');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageValidationError);
        expect((error as StorageValidationError).field).toBe('customField');
        expect((error as StorageValidationError).message).toContain('customField');
      }
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(() => validateUrl('http://example.com/file.txt')).not.toThrow();
      expect(() => validateUrl('http://example.com:8080/path/to/file')).not.toThrow();
    });

    it('should accept valid HTTPS URLs', () => {
      expect(() => validateUrl('https://example.com/file.txt')).not.toThrow();
      expect(() => validateUrl('https://cdn.example.com/images/photo.jpg')).not.toThrow();
    });

    it('should reject empty URLs', () => {
      expect(() => validateUrl('')).toThrow(StorageValidationError);
    });

    it('should reject non-string URLs', () => {
      expect(() => validateUrl(null as any)).toThrow(StorageValidationError);
      expect(() => validateUrl(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid URLs', () => {
      expect(() => validateUrl('not-a-url')).toThrow(StorageValidationError);
      expect(() => validateUrl('example.com')).toThrow(StorageValidationError);
    });

    it('should reject non-HTTP protocols', () => {
      expect(() => validateUrl('ftp://example.com/file.txt')).toThrow(StorageValidationError);
      expect(() => validateUrl('file:///path/to/file')).toThrow(StorageValidationError);
      expect(() => validateUrl('javascript:alert(1)')).toThrow(StorageValidationError);
    });

    it('should use custom field name in error message', () => {
      try {
        validateUrl('invalid', 'sourceUrl');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageValidationError);
        expect((error as StorageValidationError).field).toBe('sourceUrl');
      }
    });
  });

  describe('validateFileUpload', () => {
    const validBuffer = Buffer.from('test data');

    it('should accept valid file upload with Buffer', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        contentType: 'text/plain'
      })).not.toThrow();
    });

    it('should accept valid file upload with string', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: 'test data',
        contentType: 'text/plain'
      })).not.toThrow();
    });

    it('should accept file upload without contentType', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer
      })).not.toThrow();
    });

    it('should accept file upload with metadata', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        metadata: {
          author: 'John Doe',
          version: '1.0'
        }
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateFileUpload(null as any)).toThrow(StorageValidationError);
      expect(() => validateFileUpload(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateFileUpload({
        key: '',
        data: validBuffer
      })).toThrow(StorageValidationError);
    });

    it('should reject missing data', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: null as any
      })).toThrow(StorageValidationError);

      expect(() => validateFileUpload({
        key: 'file.txt',
        data: undefined as any
      })).toThrow(StorageValidationError);
    });

    it('should reject invalid data type', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: 123 as any
      })).toThrow(StorageValidationError);

      expect(() => validateFileUpload({
        key: 'file.txt',
        data: {} as any
      })).toThrow(StorageValidationError);
    });

    it('should reject non-string contentType', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        contentType: 123 as any
      })).toThrow(StorageValidationError);
    });

    it('should reject invalid metadata type', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        metadata: 'invalid' as any
      })).toThrow(StorageValidationError);

      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        metadata: null as any
      })).toThrow(StorageValidationError);
    });

    it('should reject metadata with non-string values', () => {
      expect(() => validateFileUpload({
        key: 'file.txt',
        data: validBuffer,
        metadata: {
          valid: 'string',
          invalid: 123 as any
        }
      })).toThrow(StorageValidationError);
    });
  });

  describe('validateUrlUpload', () => {
    it('should accept valid URL upload', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'https://example.com/file.txt'
      })).not.toThrow();
    });

    it('should accept URL upload with contentType', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'https://example.com/file.txt',
        contentType: 'text/plain'
      })).not.toThrow();
    });

    it('should accept URL upload with metadata', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'https://example.com/file.txt',
        metadata: {
          source: 'external'
        }
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateUrlUpload(null as any)).toThrow(StorageValidationError);
      expect(() => validateUrlUpload(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateUrlUpload({
        key: '',
        url: 'https://example.com/file.txt'
      })).toThrow(StorageValidationError);
    });

    it('should reject invalid URL', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'not-a-url'
      })).toThrow(StorageValidationError);
    });

    it('should reject non-string contentType', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'https://example.com/file.txt',
        contentType: 123 as any
      })).toThrow(StorageValidationError);
    });

    it('should reject metadata with non-string values', () => {
      expect(() => validateUrlUpload({
        key: 'file.txt',
        url: 'https://example.com/file.txt',
        metadata: {
          count: 123 as any
        }
      })).toThrow(StorageValidationError);
    });
  });

  describe('validateFileDownload', () => {
    it('should accept valid download config', () => {
      expect(() => validateFileDownload({
        key: 'file.txt'
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateFileDownload(null as any)).toThrow(StorageValidationError);
      expect(() => validateFileDownload(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateFileDownload({
        key: ''
      })).toThrow(StorageValidationError);
    });
  });

  describe('validateFileDelete', () => {
    it('should accept valid delete config', () => {
      expect(() => validateFileDelete({
        key: 'file.txt'
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateFileDelete(null as any)).toThrow(StorageValidationError);
      expect(() => validateFileDelete(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateFileDelete({
        key: ''
      })).toThrow(StorageValidationError);
    });
  });

  describe('validateSignedUrl', () => {
    it('should accept valid signed URL config', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: 3600,
        operation: 'getObject'
      })).not.toThrow();
    });

    it('should accept config without expiresIn', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt'
      })).not.toThrow();
    });

    it('should accept config without operation', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: 3600
      })).not.toThrow();
    });

    it('should accept putObject operation', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        operation: 'putObject'
      })).not.toThrow();
    });

    it('should accept config with contentType', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        contentType: 'application/pdf'
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateSignedUrl(null as any)).toThrow(StorageValidationError);
      expect(() => validateSignedUrl(undefined as any)).toThrow(StorageValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateSignedUrl({
        key: ''
      })).toThrow(StorageValidationError);
    });

    it('should reject zero expiresIn', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: 0
      })).toThrow(StorageValidationError);
    });

    it('should reject negative expiresIn', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: -100
      })).toThrow(StorageValidationError);
    });

    it('should reject non-numeric expiresIn', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: '3600' as any
      })).toThrow(StorageValidationError);
    });

    it('should reject expiresIn exceeding 7 days', () => {
      const sevenDays = 7 * 24 * 60 * 60;
      const eightDays = sevenDays + 1;

      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: sevenDays
      })).not.toThrow();

      expect(() => validateSignedUrl({
        key: 'file.txt',
        expiresIn: eightDays
      })).toThrow(StorageValidationError);
    });

    it('should reject invalid operation', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        operation: 'deleteObject' as any
      })).toThrow(StorageValidationError);

      expect(() => validateSignedUrl({
        key: 'file.txt',
        operation: 'invalid' as any
      })).toThrow(StorageValidationError);
    });

    it('should reject non-string contentType', () => {
      expect(() => validateSignedUrl({
        key: 'file.txt',
        contentType: 123 as any
      })).toThrow(StorageValidationError);
    });
  });
});


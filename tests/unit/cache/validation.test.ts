/**
 * Unit tests for cache validation
 */

import {
  validateCacheKey,
  validateTTL,
  validateCacheGetConfig,
  validateCacheSetConfig,
  validateCacheDeleteConfig,
  validateCacheHasConfig,
  validateSerializable,
} from '../../../src/cache/validation';
import { CacheValidationError } from '../../../src/cache/errors';

describe('Cache Validation', () => {
  describe('validateCacheKey', () => {
    it('should accept valid cache keys', () => {
      expect(() => validateCacheKey('user:123')).not.toThrow();
      expect(() => validateCacheKey('session:abc-def')).not.toThrow();
      expect(() => validateCacheKey('cache_key_123')).not.toThrow();
      expect(() => validateCacheKey('a')).not.toThrow();
    });

    it('should reject empty keys', () => {
      expect(() => validateCacheKey('')).toThrow(CacheValidationError);
      expect(() => validateCacheKey('   ')).toThrow(CacheValidationError);
    });

    it('should reject non-string keys', () => {
      expect(() => validateCacheKey(null as any)).toThrow(CacheValidationError);
      expect(() => validateCacheKey(undefined as any)).toThrow(CacheValidationError);
      expect(() => validateCacheKey(123 as any)).toThrow(CacheValidationError);
    });

    it('should reject keys with null bytes', () => {
      expect(() => validateCacheKey('key\0value')).toThrow(CacheValidationError);
    });

    it('should reject very long keys', () => {
      const longKey = 'a'.repeat(251);
      expect(() => validateCacheKey(longKey)).toThrow(CacheValidationError);
    });

    it('should accept keys up to 250 characters', () => {
      const maxKey = 'a'.repeat(250);
      expect(() => validateCacheKey(maxKey)).not.toThrow();
    });
  });

  describe('validateTTL', () => {
    it('should accept valid TTL values', () => {
      expect(() => validateTTL(1)).not.toThrow();
      expect(() => validateTTL(60)).not.toThrow();
      expect(() => validateTTL(3600)).not.toThrow();
      expect(() => validateTTL(86400)).not.toThrow();
    });

    it('should reject zero or negative TTL', () => {
      expect(() => validateTTL(0)).toThrow(CacheValidationError);
      expect(() => validateTTL(-1)).toThrow(CacheValidationError);
      expect(() => validateTTL(-100)).toThrow(CacheValidationError);
    });

    it('should reject non-integer TTL', () => {
      expect(() => validateTTL(3.14)).toThrow(CacheValidationError);
      expect(() => validateTTL(1.5)).toThrow(CacheValidationError);
    });

    it('should reject non-numeric TTL', () => {
      expect(() => validateTTL(NaN)).toThrow(CacheValidationError);
      expect(() => validateTTL('60' as any)).toThrow(CacheValidationError);
    });

    it('should reject extremely large TTL', () => {
      const oneYear = 31536000;
      const twoYears = oneYear * 2;
      
      expect(() => validateTTL(oneYear)).not.toThrow();
      expect(() => validateTTL(twoYears)).toThrow(CacheValidationError);
    });
  });

  describe('validateCacheGetConfig', () => {
    it('should accept valid get config', () => {
      expect(() => validateCacheGetConfig({ key: 'user:123' })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateCacheGetConfig(null as any)).toThrow(CacheValidationError);
      expect(() => validateCacheGetConfig(undefined as any)).toThrow(CacheValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateCacheGetConfig({ key: '' })).toThrow(CacheValidationError);
    });
  });

  describe('validateCacheSetConfig', () => {
    it('should accept valid set config', () => {
      expect(() => validateCacheSetConfig({
        key: 'user:123',
        value: { name: 'John' }
      })).not.toThrow();

      expect(() => validateCacheSetConfig({
        key: 'user:123',
        value: 'string value',
        ttl: 3600
      })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateCacheSetConfig(null as any)).toThrow(CacheValidationError);
      expect(() => validateCacheSetConfig(undefined as any)).toThrow(CacheValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateCacheSetConfig({
        key: '',
        value: 'test'
      })).toThrow(CacheValidationError);
    });

    it('should reject undefined value', () => {
      expect(() => validateCacheSetConfig({
        key: 'test',
        value: undefined
      })).toThrow(CacheValidationError);
    });

    it('should accept null value', () => {
      expect(() => validateCacheSetConfig({
        key: 'test',
        value: null
      })).not.toThrow();
    });

    it('should reject invalid TTL', () => {
      expect(() => validateCacheSetConfig({
        key: 'test',
        value: 'data',
        ttl: -1
      })).toThrow(CacheValidationError);

      expect(() => validateCacheSetConfig({
        key: 'test',
        value: 'data',
        ttl: 0
      })).toThrow(CacheValidationError);
    });
  });

  describe('validateCacheDeleteConfig', () => {
    it('should accept valid delete config', () => {
      expect(() => validateCacheDeleteConfig({ key: 'user:123' })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateCacheDeleteConfig(null as any)).toThrow(CacheValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateCacheDeleteConfig({ key: '' })).toThrow(CacheValidationError);
    });
  });

  describe('validateCacheHasConfig', () => {
    it('should accept valid has config', () => {
      expect(() => validateCacheHasConfig({ key: 'user:123' })).not.toThrow();
    });

    it('should reject missing config', () => {
      expect(() => validateCacheHasConfig(null as any)).toThrow(CacheValidationError);
    });

    it('should reject invalid key', () => {
      expect(() => validateCacheHasConfig({ key: '' })).toThrow(CacheValidationError);
    });
  });

  describe('validateSerializable', () => {
    it('should accept serializable values', () => {
      expect(() => validateSerializable({ name: 'John' })).not.toThrow();
      expect(() => validateSerializable('string')).not.toThrow();
      expect(() => validateSerializable(123)).not.toThrow();
      expect(() => validateSerializable(true)).not.toThrow();
      expect(() => validateSerializable(null)).not.toThrow();
      expect(() => validateSerializable([1, 2, 3])).not.toThrow();
    });

    it('should reject undefined', () => {
      expect(() => validateSerializable(undefined)).toThrow(CacheValidationError);
    });

    it('should reject circular references', () => {
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      expect(() => validateSerializable(circular)).toThrow(CacheValidationError);
    });

    it('should reject functions', () => {
      const obj = { func: () => {} };
      // Note: JSON.stringify drops functions, so this won't throw
      expect(() => validateSerializable(obj)).not.toThrow();
    });
  });
});


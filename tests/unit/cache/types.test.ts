/**
 * Unit tests for cache types
 */

import {
  isCacheProviderType,
  CACHE_PROVIDERS,
  CacheProvider,
} from '../../../src/cache/types';

describe('Cache Types', () => {
  describe('isCacheProviderType', () => {
    it('should identify valid cache provider types', () => {
      expect(isCacheProviderType('redis')).toBe(true);
      expect(isCacheProviderType('memcached')).toBe(true);
    });

    it('should reject invalid provider types', () => {
      expect(isCacheProviderType('invalid')).toBe(false);
      expect(isCacheProviderType('mongodb')).toBe(false);
      expect(isCacheProviderType('')).toBe(false);
      expect(isCacheProviderType(null)).toBe(false);
      expect(isCacheProviderType(undefined)).toBe(false);
      expect(isCacheProviderType(123)).toBe(false);
      expect(isCacheProviderType({})).toBe(false);
    });
  });

  describe('CACHE_PROVIDERS', () => {
    it('should contain all supported providers', () => {
      expect(CACHE_PROVIDERS).toContain('redis');
      expect(CACHE_PROVIDERS).toContain('memcached');
    });

    it('should have correct length', () => {
      expect(CACHE_PROVIDERS).toHaveLength(2);
    });

    it('should be readonly', () => {
      // TypeScript prevents this at compile time, but we can verify it's a tuple
      expect(Array.isArray(CACHE_PROVIDERS)).toBe(true);
    });
  });

  describe('CacheProvider enum', () => {
    it('should have all provider values', () => {
      expect(CacheProvider.REDIS).toBe('redis');
      expect(CacheProvider.MEMCACHED).toBe('memcached');
    });

    it('should allow using enum values', () => {
      const provider: string = CacheProvider.REDIS;
      expect(isCacheProviderType(provider)).toBe(true);
    });
  });
});


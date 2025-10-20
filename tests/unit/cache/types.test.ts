/**
 * Unit tests for cache types
 */

import { CacheProvider } from '../../../src/cache/types';

describe('Cache Types', () => {
  describe('CacheProvider', () => {
    it('should have correct enum values', () => {
      expect(CacheProvider.REDIS).toBe('redis');
      expect(CacheProvider.MEMCACHED).toBe('memcached');
    });

    it('should have only two providers', () => {
      const providers = Object.values(CacheProvider);
      expect(providers).toHaveLength(2);
      expect(providers).toContain('redis');
      expect(providers).toContain('memcached');
    });
  });
});

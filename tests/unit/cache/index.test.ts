/**
 * Unit tests for cache index
 */

import * as cacheModule from '../../../src/cache/index';

describe('Cache Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(cacheModule.CacheService).toBeDefined();
    expect(cacheModule.CacheProvider).toBeDefined();
    expect(cacheModule.RedisProvider).toBeDefined();
    expect(cacheModule.MemcachedProvider).toBeDefined();
    expect(cacheModule.CacheError).toBeDefined();
    expect(cacheModule.CacheValidationError).toBeDefined();
    expect(cacheModule.CacheProviderError).toBeDefined();
    expect(cacheModule.CacheConnectionError).toBeDefined();
    expect(cacheModule.CacheTimeoutError).toBeDefined();
    expect(cacheModule.validateCacheKey).toBeDefined();
    expect(cacheModule.validateTTL).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(cacheModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'CacheService',
      'CacheProvider',
      'RedisProvider',
      'MemcachedProvider',
      'CacheError',
      'CacheValidationError',
      'CacheProviderError',
      'CacheConnectionError',
      'CacheTimeoutError',
      'validateCacheKey',
      'validateTTL',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});

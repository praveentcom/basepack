/**
 * Integration tests for Memcached cache adapter
 * 
 * To run these tests:
 * 1. Ensure Memcached is running locally on localhost:11211
 * 2. Set MEMCACHED_ENABLED=true in test.env if not running in CI
 * 3. Run: npm run test:integration
 */

import { MemcachedProvider } from '../../../../src/cache/adapters/memcached';
import { getMemcachedTestConfig, skipIfNotAvailable } from '../test-utils';

describe('MemcachedProvider Integration Tests', () => {
  if (!skipIfNotAvailable('memcached')) {
    return;
  }

  let provider: MemcachedProvider;
  const testKeys: string[] = [];

  beforeAll(() => {
    const config = getMemcachedTestConfig();
    provider = new MemcachedProvider(config);
  });

  afterEach(async () => {
    // Clean up all test keys
    for (const key of testKeys) {
      await provider.delete({ key });
    }
    testKeys.length = 0;
  });

  afterAll(async () => {
    if (provider) {
      await provider.close();
    }
  });

  describe('Connection', () => {
    it('should connect to Memcached', async () => {
      const health = await provider.health();
      expect(health.status).toBe('healthy');
      expect(health.provider).toBe('memcached');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Set and Get', () => {
    it('should set and get a string value', async () => {
      const key = 'test:string';
      testKeys.push(key);

      const setResult = await provider.set({ key, value: 'hello world' });
      expect(setResult.success).toBe(true);

      const getResult = await provider.get({ key });
      expect(getResult.success).toBe(true);
      expect(getResult.found).toBe(true);
      expect(getResult.value).toBe('hello world');
    });

    it('should set and get a number value', async () => {
      const key = 'test:number';
      testKeys.push(key);

      await provider.set({ key, value: 42 });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toBe(42);
    });

    it('should set and get a boolean value', async () => {
      const key = 'test:boolean';
      testKeys.push(key);

      await provider.set({ key, value: true });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should set and get an object value', async () => {
      const key = 'test:object';
      testKeys.push(key);

      const obj = { name: 'John', age: 30, active: true };
      await provider.set({ key, value: obj });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toEqual(obj);
    });

    it('should set and get an array value', async () => {
      const key = 'test:array';
      testKeys.push(key);

      const arr = [1, 2, 3, 'four', { five: 5 }];
      await provider.set({ key, value: arr });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toEqual(arr);
    });

    it('should return not found for non-existent key', async () => {
      const result = await provider.get({ key: 'non:existent:key' });
      expect(result.success).toBe(true);
      expect(result.found).toBe(false);
      expect(result.value).toBeUndefined();
    });
  });

  describe('TTL', () => {
    it('should expire key after TTL', async () => {
      const key = 'test:ttl';
      testKeys.push(key);

      await provider.set({ key, value: 'expires soon', ttl: 1 });

      // Immediately after setting, key should exist
      let result = await provider.get({ key });
      expect(result.found).toBe(true);

      // Wait for 1.5 seconds
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Key should be expired
      result = await provider.get({ key });
      expect(result.found).toBe(false);
    });

    it('should handle keys without explicit TTL', async () => {
      const key = 'test:no-ttl';
      testKeys.push(key);

      await provider.set({ key, value: 'default ttl' });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toBe('default ttl');
    });
  });

  describe('Delete', () => {
    it('should delete an existing key', async () => {
      const key = 'test:delete';
      testKeys.push(key);

      await provider.set({ key, value: 'to be deleted' });

      const deleteResult = await provider.delete({ key });
      expect(deleteResult.success).toBe(true);

      const getResult = await provider.get({ key });
      expect(getResult.found).toBe(false);
    });

    it('should handle deleting non-existent key', async () => {
      const result = await provider.delete({ key: 'non:existent' });
      expect(result.success).toBe(true);
    });
  });

  describe('Has', () => {
    it('should return true for existing key', async () => {
      const key = 'test:has';
      testKeys.push(key);

      await provider.set({ key, value: 'exists' });

      const result = await provider.has({ key });
      expect(result.success).toBe(true);
      expect(result.exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await provider.has({ key: 'non:existent' });
      expect(result.success).toBe(true);
      expect(result.exists).toBe(false);
    });
  });

  describe('Null Values', () => {
    it('should handle null values', async () => {
      const key = 'test:null';
      testKeys.push(key);

      await provider.set({ key, value: null });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('Complex Objects', () => {
    it('should handle nested objects', async () => {
      const key = 'test:nested';
      testKeys.push(key);

      const nested = {
        user: {
          name: 'John',
          profile: {
            age: 30,
            address: {
              city: 'New York',
              country: 'USA'
            }
          }
        },
        metadata: {
          createdAt: new Date().toISOString(),
          tags: ['test', 'nested', 'object']
        }
      };

      await provider.set({ key, value: nested });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toEqual(nested);
    });
  });

  describe('Key Prefix', () => {
    it('should use key prefix from config', async () => {
      const key = 'prefixed';
      testKeys.push(key);

      // The provider is initialized with keyPrefix from test config
      await provider.set({ key, value: 'test' });

      const result = await provider.get({ key });
      expect(result.found).toBe(true);
      expect(result.value).toBe('test');
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await provider.health();

      expect(health.provider).toBe('memcached');
      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeGreaterThanOrEqual(0);
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.details).toBeDefined();
    });
  });

  describe('Multiple Operations', () => {
    it('should handle multiple concurrent operations', async () => {
      const keys = Array.from({ length: 10 }, (_, i) => `test:concurrent:${i}`);
      testKeys.push(...keys);

      // Set multiple keys concurrently
      await Promise.all(
        keys.map(key => provider.set({ key, value: `value-${key}`, ttl: 60 }))
      );

      // Get multiple keys concurrently
      const results = await Promise.all(
        keys.map(key => provider.get({ key }))
      );

      // Verify all operations succeeded
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.found).toBe(true);
        expect(result.value).toBe(`value-${keys[i]}`);
      });
    });
  });
});


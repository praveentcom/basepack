/**
 * Unit tests for cache service
 */

import { CacheService } from '../../../src/cache/service';
import { CacheProvider, type CacheServiceConfig, type RedisConfig } from '../../../src/cache/types';
import type { Logger } from '../../../src/logger/types';
import { CacheError, CacheProviderError } from '../../../src/cache/errors';

// Mock the adapters
jest.mock('../../../src/cache/adapters', () => ({
  RedisProvider: jest.fn().mockImplementation((config: RedisConfig, logger: Logger) => ({
    name: CacheProvider.REDIS,
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    clear: jest.fn(),
    health: jest.fn(),
    close: jest.fn(),
  })),
  MemcachedProvider: jest.fn().mockImplementation((config: any, logger: Logger) => ({
    name: CacheProvider.MEMCACHED,
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    clear: jest.fn(),
    health: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock the logger
jest.mock('../../../src/logger', () => ({
  consoleLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

import { RedisProvider, MemcachedProvider } from '../../../src/cache/adapters';
import { consoleLogger } from '../../../src/logger';

describe('CacheService', () => {
  let mockLogger: Logger;
  let redisConfig: CacheServiceConfig;
  let memcachedConfig: CacheServiceConfig;
  let mockProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    redisConfig = {
      provider: CacheProvider.REDIS,
      config: {
        host: 'localhost',
        port: 6379,
      },
      logger: mockLogger,
    };

    memcachedConfig = {
      provider: CacheProvider.MEMCACHED,
      config: {
        servers: ['localhost:11211'],
      },
      logger: mockLogger,
    };

    // Mock provider implementation
    mockProvider = {
      name: CacheProvider.REDIS,
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
      health: jest.fn(),
      close: jest.fn(),
    };

    (RedisProvider as jest.Mock).mockImplementation(() => mockProvider);
    (MemcachedProvider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: CacheProvider.MEMCACHED }));
  });

  describe('constructor', () => {
    it('should create a Redis cache service', () => {
      const cache = new CacheService(redisConfig);
      
      expect(RedisProvider).toHaveBeenCalledWith(redisConfig.config, mockLogger);
      expect(cache.getProviderName()).toBe(CacheProvider.REDIS);
    });

    it('should create a Memcached cache service', () => {
      const cache = new CacheService(memcachedConfig);
      
      expect(MemcachedProvider).toHaveBeenCalledWith(memcachedConfig.config, mockLogger);
      expect(cache.getProviderName()).toBe(CacheProvider.MEMCACHED);
    });

    it('should use console logger if none provided', () => {
      const configWithoutLogger = {
        provider: CacheProvider.REDIS,
        config: {
          host: 'localhost',
          port: 6379,
        },
      };
      
      new CacheService(configWithoutLogger);
      
      expect(consoleLogger).toHaveBeenCalled();
    });

    it('should throw error for unsupported provider', () => {
      const invalidConfig = {
        provider: 'invalid' as any,
        config: {},
      };
      
      expect(() => new CacheService(invalidConfig)).toThrow('Unsupported cache provider: invalid');
    });
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const service = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        key: 'test-key',
        value: 'test-value',
        found: true,
        provider: CacheProvider.REDIS,
      };
      
      mockProvider.get.mockResolvedValue(mockResult);
      
      const result = await service.get({ key: 'test-key' });
      
      expect(mockProvider.get).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Getting value', { key: 'test-key' });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Value retrieved', { 
        key: 'test-key', 
        provider: CacheProvider.REDIS 
      });
    });

    it('should handle not found case', async () => {
      const service = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        key: 'test-key',
        found: false,
        provider: CacheProvider.REDIS,
      };
      
      mockProvider.get.mockResolvedValue(mockResult);
      
      const result = await service.get({ key: 'test-key' });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Value not found', { key: 'test-key' });
    });

    it('should handle errors', async () => {
      const service = new CacheService(redisConfig);
      
      const mockResult = {
        success: false,
        key: 'test-key',
        found: true,
        provider: CacheProvider.REDIS,
        error: 'Connection failed',
      };
      
      mockProvider.get.mockResolvedValue(mockResult);
      
      const result = await service.get({ key: 'test-key' });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Get failed', { 
        key: 'test-key', 
        error: 'Connection failed' 
      });
    });

    it('should handle exceptions', async () => {
      const service = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.get.mockRejectedValue(error);
      
      await expect(service.get({ key: 'test-key' })).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Get exception', { 
        key: 'test-key', 
        error 
      });
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        key: 'test-key',
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
      };
      
      mockProvider.set.mockResolvedValue(mockResult);
      
      const result = await cache.set({ 
        key: 'test-key', 
        value: 'test-value', 
        ttl: 3600 
      });
      
      expect(mockProvider.set).toHaveBeenCalledWith({ 
        key: 'test-key', 
        value: 'test-value', 
        ttl: 3600 
      });
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Setting value', { 
        key: 'test-key', 
        ttl: 3600 
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Value set successfully', { 
        key: 'test-key', 
        provider: CacheProvider.REDIS 
      });
    });

    it('should handle errors', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: false,
        key: 'test-key',
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
        error: 'Connection failed',
      };
      
      mockProvider.set.mockResolvedValue(mockResult);
      
      const result = await cache.set({ 
        key: 'test-key', 
        value: 'test-value' 
      });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Set failed', { 
        key: 'test-key', 
        error: 'Connection failed' 
      });
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.set.mockRejectedValue(error);
      
      await expect(cache.set({ 
        key: 'test-key', 
        value: 'test-value' 
      })).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Set exception', { 
        key: 'test-key', 
        error 
      });
    });
  });

  describe('delete', () => {
    it('should delete value from cache', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        key: 'test-key',
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
      };
      
      mockProvider.delete.mockResolvedValue(mockResult);
      
      const result = await cache.delete({ key: 'test-key' });
      
      expect(mockProvider.delete).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Deleting value', { key: 'test-key' });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Value deleted successfully', { 
        key: 'test-key', 
        provider: CacheProvider.REDIS 
      });
    });

    it('should handle errors', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: false,
        key: 'test-key',
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
        error: 'Connection failed',
      };
      
      mockProvider.delete.mockResolvedValue(mockResult);
      
      const result = await cache.delete({ key: 'test-key' });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Delete failed', { 
        key: 'test-key', 
        error: 'Connection failed' 
      });
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.delete.mockRejectedValue(error);
      
      await expect(cache.delete({ key: 'test-key' })).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Delete exception', { 
        key: 'test-key', 
        error 
      });
    });
  });

  describe('has', () => {
    it('should check if key exists in cache', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        key: 'test-key',
        exists: true,
        provider: CacheProvider.REDIS,
      };
      
      mockProvider.has.mockResolvedValue(mockResult);
      
      const result = await cache.has({ key: 'test-key' });
      
      expect(mockProvider.has).toHaveBeenCalledWith({ key: 'test-key' });
      expect(result).toEqual(mockResult);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Checking existence', { key: 'test-key' });
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Existence checked', { 
        key: 'test-key', 
        exists: true,
        provider: CacheProvider.REDIS 
      });
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.has.mockRejectedValue(error);
      
      await expect(cache.has({ key: 'test-key' })).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Has exception', { 
        key: 'test-key', 
        error 
      });
    });
  });

  describe('clear', () => {
    it('should clear cache', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: true,
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
      };
      
      mockProvider.clear.mockResolvedValue(mockResult);
      
      const result = await cache.clear();
      
      expect(mockProvider.clear).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Clearing cache');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Cache: Cache cleared successfully', { 
        provider: CacheProvider.REDIS 
      });
    });

    it('should handle errors', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        success: false,
        provider: CacheProvider.REDIS,
        timestamp: new Date(),
        error: 'Connection failed',
      };
      
      mockProvider.clear.mockResolvedValue(mockResult);
      
      const result = await cache.clear();
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Clear failed', { 
        error: 'Connection failed' 
      });
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.clear.mockRejectedValue(error);
      
      await expect(cache.clear()).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Clear exception', { error });
    });
  });

  describe('health', () => {
    it('should check health', async () => {
      const cache = new CacheService(redisConfig);
      
      const mockResult = {
        provider: CacheProvider.REDIS,
        status: 'healthy' as const,
        responseTime: 50,
        timestamp: new Date(),
      };
      
      mockProvider.health.mockResolvedValue(mockResult);
      
      const result = await cache.health();
      
      expect(mockProvider.health).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Checking health');
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Health check completed', { 
        provider: CacheProvider.REDIS,
        status: 'healthy',
        responseTimeMs: 50,
      });
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.health.mockRejectedValue(error);
      
      await expect(cache.health()).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Health check exception', { error });
    });
  });

  describe('close', () => {
    it('should close connection', async () => {
      const cache = new CacheService(redisConfig);
      
      mockProvider.close.mockResolvedValue();
      
      await cache.close();
      
      expect(mockProvider.close).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Closing connection');
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Cache: Connection closed successfully');
    });

    it('should handle exceptions', async () => {
      const cache = new CacheService(redisConfig);
      
      const error = new Error('Network error');
      mockProvider.close.mockRejectedValue(error);
      
      await expect(cache.close()).rejects.toThrow('Network error');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Cache: Close exception', { error });
    });
  });

  describe('getProviderName', () => {
    it('should return provider name', () => {
      const cache = new CacheService(redisConfig);
      expect(cache.getProviderName()).toBe(CacheProvider.REDIS);
      
      const memcachedCache = new CacheService(memcachedConfig);
      expect(memcachedCache.getProviderName()).toBe(CacheProvider.MEMCACHED);
    });
  });
});

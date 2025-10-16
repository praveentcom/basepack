/**
 * Cache service implementation
 * @module cache/service
 */

import type {
  ICacheProvider,
  CacheServiceConfig,
  RedisConfig,
  MemcachedConfig,
  CacheSetConfig,
  CacheGetConfig,
  CacheDeleteConfig,
  CacheHasConfig,
  CacheGetResult,
  CacheSetResult,
  CacheDeleteResult,
  CacheHasResult,
  CacheClearResult,
  CacheHealthInfo,
} from './types';
import { CacheProvider } from './types';
import type { Logger } from '../logger';
import { consoleLogger } from '../logger';
import { RedisProvider, MemcachedProvider } from './adapters';

/**
 * Cache service for caching operations
 * 
 * Provides a unified interface for caching operations across different providers.
 * Currently supports Redis and Memcached.
 * 
 * @example Redis
 * ```typescript
 * const cache = new CacheService({
 *   provider: CacheProvider.REDIS,
 *   config: {
 *     host: 'localhost',
 *     port: 6379
 *   }
 * });
 * 
 * // Set value
 * await cache.set({
 *   key: 'user:123',
 *   value: { name: 'John', email: 'john@example.com' },
 *   ttl: 3600
 * });
 * 
 * // Get value
 * const result = await cache.get({ key: 'user:123' });
 * if (result.found) {
 *   console.log(result.value);
 * }
 * 
 * // Delete value
 * await cache.delete({ key: 'user:123' });
 * 
 * // Check if key exists
 * const hasResult = await cache.has({ key: 'user:123' });
 * console.log(hasResult.exists);
 * 
 * // Clear all values
 * await cache.clear();
 * ```
 * 
 * @example Memcached
 * ```typescript
 * const cache = new CacheService({
 *   provider: CacheProvider.MEMCACHED,
 *   config: {
 *     servers: ['localhost:11211']
 *   }
 * });
 * 
 * await cache.set({
 *   key: 'session:abc',
 *   value: { userId: '123', timestamp: Date.now() },
 *   ttl: 1800
 * });
 * ```
 * 
 * @example With logging
 * ```typescript
 * const cache = new CacheService({
 *   provider: CacheProvider.REDIS,
 *   config: {
 *     host: 'localhost',
 *     port: 6379
 *   },
 *   logger: console
 * });
 * ```
 * 
 * @example Using environment variables
 * ```typescript
 * // Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD in environment
 * const cache = new CacheService({
 *   provider: CacheProvider.REDIS
 * });
 * ```
 */
export class CacheService {
  private readonly provider: ICacheProvider;
  private readonly logger: Logger;

  /**
   * Creates a new CacheService instance
   * 
   * @param config - Cache service configuration
   * @throws {CacheProviderError} If provider is not supported or configuration is invalid
   * 
   * @example
   * ```typescript
   * const cache = new CacheService({
   *   provider: CacheProvider.REDIS,
   *   config: {
   *     host: 'localhost',
   *     port: 6379
   *   }
   * });
   * ```
   */
  constructor(config: CacheServiceConfig) {
    this.logger = config.logger || consoleLogger();
    this.logger.debug('Basepack Cache: Initializing service', { provider: config.provider });
    this.provider = this.createProvider(config);
  }

  /**
   * Get a value from cache
   * 
   * @param config - Get configuration
   * @returns Get result with value if found
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await cache.get({ key: 'user:123' });
   * 
   * if (result.success && result.found) {
   *   console.log('User:', result.value);
   * } else if (!result.found) {
   *   console.log('User not found in cache');
   * } else {
   *   console.error('Cache error:', result.error);
   * }
   * ```
   * 
   * @example With type annotation
   * ```typescript
   * interface User {
   *   name: string;
   *   email: string;
   * }
   * 
   * const result = await cache.get<User>({ key: 'user:123' });
   * if (result.found && result.value) {
   *   console.log(result.value.name); // TypeScript knows the type
   * }
   * ```
   */
  async get<T = any>(config: CacheGetConfig): Promise<CacheGetResult<T>> {
    this.logger.info('Basepack Cache: Getting value', { key: config.key });
    try {
      const result = await this.provider.get<T>(config);
      if (result.success && result.found) {
        this.logger.info('Basepack Cache: Value retrieved', { key: config.key, provider: result.provider });
      } else if (!result.found) {
        this.logger.debug('Basepack Cache: Value not found', { key: config.key });
      } else {
        this.logger.error('Basepack Cache: Get failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Cache: Get exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Set a value in cache
   * 
   * @param config - Set configuration with value and optional TTL
   * @returns Set result
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example Basic set
   * ```typescript
   * const result = await cache.set({
   *   key: 'user:123',
   *   value: { name: 'John', email: 'john@example.com' }
   * });
   * 
   * if (result.success) {
   *   console.log('Value cached successfully');
   * }
   * ```
   * 
   * @example Set with TTL
   * ```typescript
   * await cache.set({
   *   key: 'session:abc',
   *   value: { userId: '123' },
   *   ttl: 3600 // 1 hour in seconds
   * });
   * ```
   * 
   * @example Set primitive values
   * ```typescript
   * await cache.set({ key: 'counter', value: 42, ttl: 60 });
   * await cache.set({ key: 'message', value: 'hello', ttl: 120 });
   * ```
   */
  async set(config: CacheSetConfig): Promise<CacheSetResult> {
    this.logger.info('Basepack Cache: Setting value', { key: config.key, ttl: config.ttl });
    try {
      const result = await this.provider.set(config);
      if (result.success) {
        this.logger.info('Basepack Cache: Value set successfully', { key: config.key, provider: result.provider });
      } else {
        this.logger.error('Basepack Cache: Set failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Cache: Set exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Delete a value from cache
   * 
   * Removes a value from the cache provider.
   * 
   * @param config - Delete configuration
   * @returns Delete result
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await cache.delete({ key: 'user:123' });
   * 
   * if (result.success) {
   *   console.log('Value deleted from cache');
   * }
   * ```
   */
  async delete(config: CacheDeleteConfig): Promise<CacheDeleteResult> {
    this.logger.info('Basepack Cache: Deleting value', { key: config.key });
    try {
      const result = await this.provider.delete(config);
      if (result.success) {
        this.logger.info('Basepack Cache: Value deleted successfully', { 
          key: config.key, 
          provider: result.provider
        });
      } else {
        this.logger.error('Basepack Cache: Delete failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Cache: Delete exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   * 
   * Verifies whether a key exists in the cache without retrieving its value.
   * 
   * @param config - Has configuration
   * @returns Has result indicating existence
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await cache.has({ key: 'user:123' });
   * 
   * if (result.success) {
   *   if (result.exists) {
   *     console.log('Key exists in cache');
   *   } else {
   *     console.log('Key not found in cache');
   *   }
   * }
   * ```
   */
  async has(config: CacheHasConfig): Promise<CacheHasResult> {
    this.logger.debug('Basepack Cache: Checking existence', { key: config.key });
    try {
      const result = await this.provider.has(config);
      this.logger.debug('Basepack Cache: Existence checked', { 
        key: config.key, 
        exists: result.exists,
        provider: result.provider
      });
      return result;
    } catch (error) {
      this.logger.error('Basepack Cache: Has exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Clear all values from cache
   * 
   * Removes all values from the cache provider.
   * 
   * **Important:**
   * - For Redis with a key prefix, only keys with that prefix are cleared
   * - For Redis without a prefix, the entire database is flushed
   * - For Memcached, the entire server is flushed (no selective clearing)
   * 
   * @returns Clear result
   * 
   * @example
   * ```typescript
   * const result = await cache.clear();
   * 
   * if (result.success) {
   *   console.log('Cache cleared successfully');
   * }
   * ```
   */
  async clear(): Promise<CacheClearResult> {
    this.logger.info('Basepack Cache: Clearing cache');
    try {
      const result = await this.provider.clear();
      if (result.success) {
        this.logger.info('Basepack Cache: Cache cleared successfully', { provider: result.provider });
      } else {
        this.logger.error('Basepack Cache: Clear failed', { error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Cache: Clear exception', { error });
      throw error;
    }
  }

  /**
   * Check cache provider health
   * 
   * Performs a lightweight operation to verify connectivity and access to the cache provider.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await cache.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`Cache is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`Cache is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<CacheHealthInfo> {
    this.logger.debug('Basepack Cache: Checking health');
    try {
      const health = await this.provider.health();
      this.logger.debug('Basepack Cache: Health check completed', { 
        provider: health.provider,
        status: health.status,
        responseTimeMs: health.responseTime
      });
      return health;
    } catch (error) {
      this.logger.error('Basepack Cache: Health check exception', { error });
      throw error;
    }
  }

  /**
   * Close connection to cache provider
   * 
   * Gracefully closes the connection to the cache provider.
   * Should be called when the application is shutting down.
   * 
   * @example
   * ```typescript
   * // On application shutdown
   * await cache.close();
   * console.log('Cache connection closed');
   * ```
   */
  async close(): Promise<void> {
    this.logger.debug('Basepack Cache: Closing connection');
    try {
      await this.provider.close();
      this.logger.debug('Basepack Cache: Connection closed successfully');
    } catch (error) {
      this.logger.error('Basepack Cache: Close exception', { error });
      throw error;
    }
  }

  /**
   * Get the current provider name
   * 
   * @returns Provider name
   * 
   * @example
   * ```typescript
   * const providerName = cache.getProviderName();
   * console.log(`Using provider: ${providerName}`);
   * ```
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Create a cache provider instance
   * 
   * @param config - Provider configuration
   * @returns Provider instance
   * @throws {CacheProviderError} If provider is not supported
   */
  private createProvider(config: CacheServiceConfig): ICacheProvider {
    switch (config.provider) {
      case CacheProvider.REDIS:
        return new RedisProvider((config.config || {}) as RedisConfig, this.logger);
      
      case CacheProvider.MEMCACHED:
        return new MemcachedProvider((config.config || {}) as MemcachedConfig, this.logger);
      
      default:
        throw new Error(
          `Unsupported cache provider: ${config.provider}`
        );
    }
  }
}


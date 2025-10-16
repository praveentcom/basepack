/**
 * Redis cache adapter
 * @module cache/adapters/redis
 */

import type {
  ICacheProvider,
  RedisConfig,
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
} from '../types';
import { CacheProvider } from '../types';
import type { Logger } from '../../logger';
import { CacheError, CacheProviderError, CacheConnectionError, CacheTimeoutError } from '../errors';
import {
  validateCacheGetConfig,
  validateCacheSetConfig,
  validateCacheDeleteConfig,
  validateCacheHasConfig,
} from '../validation';

/**
 * Redis cache provider
 * 
 * Provides caching operations using Redis.
 * Requires the `ioredis` package to be installed.
 * 
 * Also compatible with:
 * - Valkey (open-source Redis fork) - fully Redis-compatible
 * - Amazon ElastiCache for Redis - AWS managed Redis service
 * - Any Redis-compatible cache server
 * 
 * Supports cluster mode, TLS encryption, and Redis AUTH tokens.
 * 
 * @example Basic usage
 * ```typescript
 * const provider = new RedisProvider({
 *   host: 'localhost',
 *   port: 6379
 * });
 * 
 * // Set value
 * await provider.set({
 *   key: 'user:123',
 *   value: { name: 'John', email: 'john@example.com' },
 *   ttl: 3600
 * });
 * 
 * // Get value
 * const result = await provider.get({ key: 'user:123' });
 * if (result.found) {
 *   console.log(result.value);
 * }
 * ```
 * 
 * @example With authentication
 * ```typescript
 * const provider = new RedisProvider({
 *   host: 'redis.example.com',
 *   port: 6379,
 *   password: 'secret',
 *   db: 0
 * });
 * ```
 * 
 * @example Using connection URL
 * ```typescript
 * const provider = new RedisProvider({
 *   url: 'redis://username:password@localhost:6379/0'
 * });
 * ```
 * 
 * @example With TLS
 * ```typescript
 * const provider = new RedisProvider({
 *   host: 'redis.example.com',
 *   port: 6380,
 *   tls: true,
 *   password: 'secret'
 * });
 * ```
 * 
 * @example Valkey (Redis-compatible)
 * ```typescript
 * const provider = new RedisProvider({
 *   host: 'valkey.example.com',
 *   port: 6379,
 *   password: 'secret'
 * });
 * ```
 * 
 * @example Amazon ElastiCache for Redis
 * ```typescript
 * const provider = new RedisProvider({
 *   host: 'my-cluster.abc123.0001.use1.cache.amazonaws.com',
 *   port: 6379,
 *   password: 'your-auth-token', // If Redis AUTH enabled
 *   tls: true // If encryption in-transit enabled
 * });
 * ```
 */
export class RedisProvider implements ICacheProvider {
  readonly name = CacheProvider.REDIS;
  private readonly client: any;
  private readonly keyPrefix: string;
  private readonly logger: Logger;
  private isConnected: boolean = false;

  /**
   * Creates a new RedisProvider instance
   * 
   * @param config - Redis configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {CacheProviderError} If ioredis package is not installed
   * @throws {CacheConnectionError} If connection fails
   * 
   * @example
   * ```typescript
   * const provider = new RedisProvider({
   *   host: 'localhost',
   *   port: 6379
   * });
   * ```
   */
  constructor(config: RedisConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.keyPrefix = config.keyPrefix || process.env.REDIS_KEY_PREFIX || '';
    
    this.logger.debug('Basepack Cache: Initializing provider', { 
      provider: this.name, 
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379', 10)
    });

    try {
      const Redis = require('ioredis');

      // Build connection options
      const options: any = {
        host: config.host || process.env.REDIS_HOST || 'localhost',
        port: config.port || parseInt(process.env.REDIS_PORT || '6379', 10),
        db: config.db !== undefined ? config.db : parseInt(process.env.REDIS_DB || '0', 10),
        connectTimeout: config.connectTimeout || 5000,
        commandTimeout: config.commandTimeout || 5000,
        retryStrategy: (times: number) => {
          const maxRetries = config.retries || 3;
          if (times > maxRetries) {
            this.logger.error('Basepack Cache: Max retries reached', { provider: this.name, times });
            return null; // Stop retrying
          }
          const delay = Math.min(times * 50, 2000);
          this.logger.debug('Basepack Cache: Retrying connection', { provider: this.name, attempt: times, delayMs: delay });
          return delay;
        },
        lazyConnect: true,
      };

      // Add password if provided
      if (config.password || process.env.REDIS_PASSWORD) {
        options.password = config.password || process.env.REDIS_PASSWORD;
      }

      // Add TLS if enabled
      if (config.tls || process.env.REDIS_TLS === 'true') {
        options.tls = {};
      }

      // Use URL if provided (overrides other options)
      if (config.url || process.env.REDIS_URL) {
        this.client = new Redis(config.url || process.env.REDIS_URL, {
          connectTimeout: options.connectTimeout,
          commandTimeout: options.commandTimeout,
          retryStrategy: options.retryStrategy,
          lazyConnect: true,
        });
      } else {
        this.client = new Redis(options);
      }

      // Set up event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.debug('Basepack Cache: Provider connected', { provider: this.name });
      });

      this.client.on('close', () => {
        this.isConnected = false;
        
        // Only log if not explicitly closing (to avoid test warnings)
        if (this.client.status !== 'end') {
          this.logger.debug('Basepack Cache: Provider disconnected', { provider: this.name });
        }
      });

      this.client.on('error', (error: Error) => {
        this.logger.error('Basepack Cache: Provider error', { provider: this.name, error: error.message });
      });

    } catch (error) {
      this.logger.error('Basepack Cache: Provider initialization failed', { provider: this.name, error });
      throw new CacheProviderError(
        this.name,
        'ioredis is not installed. Install it with: npm install ioredis'
      );
    }
  }

  /**
   * Ensures the client is connected
   * 
   * @throws {CacheConnectionError} If connection fails
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (error) {
        throw new CacheConnectionError(
          'Failed to connect to Redis',
          this.name,
          error
        );
      }
    }
  }

  /**
   * Build full key with prefix
   * 
   * @param key - Cache key
   * @returns Full key with prefix
   */
  private buildKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
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
   * const result = await provider.get({ key: 'user:123' });
   * if (result.found && result.value) {
   *   console.log('User:', result.value);
   * }
   * ```
   */
  async get<T = any>(config: CacheGetConfig): Promise<CacheGetResult<T>> {
    validateCacheGetConfig(config);
    await this.ensureConnected();

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider getting value', { provider: this.name, key: fullKey });

    try {
      const value = await this.client.get(fullKey);

      if (value === null || value === undefined) {
        this.logger.debug('Basepack Cache: Provider key not found', { provider: this.name, key: fullKey });
        return {
          success: true,
          key: config.key,
          found: false,
          provider: this.name,
        };
      }

      // Try to parse JSON
      let parsedValue: T;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        // If not JSON, return as is
        parsedValue = value as T;
      }

      this.logger.debug('Basepack Cache: Provider value retrieved', { provider: this.name, key: fullKey });

      return {
        success: true,
        key: config.key,
        value: parsedValue,
        found: true,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('Basepack Cache: Provider get failed', { provider: this.name, key: fullKey, error });
      const cacheError = CacheError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        found: false,
        provider: this.name,
        error: cacheError.message,
      };
    }
  }

  /**
   * Set a value in cache
   * 
   * @param config - Set configuration with value and optional TTL
   * @returns Set result
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * await provider.set({
   *   key: 'user:123',
   *   value: { name: 'John' },
   *   ttl: 3600 // 1 hour
   * });
   * ```
   */
  async set(config: CacheSetConfig): Promise<CacheSetResult> {
    validateCacheSetConfig(config);
    await this.ensureConnected();

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider setting value', { provider: this.name, key: fullKey, ttl: config.ttl });

    try {
      // Serialize value to JSON if it's an object
      const serialized = typeof config.value === 'object' 
        ? JSON.stringify(config.value) 
        : String(config.value);

      if (config.ttl) {
        await this.client.setex(fullKey, config.ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }

      this.logger.debug('Basepack Cache: Provider value set', { provider: this.name, key: fullKey });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Cache: Provider set failed', { provider: this.name, key: fullKey, error });
      const cacheError = CacheError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        error: cacheError.message,
      };
    }
  }

  /**
   * Delete a value from cache
   * 
   * @param config - Delete configuration
   * @returns Delete result
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * await provider.delete({ key: 'user:123' });
   * ```
   */
  async delete(config: CacheDeleteConfig): Promise<CacheDeleteResult> {
    validateCacheDeleteConfig(config);
    await this.ensureConnected();

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider deleting value', { provider: this.name, key: fullKey });

    try {
      await this.client.del(fullKey);

      this.logger.debug('Basepack Cache: Provider value deleted', { provider: this.name, key: fullKey });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Cache: Provider delete failed', { provider: this.name, key: fullKey, error });
      const cacheError = CacheError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        error: cacheError.message,
      };
    }
  }

  /**
   * Check if a key exists in cache
   * 
   * @param config - Has configuration
   * @returns Has result indicating existence
   * @throws {CacheValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await provider.has({ key: 'user:123' });
   * if (result.exists) {
   *   console.log('Key exists in cache');
   * }
   * ```
   */
  async has(config: CacheHasConfig): Promise<CacheHasResult> {
    validateCacheHasConfig(config);
    await this.ensureConnected();

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider checking existence', { provider: this.name, key: fullKey });

    try {
      const exists = await this.client.exists(fullKey);

      this.logger.debug('Basepack Cache: Provider existence checked', { provider: this.name, key: fullKey, exists: exists > 0 });

      return {
        success: true,
        key: config.key,
        exists: exists > 0,
        provider: this.name,
      };
    } catch (error) {
      this.logger.error('Basepack Cache: Provider has failed', { provider: this.name, key: fullKey, error });
      const cacheError = CacheError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        exists: false,
        provider: this.name,
        error: cacheError.message,
      };
    }
  }

  /**
   * Clear all values from cache
   * 
   * Note: If a key prefix is configured, only keys with that prefix will be cleared.
   * Otherwise, this will clear the entire Redis database.
   * 
   * @returns Clear result
   * 
   * @example
   * ```typescript
   * await provider.clear();
   * console.log('Cache cleared');
   * ```
   */
  async clear(): Promise<CacheClearResult> {
    await this.ensureConnected();
    
    this.logger.info('Basepack Cache: Provider clearing cache', { provider: this.name, keyPrefix: this.keyPrefix || 'all' });

    try {
      if (this.keyPrefix) {
        // Only delete keys with the prefix
        const pattern = `${this.keyPrefix}*`;
        const stream = this.client.scanStream({ match: pattern, count: 100 });
        
        const pipeline = this.client.pipeline();
        let keysFound = 0;

        for await (const keys of stream) {
          for (const key of keys) {
            pipeline.del(key);
            keysFound++;
          }
        }

        if (keysFound > 0) {
          await pipeline.exec();
        }

        this.logger.info('Basepack Cache: Provider cache cleared', { provider: this.name, keysDeleted: keysFound });
      } else {
        // No prefix, flush entire database
        await this.client.flushdb();
        this.logger.info('Basepack Cache: Provider database flushed', { provider: this.name });
      }

      return {
        success: true,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Cache: Provider clear failed', { provider: this.name, error });
      const cacheError = CacheError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        provider: this.name,
        timestamp: new Date(),
        error: cacheError.message,
      };
    }
  }

  /**
   * Check provider health status
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * if (health.status === 'healthy') {
   *   console.log(`Redis is healthy (${health.responseTime}ms)`);
   * }
   * ```
   */
  async health(): Promise<CacheHealthInfo> {
    this.logger.debug('Basepack Cache: Provider health check', { provider: this.name });
    
    const startTime = Date.now();

    try {
      await this.ensureConnected();
      
      // Send PING command
      const response = await this.client.ping();
      const responseTime = Date.now() - startTime;

      const isHealthy = response === 'PONG';

      this.logger.debug('Basepack Cache: Provider health checked', { 
        provider: this.name, 
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTimeMs: responseTime
      });

      return {
        provider: this.name,
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: {
          ping: response,
          connected: this.isConnected,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.logger.error('Basepack Cache: Provider health check failed', { provider: this.name, error: errorMessage });

      return {
        provider: this.name,
        status: 'unhealthy',
        responseTime,
        error: errorMessage,
        timestamp: new Date(),
        details: {
          connected: this.isConnected,
        },
      };
    }
  }

  /**
   * Close connection to Redis
   * 
   * @example
   * ```typescript
   * await provider.close();
   * console.log('Redis connection closed');
   * ```
   */
  async close(): Promise<void> {
    this.logger.debug('Basepack Cache: Provider closing connection', { provider: this.name });
    
    if (this.client) {
      this.client.removeAllListeners();
      await this.client.quit();
      this.isConnected = false;
      this.logger.debug('Basepack Cache: Provider connection closed', { provider: this.name });
    }
  }

  /**
   * Determine if an error is retryable
   * 
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    // Network and connection errors are retryable
    return (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('network')
    );
  }
}


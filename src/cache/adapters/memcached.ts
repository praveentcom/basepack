/**
 * Memcached cache adapter
 * @module cache/adapters/memcached
 */

import type {
  ICacheProvider,
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
} from '../types';
import { CacheProvider } from '../types';
import type { Logger } from '../../logger';
import { CacheError, CacheProviderError, CacheConnectionError } from '../errors';
import {
  validateCacheGetConfig,
  validateCacheSetConfig,
  validateCacheDeleteConfig,
  validateCacheHasConfig,
} from '../validation';

/**
 * Memcached cache provider
 * 
 * Provides caching operations using Memcached.
 * Requires the `memcached` package to be installed.
 * 
 * Also compatible with Amazon ElastiCache for Memcached - simply use your
 * ElastiCache endpoints as the servers. Supports multi-node clusters and
 * auto-discovery configuration endpoints.
 * 
 * @example Basic usage
 * ```typescript
 * const provider = new MemcachedProvider({
 *   servers: ['localhost:11211']
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
 * @example Multiple servers
 * ```typescript
 * const provider = new MemcachedProvider({
 *   servers: ['cache1.example.com:11211', 'cache2.example.com:11211'],
 *   options: {
 *     poolSize: 10,
 *     retries: 3
 *   }
 * });
 * ```
 * 
 * @example With key prefix
 * ```typescript
 * const provider = new MemcachedProvider({
 *   servers: ['localhost:11211'],
 *   keyPrefix: 'myapp:'
 * });
 * ```
 * 
 * @example Amazon ElastiCache for Memcached
 * ```typescript
 * const provider = new MemcachedProvider({
 *   servers: [
 *     'my-cluster.abc123.0001.use1.cache.amazonaws.com:11211',
 *     'my-cluster.abc123.0002.use1.cache.amazonaws.com:11211'
 *   ]
 * });
 * ```
 */
export class MemcachedProvider implements ICacheProvider {
  readonly name = CacheProvider.MEMCACHED;
  private readonly client: any;
  private readonly keyPrefix: string;
  private readonly logger: Logger;

  /**
   * Creates a new MemcachedProvider instance
   * 
   * @param config - Memcached configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {CacheProviderError} If memcached package is not installed
   * 
   * @example
   * ```typescript
   * const provider = new MemcachedProvider({
   *   servers: ['localhost:11211']
   * });
   * ```
   */
  constructor(config: MemcachedConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.keyPrefix = config.keyPrefix || process.env.MEMCACHED_KEY_PREFIX || '';
    
    // Parse servers from config or environment
    const servers = this.parseServers(config.servers);
    
    this.logger.debug('Basepack Cache: Initializing provider', { 
      provider: this.name, 
      servers,
      keyPrefix: this.keyPrefix
    });

    try {
      const Memcached = require('memcached');

      const options = {
        poolSize: config.options?.poolSize || 10,
        retries: config.options?.retries || 3,
        retry: config.options?.retryDelay || 100,
        timeout: config.options?.timeout || 5000,
        idle: config.options?.idle || 10000,
        ...config.options,
      };

      this.client = new Memcached(servers, options);

      // Set up event handlers
      this.client.on('issue', (details: any) => {
        this.logger.error('Basepack Cache: Provider issue', { 
          provider: this.name, 
          server: details.server,
          tokens: details.tokens,
          messages: details.messages
        });
      });

      this.client.on('failure', (details: any) => {
        this.logger.error('Basepack Cache: Provider failure', { 
          provider: this.name, 
          server: details.server,
          tokens: details.tokens,
          messages: details.messages
        });
      });

      this.client.on('reconnecting', (details: any) => {
        this.logger.debug('Basepack Cache: Provider reconnecting', { 
          provider: this.name, 
          server: details.server,
          attempt: details.attempt
        });
      });

      this.client.on('reconnect', (details: any) => {
        this.logger.debug('Basepack Cache: Provider reconnected', { 
          provider: this.name, 
          server: details.server
        });
      });

    } catch (error) {
      this.logger.error('Basepack Cache: Provider initialization failed', { provider: this.name, error });
      throw new CacheProviderError(
        this.name,
        'memcached is not installed. Install it with: npm install memcached'
      );
    }
  }

  /**
   * Parse server addresses from config or environment
   * 
   * @param servers - Server configuration
   * @returns Array of server addresses
   */
  private parseServers(servers?: string | string[]): string | string[] {
    if (servers) {
      return servers;
    }

    // Try to get from environment
    const envServers = process.env.MEMCACHED_SERVERS;
    if (envServers) {
      return envServers.includes(',') 
        ? envServers.split(',').map(s => s.trim())
        : envServers;
    }

    // Default to localhost
    return 'localhost:11211';
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
   * Promisify Memcached callback-based methods
   * 
   * @param method - Method name
   * @param args - Method arguments
   * @returns Promise that resolves with the result
   */
  private promisify<T>(method: string, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      this.client[method](...args, (err: Error, result: T) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
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

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider getting value', { provider: this.name, key: fullKey });

    try {
      const value = await this.promisify<string | undefined>('get', fullKey);

      if (value === undefined || value === null) {
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

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider setting value', { provider: this.name, key: fullKey, ttl: config.ttl });

    try {
      // Serialize value to JSON if it's an object
      const serialized = typeof config.value === 'object' 
        ? JSON.stringify(config.value) 
        : String(config.value);

      // Memcached TTL is in seconds, 0 means no expiration
      const ttl = config.ttl || 0;

      await this.promisify<boolean>('set', fullKey, serialized, ttl);

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

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider deleting value', { provider: this.name, key: fullKey });

    try {
      await this.promisify<boolean>('del', fullKey);

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
   * Note: Memcached doesn't have a native "exists" command.
   * This implementation uses a GET operation to check existence.
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

    const fullKey = this.buildKey(config.key);
    this.logger.debug('Basepack Cache: Provider checking existence', { provider: this.name, key: fullKey });

    try {
      // Memcached doesn't have an EXISTS command, so we use GET
      const value = await this.promisify<string | undefined>('get', fullKey);
      const exists = value !== undefined && value !== null;

      this.logger.debug('Basepack Cache: Provider existence checked', { provider: this.name, key: fullKey, exists });

      return {
        success: true,
        key: config.key,
        exists,
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
   * Note: This flushes the entire Memcached server(s).
   * There's no way to selectively clear only keys with a specific prefix.
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
    this.logger.warn('Basepack Cache: Provider clearing entire cache', { 
      provider: this.name,
      note: 'This will flush all keys on all servers'
    });

    try {
      await this.promisify<boolean[]>('flush');

      this.logger.info('Basepack Cache: Provider cache cleared', { provider: this.name });

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
   *   console.log(`Memcached is healthy (${health.responseTime}ms)`);
   * }
   * ```
   */
  async health(): Promise<CacheHealthInfo> {
    this.logger.debug('Basepack Cache: Provider health check', { provider: this.name });
    
    const startTime = Date.now();
    const testKey = '__health_check__';

    try {
      // Try to set and get a test value
      await this.promisify<boolean>('set', testKey, 'ping', 10);
      const value = await this.promisify<string>('get', testKey);
      await this.promisify<boolean>('del', testKey);

      const responseTime = Date.now() - startTime;
      const isHealthy = value === 'ping';

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
          testPassed: isHealthy,
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
      };
    }
  }

  /**
   * Close connection to Memcached
   * 
   * @example
   * ```typescript
   * await provider.close();
   * console.log('Memcached connection closed');
   * ```
   */
  async close(): Promise<void> {
    this.logger.debug('Basepack Cache: Provider closing connection', { provider: this.name });
    
    if (this.client) {
      this.client.end();
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
      lowerMessage.includes('network') ||
      lowerMessage.includes('server') ||
      lowerMessage.includes('socket')
    );
  }
}


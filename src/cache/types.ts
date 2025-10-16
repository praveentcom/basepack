/**
 * Cache service types and interfaces
 * @module cache/types
 */

import type { Logger } from '../logger/types';

/**
 * Cache provider enum
 * 
 * @example
 * ```typescript
 * import { CacheProvider } from 'basepack';
 * 
 * const cache = new CacheService({
 *   provider: CacheProvider.REDIS,
 *   config: { host: 'localhost', port: 6379 }
 * });
 * ```
 */
export enum CacheProvider {
  REDIS = 'redis',
  MEMCACHED = 'memcached'
}

/**
 * Redis cache configuration
 * 
 * @example Basic Redis connection
 * ```typescript
 * const config: RedisConfig = {
 *   host: 'localhost',
 *   port: 6379
 * };
 * ```
 * 
 * @example Redis with authentication
 * ```typescript
 * const config: RedisConfig = {
 *   host: 'redis.example.com',
 *   port: 6379,
 *   password: 'secret',
 *   db: 0
 * };
 * ```
 * 
 * @example Redis with TLS
 * ```typescript
 * const config: RedisConfig = {
 *   host: 'redis.example.com',
 *   port: 6380,
 *   tls: true
 * };
 * ```
 */
export interface RedisConfig {
  /** Redis server hostname (or set REDIS_HOST env var, default: 'localhost') */
  host?: string;
  /** Redis server port (or set REDIS_PORT env var, default: 6379) */
  port?: number;
  /** Redis password (or set REDIS_PASSWORD env var) */
  password?: string;
  /** Redis database number (or set REDIS_DB env var, default: 0) */
  db?: number;
  /** Connection URL (or set REDIS_URL env var) - overrides host/port/password/db */
  url?: string;
  /** Enable TLS/SSL connection (or set REDIS_TLS env var) */
  tls?: boolean;
  /** Key prefix for all cache keys (or set REDIS_KEY_PREFIX env var) */
  keyPrefix?: string;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in milliseconds (default: 5000) */
  commandTimeout?: number;
  /** Maximum number of retries (default: 3) */
  retries?: number;
}

/**
 * Memcached cache configuration
 * 
 * @example Basic Memcached connection
 * ```typescript
 * const config: MemcachedConfig = {
 *   servers: ['localhost:11211']
 * };
 * ```
 * 
 * @example Multiple Memcached servers
 * ```typescript
 * const config: MemcachedConfig = {
 *   servers: ['cache1.example.com:11211', 'cache2.example.com:11211'],
 *   options: {
 *     poolSize: 10,
 *     retries: 3
 *   }
 * };
 * ```
 */
export interface MemcachedConfig {
  /** Memcached server(s) in 'host:port' format (or set MEMCACHED_SERVERS env var) */
  servers?: string | string[];
  /** Key prefix for all cache keys (or set MEMCACHED_KEY_PREFIX env var) */
  keyPrefix?: string;
  /** Memcached client options */
  options?: {
    /** Connection pool size (default: 10) */
    poolSize?: number;
    /** Maximum number of retries (default: 3) */
    retries?: number;
    /** Retry delay in milliseconds (default: 100) */
    retryDelay?: number;
    /** Connection timeout in milliseconds (default: 5000) */
    timeout?: number;
    /** Idle timeout in milliseconds (default: 10000) */
    idle?: number;
    /** Additional memcached-specific options */
    [key: string]: any;
  };
}

/**
 * Cache service configuration with single provider
 * 
 * @example Redis
 * ```typescript
 * const config: CacheServiceConfig = {
 *   provider: CacheProvider.REDIS,
 *   config: {
 *     host: 'localhost',
 *     port: 6379
 *   }
 * };
 * ```
 * 
 * @example Memcached
 * ```typescript
 * const config: CacheServiceConfig = {
 *   provider: CacheProvider.MEMCACHED,
 *   config: {
 *     servers: ['localhost:11211']
 *   }
 * };
 * ```
 * 
 * @example With logging
 * ```typescript
 * const config: CacheServiceConfig = {
 *   provider: CacheProvider.REDIS,
 *   config: {
 *     host: 'localhost',
 *     port: 6379
 *   },
 *   logger: console
 * };
 * ```
 */
export type CacheServiceConfig = {
  provider: CacheProvider;
  config?: RedisConfig | MemcachedConfig | Record<string, unknown>;
  logger?: Logger;
}

/**
 * Cache set operation configuration
 * 
 * @example Set with TTL
 * ```typescript
 * const setConfig: CacheSetConfig = {
 *   key: 'user:123',
 *   value: { name: 'John', email: 'john@example.com' },
 *   ttl: 3600 // 1 hour in seconds
 * };
 * ```
 */
export interface CacheSetConfig {
  /** Cache key */
  key: string;
  /** Value to cache (will be JSON serialized if object) */
  value: any;
  /** Time to live in seconds (optional, provider default if not specified) */
  ttl?: number;
}

/**
 * Cache get operation configuration
 * 
 * @example Get value
 * ```typescript
 * const getConfig: CacheGetConfig = {
 *   key: 'user:123'
 * };
 * ```
 */
export interface CacheGetConfig {
  /** Cache key */
  key: string;
}

/**
 * Cache delete operation configuration
 * 
 * @example Delete value
 * ```typescript
 * const deleteConfig: CacheDeleteConfig = {
 *   key: 'user:123'
 * };
 * ```
 */
export interface CacheDeleteConfig {
  /** Cache key */
  key: string;
}

/**
 * Cache has operation configuration
 * 
 * @example Check if key exists
 * ```typescript
 * const hasConfig: CacheHasConfig = {
 *   key: 'user:123'
 * };
 * ```
 */
export interface CacheHasConfig {
  /** Cache key */
  key: string;
}

/**
 * Cache get result
 */
export interface CacheGetResult<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  /** Cache key */
  key: string;
  /** Cached value (undefined if not found or error) */
  value?: T;
  /** Whether the key was found in cache */
  found: boolean;
  /** Cache provider used */
  provider: CacheProvider;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Cache set result
 */
export interface CacheSetResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Cache key */
  key: string;
  /** Cache provider used */
  provider: CacheProvider;
  /** Timestamp of operation */
  timestamp: Date;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Cache delete result
 */
export interface CacheDeleteResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Cache key */
  key: string;
  /** Cache provider used */
  provider: CacheProvider;
  /** Timestamp of operation */
  timestamp: Date;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Cache has result
 */
export interface CacheHasResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Cache key */
  key: string;
  /** Whether the key exists in cache */
  exists: boolean;
  /** Cache provider used */
  provider: CacheProvider;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Cache clear result
 */
export interface CacheClearResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Cache provider used */
  provider: CacheProvider;
  /** Timestamp of operation */
  timestamp: Date;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Cache provider health information
 */
export interface CacheHealthInfo {
  /** Provider name */
  provider: CacheProvider;
  /** Health status */
  status: 'healthy' | 'unhealthy';
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Timestamp of health check */
  timestamp: Date;
  /** Additional provider-specific details */
  details?: Record<string, any>;
}

/**
 * Cache provider interface
 * 
 * All cache providers must implement this interface
 */
export interface ICacheProvider {
  /** Provider name */
  readonly name: CacheProvider;

  /**
   * Get a value from cache
   * 
   * @param config - Get configuration
   * @returns Get result with value if found
   */
  get<T = any>(config: CacheGetConfig): Promise<CacheGetResult<T>>;

  /**
   * Set a value in cache
   * 
   * @param config - Set configuration with value and optional TTL
   * @returns Set result
   */
  set(config: CacheSetConfig): Promise<CacheSetResult>;

  /**
   * Delete a value from cache
   * 
   * @param config - Delete configuration
   * @returns Delete result
   */
  delete(config: CacheDeleteConfig): Promise<CacheDeleteResult>;

  /**
   * Check if a key exists in cache
   * 
   * @param config - Has configuration
   * @returns Has result indicating existence
   */
  has(config: CacheHasConfig): Promise<CacheHasResult>;

  /**
   * Clear all values from cache
   * 
   * @returns Clear result
   */
  clear(): Promise<CacheClearResult>;

  /**
   * Check provider health status
   * 
   * @returns Health information
   */
  health(): Promise<CacheHealthInfo>;

  /**
   * Close connection to cache provider
   * 
   * @returns Promise that resolves when connection is closed
   */
  close(): Promise<void>;
}


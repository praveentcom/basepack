/**
 * Cache service validation utilities
 * @module cache/validation
 */

import { CacheValidationError } from './errors';
import type {
  CacheSetConfig,
  CacheGetConfig,
  CacheDeleteConfig,
  CacheHasConfig,
} from './types';

/**
 * Validates a cache key
 * 
 * @param key - Cache key to validate
 * @param field - Field name for error messages
 * @throws {CacheValidationError} If key is invalid
 * 
 * @example
 * ```typescript
 * validateCacheKey('user:123', 'key'); // passes
 * validateCacheKey('', 'key'); // throws CacheValidationError
 * ```
 */
export function validateCacheKey(key: string, field: string = 'key'): void {
  if (!key || typeof key !== 'string') {
    throw new CacheValidationError('Cache key is required and must be a string', field);
  }

  if (key.trim().length === 0) {
    throw new CacheValidationError('Cache key cannot be empty or whitespace only', field);
  }

  // Check for extremely long keys (most cache providers have limits)
  if (key.length > 250) {
    throw new CacheValidationError(
      `Cache key is too long (${key.length} characters). Maximum is 250 characters`,
      field
    );
  }

  // Check for null bytes which can cause issues with some cache providers
  if (key.includes('\0')) {
    throw new CacheValidationError('Cache key cannot contain null bytes', field);
  }
}

/**
 * Validates TTL (time to live) value
 * 
 * @param ttl - TTL value in seconds to validate
 * @param field - Field name for error messages
 * @throws {CacheValidationError} If TTL is invalid
 * 
 * @example
 * ```typescript
 * validateTTL(3600, 'ttl'); // passes
 * validateTTL(-1, 'ttl'); // throws CacheValidationError
 * validateTTL(0, 'ttl'); // throws CacheValidationError
 * ```
 */
export function validateTTL(ttl: number, field: string = 'ttl'): void {
  if (typeof ttl !== 'number' || isNaN(ttl)) {
    throw new CacheValidationError('TTL must be a valid number', field);
  }

  if (ttl <= 0) {
    throw new CacheValidationError('TTL must be greater than 0', field);
  }

  if (!Number.isInteger(ttl)) {
    throw new CacheValidationError('TTL must be an integer (seconds)', field);
  }

  // Most cache providers support TTL up to ~30 days to a few years
  // We'll allow up to 1 year (31536000 seconds) as a reasonable maximum
  const MAX_TTL = 31536000; // 1 year in seconds
  if (ttl > MAX_TTL) {
    throw new CacheValidationError(
      `TTL is too large (${ttl} seconds). Maximum is ${MAX_TTL} seconds (1 year)`,
      field
    );
  }
}

/**
 * Validates cache get configuration
 * 
 * @param config - Get configuration to validate
 * @throws {CacheValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateCacheGetConfig({ key: 'user:123' }); // passes
 * validateCacheGetConfig({ key: '' }); // throws
 * ```
 */
export function validateCacheGetConfig(config: CacheGetConfig): void {
  if (!config) {
    throw new CacheValidationError('Cache get configuration is required', 'config');
  }

  validateCacheKey(config.key, 'key');
}

/**
 * Validates cache set configuration
 * 
 * @param config - Set configuration to validate
 * @throws {CacheValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateCacheSetConfig({ key: 'user:123', value: { name: 'John' } }); // passes
 * validateCacheSetConfig({ key: 'user:123', value: undefined }); // throws
 * validateCacheSetConfig({ key: 'user:123', value: 'test', ttl: -1 }); // throws
 * ```
 */
export function validateCacheSetConfig(config: CacheSetConfig): void {
  if (!config) {
    throw new CacheValidationError('Cache set configuration is required', 'config');
  }

  validateCacheKey(config.key, 'key');

  // Value can be any type including null, but not undefined
  if (config.value === undefined) {
    throw new CacheValidationError('Cache value cannot be undefined', 'value');
  }

  // Validate TTL if provided
  if (config.ttl !== undefined) {
    validateTTL(config.ttl, 'ttl');
  }
}

/**
 * Validates cache delete configuration
 * 
 * @param config - Delete configuration to validate
 * @throws {CacheValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateCacheDeleteConfig({ key: 'user:123' }); // passes
 * validateCacheDeleteConfig({ key: '' }); // throws
 * ```
 */
export function validateCacheDeleteConfig(config: CacheDeleteConfig): void {
  if (!config) {
    throw new CacheValidationError('Cache delete configuration is required', 'config');
  }

  validateCacheKey(config.key, 'key');
}

/**
 * Validates cache has configuration
 * 
 * @param config - Has configuration to validate
 * @throws {CacheValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateCacheHasConfig({ key: 'user:123' }); // passes
 * validateCacheHasConfig({ key: '' }); // throws
 * ```
 */
export function validateCacheHasConfig(config: CacheHasConfig): void {
  if (!config) {
    throw new CacheValidationError('Cache has configuration is required', 'config');
  }

  validateCacheKey(config.key, 'key');
}

/**
 * Validates that a value can be serialized to JSON
 * 
 * @param value - Value to validate
 * @param field - Field name for error messages
 * @throws {CacheValidationError} If value cannot be serialized
 * 
 * @example
 * ```typescript
 * validateSerializable({ name: 'John' }, 'value'); // passes
 * validateSerializable(undefined, 'value'); // throws
 * ```
 */
export function validateSerializable(value: any, field: string = 'value'): void {
  if (value === undefined) {
    throw new CacheValidationError('Value cannot be undefined', field);
  }

  // Try to serialize to JSON to ensure it's serializable
  try {
    JSON.stringify(value);
  } catch (error) {
    throw new CacheValidationError(
      `Value cannot be serialized to JSON: ${error instanceof Error ? error.message : String(error)}`,
      field
    );
  }
}


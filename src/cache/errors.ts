/**
 * Cache service error classes
 * @module cache/errors
 */

/**
 * Base error class for cache operations
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'user:123' });
 * } catch (error) {
 *   if (isCacheError(error)) {
 *     console.error(`Cache error from ${error.provider}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class CacheError extends Error {
  /**
   * Creates a new CacheError
   * 
   * @param message - Error message
   * @param provider - Cache provider name
   * @param statusCode - Optional HTTP status code or error code
   * @param originalError - Original error that caused this error
   * @param isRetryable - Whether this error is retryable
   */
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'CacheError';
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheError);
    }
  }

  /**
   * Create a CacheError from an unknown error
   * 
   * @param error - Unknown error to convert
   * @param provider - Cache provider name
   * @param isRetryable - Whether this error is retryable
   * @returns CacheError instance
   */
  static from(error: unknown, provider: string, isRetryable: boolean = false): CacheError {
    if (error instanceof CacheError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.statusCode || (error as any)?.status;
    
    return new CacheError(message, provider, statusCode, error, isRetryable);
  }
}

/**
 * Error thrown when cache validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.set({ key: '', value: 'test' });
 * } catch (error) {
 *   if (isCacheValidationError(error)) {
 *     console.error(`Validation error: ${error.field} - ${error.message}`);
 *   }
 * }
 * ```
 */
export class CacheValidationError extends Error {
  /**
   * Creates a new CacheValidationError
   * 
   * @param message - Error message
   * @param field - Field that failed validation
   */
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'CacheValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheValidationError);
    }
  }
}

/**
 * Error thrown when a cache provider is not supported or fails to initialize
 * 
 * @example
 * ```typescript
 * try {
 *   const cache = new CacheService({ provider: 'invalid' as any });
 * } catch (error) {
 *   if (isCacheProviderError(error)) {
 *     console.error(`Provider error: ${error.provider} - ${error.message}`);
 *   }
 * }
 * ```
 */
export class CacheProviderError extends Error {
  /**
   * Creates a new CacheProviderError
   * 
   * @param provider - Cache provider name
   * @param message - Error message
   */
  constructor(
    public readonly provider: string,
    message: string
  ) {
    super(message);
    this.name = 'CacheProviderError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheProviderError);
    }
  }
}

/**
 * Error thrown when cache connection fails
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'test' });
 * } catch (error) {
 *   if (isCacheConnectionError(error)) {
 *     console.error(`Connection error: ${error.message}`);
 *   }
 * }
 * ```
 */
export class CacheConnectionError extends CacheError {
  /**
   * Creates a new CacheConnectionError
   * 
   * @param message - Error message
   * @param provider - Cache provider name
   * @param originalError - Original error that caused this error
   */
  constructor(
    message: string,
    provider: string,
    originalError?: unknown
  ) {
    super(message, provider, undefined, originalError, true);
    this.name = 'CacheConnectionError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheConnectionError);
    }
  }
}

/**
 * Error thrown when cache operation times out
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'test' });
 * } catch (error) {
 *   if (isCacheTimeoutError(error)) {
 *     console.error(`Operation timed out after ${error.timeout}ms`);
 *   }
 * }
 * ```
 */
export class CacheTimeoutError extends CacheError {
  /**
   * Creates a new CacheTimeoutError
   * 
   * @param message - Error message
   * @param provider - Cache provider name
   * @param timeout - Timeout duration in milliseconds
   */
  constructor(
    message: string,
    provider: string,
    public readonly timeout: number
  ) {
    super(message, provider, undefined, undefined, true);
    this.name = 'CacheTimeoutError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheTimeoutError);
    }
  }
}

/**
 * Type guard to check if an error is a CacheError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheError
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'test' });
 * } catch (error) {
 *   if (isCacheError(error)) {
 *     console.error(`Cache error: ${error.provider}`);
 *   }
 * }
 * ```
 */
export function isCacheError(error: unknown): error is CacheError {
  return error instanceof CacheError;
}

/**
 * Type guard to check if an error is a CacheValidationError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheValidationError
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.set({ key: '', value: 'test' });
 * } catch (error) {
 *   if (isCacheValidationError(error)) {
 *     console.error(`Validation failed for: ${error.field}`);
 *   }
 * }
 * ```
 */
export function isCacheValidationError(error: unknown): error is CacheValidationError {
  return error instanceof CacheValidationError;
}

/**
 * Type guard to check if an error is a CacheProviderError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheProviderError
 * 
 * @example
 * ```typescript
 * try {
 *   const cache = new CacheService({ provider: 'invalid' as any });
 * } catch (error) {
 *   if (isCacheProviderError(error)) {
 *     console.error(`Provider not supported: ${error.provider}`);
 *   }
 * }
 * ```
 */
export function isCacheProviderError(error: unknown): error is CacheProviderError {
  return error instanceof CacheProviderError;
}

/**
 * Type guard to check if an error is a CacheConnectionError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheConnectionError
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'test' });
 * } catch (error) {
 *   if (isCacheConnectionError(error)) {
 *     console.error('Connection failed, retrying...');
 *   }
 * }
 * ```
 */
export function isCacheConnectionError(error: unknown): error is CacheConnectionError {
  return error instanceof CacheConnectionError;
}

/**
 * Type guard to check if an error is a CacheTimeoutError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheTimeoutError
 * 
 * @example
 * ```typescript
 * try {
 *   await cache.get({ key: 'test' });
 * } catch (error) {
 *   if (isCacheTimeoutError(error)) {
 *     console.error(`Timed out after ${error.timeout}ms`);
 *   }
 * }
 * ```
 */
export function isCacheTimeoutError(error: unknown): error is CacheTimeoutError {
  return error instanceof CacheTimeoutError;
}


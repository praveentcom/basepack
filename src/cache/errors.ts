/**
 * Cache service error classes
 * @module cache/errors
 */

import { CacheProvider } from './types';

/**
 * Error class for cache provider-specific errors.
 * 
 * Contains structured information about the error including provider name,
 * HTTP status code, original error, and whether the error is retryable.
 */
export class CacheError extends Error {
  /**
   * Creates a new CacheError
   * 
   * @param message - Error message
   * @param provider - Cache provider where the error occurred
   * @param statusCode - Optional HTTP status code or error code
   * @param originalError - Original error that caused this error
   * @param isRetryable - Whether this error is retryable
   */
  constructor(
    message: string,
    public readonly provider: CacheProvider,
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
   * Create a CacheError from an unknown error.
   * 
   * Used by cache provider adapters to convert errors to CacheError instances.
   * 
   * @param error - Unknown error to convert
   * @param provider - Cache provider where the error occurred
   * @param isRetryable - Whether this error is retryable
   * @returns CacheError instance
   */
  static from(error: unknown, provider: CacheProvider, isRetryable: boolean = false): CacheError {
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
 */
export class CacheProviderError extends Error {
  /**
   * Creates a new CacheProviderError
   * 
   * @param provider - Cache provider name
   * @param message - Error message
   */
  constructor(
    public readonly provider: CacheProvider,
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
    provider: CacheProvider,
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
    provider: CacheProvider,
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
 */
export function isCacheError(error: unknown): error is CacheError {
  return error instanceof CacheError;
}

/**
 * Type guard to check if an error is a CacheValidationError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheValidationError
 */
export function isCacheValidationError(error: unknown): error is CacheValidationError {
  return error instanceof CacheValidationError;
}

/**
 * Type guard to check if an error is a CacheProviderError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheProviderError
 */
export function isCacheProviderError(error: unknown): error is CacheProviderError {
  return error instanceof CacheProviderError;
}

/**
 * Type guard to check if an error is a CacheConnectionError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheConnectionError
 */
export function isCacheConnectionError(error: unknown): error is CacheConnectionError {
  return error instanceof CacheConnectionError;
}

/**
 * Type guard to check if an error is a CacheTimeoutError
 * 
 * @param error - Error to check
 * @returns True if error is a CacheTimeoutError
 */
export function isCacheTimeoutError(error: unknown): error is CacheTimeoutError {
  return error instanceof CacheTimeoutError;
}


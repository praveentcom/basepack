/**
 * Storage service error classes
 * @module storage/errors
 */

import { StorageProvider } from './types';

/**
 * Error class for storage provider-specific errors.
 * 
 * Contains structured information about the error including provider name,
 * HTTP status code, original error, and whether the error is retryable.
 */
export class StorageError extends Error {
  /**
   * Creates a new StorageError
   * 
   * @param message - Error message
   * @param provider - Storage provider where the error occurred
   * @param statusCode - HTTP status code if available
   * @param originalError - Original error object
   * @param isRetryable - Whether the operation can be retried
   */
  constructor(
    message: string,
    public readonly provider: StorageProvider,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'StorageError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageError);
    }
  }

  /**
   * Create a StorageError from an unknown error.
   * 
   * Used by storage provider adapters to convert errors to StorageError instances.
   * 
   * @param error - Error to convert
   * @param provider - Storage provider where the error occurred
   * @param isRetryable - Whether the operation can be retried
   * @returns StorageError instance
   */
  static from(error: unknown, provider: StorageProvider, isRetryable: boolean = false): StorageError {
    if (error instanceof StorageError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.statusCode || (error as any)?.status || (error as any)?.$metadata?.httpStatusCode;
    
    return new StorageError(message, provider, statusCode, error, isRetryable);
  }
}

/**
 * Type guard to check if an error is a StorageError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageError
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

/**
 * Validation error for storage operations
 */
export class StorageValidationError extends Error {
  /**
   * Creates a new StorageValidationError
   * 
   * @param message - Error message
   * @param field - Field that failed validation
   */
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'StorageValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageValidationError);
    }
  }
}

/**
 * Type guard to check if an error is a StorageValidationError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageValidationError
 */
export function isStorageValidationError(error: unknown): error is StorageValidationError {
  return error instanceof StorageValidationError;
}

/**
 * Provider-specific error for storage operations
 * 
 * Thrown when a storage provider is not available or configured incorrectly
 */
export class StorageProviderError extends Error {
  /**
   * Creates a new StorageProviderError
   * 
   * @param provider - Provider name
   * @param message - Error message
   */
  constructor(
    public readonly provider: StorageProvider,
    message: string
  ) {
    super(message);
    this.name = 'StorageProviderError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StorageProviderError);
    }
  }
}

/**
 * Type guard to check if an error is a StorageProviderError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageProviderError
 */
export function isStorageProviderError(error: unknown): error is StorageProviderError {
  return error instanceof StorageProviderError;
}


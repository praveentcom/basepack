/**
 * Storage service error classes
 * @module storage/errors
 */

/**
 * Base error class for storage operations
 * 
 * @example
 * ```typescript
 * try {
 *   await storage.upload(config);
 * } catch (error) {
 *   if (isStorageError(error)) {
 *     console.log(`Storage error: ${error.message}`);
 *     console.log(`Provider: ${error.provider}`);
 *     console.log(`Retryable: ${error.isRetryable}`);
 *   }
 * }
 * ```
 */
export class StorageError extends Error {
  /**
   * Creates a new StorageError
   * 
   * @param message - Error message
   * @param provider - Storage provider name
   * @param statusCode - HTTP status code if available
   * @param originalError - Original error object
   * @param isRetryable - Whether the operation can be retried
   */
  constructor(
    message: string,
    public readonly provider: string,
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
   * Create a StorageError from an unknown error
   * 
   * @param error - Error to convert
   * @param provider - Storage provider name
   * @param isRetryable - Whether the operation can be retried
   * @returns StorageError instance
   */
  static from(error: unknown, provider: string, isRetryable: boolean = false): StorageError {
    if (error instanceof StorageError) {
      return error;
    }
    
    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.statusCode || (error as any)?.status || (error as any)?.$metadata?.httpStatusCode;
    
    return new StorageError(message, provider, statusCode, error, isRetryable);
  }
}

/**
 * Type guard for StorageError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageError
 * 
 * @example
 * ```typescript
 * try {
 *   await storage.upload(config);
 * } catch (error) {
 *   if (isStorageError(error)) {
 *     console.log(`Provider: ${error.provider}`);
 *   }
 * }
 * ```
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

/**
 * Validation error for storage operations
 * 
 * @example
 * ```typescript
 * if (!config.key) {
 *   throw new StorageValidationError('File key is required', 'key');
 * }
 * ```
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
 * Type guard for StorageValidationError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageValidationError
 * 
 * @example
 * ```typescript
 * try {
 *   await storage.upload(config);
 * } catch (error) {
 *   if (isStorageValidationError(error)) {
 *     console.log(`Invalid field: ${error.field}`);
 *   }
 * }
 * ```
 */
export function isStorageValidationError(error: unknown): error is StorageValidationError {
  return error instanceof StorageValidationError;
}

/**
 * Provider-specific error for storage operations
 * 
 * Thrown when a storage provider is not available or configured incorrectly
 * 
 * @example
 * ```typescript
 * throw new StorageProviderError(
 *   's3',
 *   '@aws-sdk/client-s3 is not installed'
 * );
 * ```
 */
export class StorageProviderError extends Error {
  /**
   * Creates a new StorageProviderError
   * 
   * @param provider - Provider name
   * @param message - Error message
   */
  constructor(
    public readonly provider: string,
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
 * Type guard for StorageProviderError
 * 
 * @param error - Error to check
 * @returns True if error is a StorageProviderError
 * 
 * @example
 * ```typescript
 * try {
 *   const storage = new StorageService({ provider: 's3' });
 * } catch (error) {
 *   if (isStorageProviderError(error)) {
 *     console.log(`Provider ${error.provider} error: ${error.message}`);
 *   }
 * }
 * ```
 */
export function isStorageProviderError(error: unknown): error is StorageProviderError {
  return error instanceof StorageProviderError;
}


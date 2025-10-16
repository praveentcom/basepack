/**
 * Messaging service error classes
 * @module messaging/errors
 */

import { MessagingProvider } from './types';

/**
 * Error class for messaging provider-specific errors.
 * 
 * Contains structured information about the error including provider name,
 * HTTP status code, original error, and whether the error is retryable.
 */
export class MessagingError extends Error {
  /**
   * Creates a new MessagingError.
   * 
   * @param message - Human-readable error message
   * @param provider - Messaging provider where the error occurred
   * @param statusCode - HTTP status code (if applicable)
   * @param originalError - The original error that was thrown
   * @param isRetryable - Whether this error should trigger a retry attempt
   */
  constructor(
    message: string,
    public readonly provider: MessagingProvider,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'MessagingError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessagingError);
    }
  }

  /**
   * Creates a MessagingError from an unknown error object.
   * 
   * Used by messaging provider adapters to convert errors to MessagingError instances.
   * 
   * @param error - The error to convert
   * @param provider - Messaging provider where the error occurred
   * @param isRetryable - Whether this error should be retryable (default: false)
   * @returns A structured MessagingError instance
   */
  static from(error: unknown, provider: MessagingProvider, isRetryable: boolean = false): MessagingError {
    if (error instanceof MessagingError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.statusCode || (error as any)?.status;

    return new MessagingError(message, provider, statusCode, error, isRetryable);
  }
}

/**
 * Error thrown when message validation fails.
 * 
 * Thrown before attempting to send a message if the phone number format
 * or message structure is invalid.
 */
export class MessagingValidationError extends Error {
  public readonly statusCode = 400;
  
  /**
   * Creates a new MessagingValidationError.
   * 
   * @param message - Description of the validation failure
   * @param field - The field that failed validation (e.g., 'from', 'to', 'body')
   */
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'MessagingValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessagingValidationError);
    }
  }
}

/**
 * Error thrown when all messaging providers fail to send the message.
 * 
 * Contains detailed error information from each provider that was attempted.
 */
export class MessagingProviderError extends Error {
  /**
   * Creates a new MessagingProviderError.
   * 
   * @param message - Overall error message
   * @param errors - Array of individual provider errors
   */
  constructor(
    message: string,
    public readonly errors: ReadonlyArray<{ readonly provider: string; readonly error: string }> = []
  ) {
    super(message);
    this.name = 'MessagingProviderError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MessagingProviderError);
    }
  }
}

/**
 * Type guard to check if an error is a MessagingError.
 * 
 * @param error - Error to check
 * @returns `true` if error is a MessagingError instance
 */
export function isMessagingError(error: unknown): error is MessagingError {
  return error instanceof MessagingError;
}

/**
 * Type guard to check if an error is a MessagingValidationError.
 * 
 * @param error - Error to check
 * @returns `true` if error is a MessagingValidationError instance
 */
export function isMessagingValidationError(error: unknown): error is MessagingValidationError {
  return error instanceof MessagingValidationError;
}

/**
 * Type guard to check if an error is a MessagingProviderError.
 * 
 * @param error - Error to check
 * @returns `true` if error is a MessagingProviderError instance
 */
export function isMessagingProviderError(error: unknown): error is MessagingProviderError {
  return error instanceof MessagingProviderError;
}


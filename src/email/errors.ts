import { EmailProvider } from './types';

/**
 * Error class for email provider-specific errors.
 * 
 * Contains structured information about the error including provider name,
 * HTTP status code, original error, and whether the error is retryable.
 */
export class EmailError extends Error {
  /**
   * Creates a new EmailError.
   * 
   * @param message - Human-readable error message
   * @param provider - Email provider where the error occurred
   * @param statusCode - HTTP status code (if applicable)
   * @param originalError - The original error that was thrown
   * @param isRetryable - Whether this error should trigger a retry attempt
   */
  constructor(
    message: string,
    public readonly provider: EmailProvider,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'EmailError';
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailError);
    }
  }

  /**
   * Creates an EmailError from an unknown error object.
   * 
   * Used by email provider adapters to convert errors to EmailError instances.
   * 
   * @param error - The error to convert
   * @param provider - Email provider where the error occurred
   * @param isRetryable - Whether this error should be retryable (default: false)
   * @returns A structured EmailError instance
   */
  static from(error: unknown, provider: EmailProvider, isRetryable: boolean = false): EmailError {
    if (error instanceof EmailError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    const statusCode = (error as any)?.statusCode || (error as any)?.status;

    return new EmailError(message, provider, statusCode, error, isRetryable);
  }
}

/**
 * Error thrown when email validation fails.
 * 
 * Thrown before attempting to send an email if the message structure
 * or email addresses are invalid.
 */
export class EmailValidationError extends Error {
  public readonly statusCode = 400;
  
  /**
   * Creates a new EmailValidationError.
   * 
   * @param message - Description of the validation failure
   * @param field - The field that failed validation (e.g., 'from', 'to', 'subject')
   */
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'EmailValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailValidationError);
    }
  }
}

/**
 * Error thrown when all email providers fail to send the email.
 * 
 * Contains detailed error information from each provider that was attempted.
 */
export class EmailProviderError extends Error {
  /**
   * Creates a new EmailProviderError.
   * 
   * @param message - Overall error message
   * @param errors - Array of individual provider errors
   */
  constructor(
    message: string,
    public readonly errors: ReadonlyArray<{ readonly provider: string; readonly error: string }> = []
  ) {
    super(message);
    this.name = 'EmailProviderError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailProviderError);
    }
  }
}

/**
 * Type guard to check if an error is an EmailError.
 * 
 * @param error - Error to check
 * @returns `true` if error is an EmailError instance
 */
export function isEmailError(error: unknown): error is EmailError {
  return error instanceof EmailError;
}

/**
 * Type guard to check if an error is an EmailValidationError.
 * 
 * @param error - Error to check
 * @returns `true` if error is an EmailValidationError instance
 */
export function isEmailValidationError(error: unknown): error is EmailValidationError {
  return error instanceof EmailValidationError;
}

/**
 * Type guard to check if an error is an EmailProviderError.
 * 
 * @param error - Error to check
 * @returns `true` if error is an EmailProviderError instance
 */
export function isEmailProviderError(error: unknown): error is EmailProviderError {
  return error instanceof EmailProviderError;
}


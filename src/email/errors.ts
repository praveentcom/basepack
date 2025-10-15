/**
 * Custom error class for email-related errors.
 * 
 * Contains structured information about the error including provider name,
 * HTTP status code, original error, and whether the error is retryable.
 * 
 * @example
 * ```typescript
 * try {
 *   await service.send({ message });
 * } catch (error) {
 *   if (error instanceof EmailError) {
 *     console.log(error.provider); // 'ses'
 *     console.log(error.statusCode); // 429
 *     console.log(error.isRetryable); // true
 *   }
 * }
 * ```
 */
export class EmailError extends Error {
  /**
   * Creates a new EmailError.
   * 
   * @param message - Human-readable error message
   * @param provider - Name of the email provider where the error occurred
   * @param statusCode - HTTP status code (if applicable)
   * @param originalError - The original error that was thrown
   * @param isRetryable - Whether this error should trigger a retry attempt
   */
  constructor(
    message: string,
    public readonly provider: string,
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
   * Automatically extracts status codes and determines if the error is retryable.
   * 
   * @param error - The error to convert
   * @param provider - Name of the email provider
   * @param isRetryable - Whether this error should be retryable (default: false)
   * @returns A structured EmailError instance
   */
  static from(error: unknown, provider: string, isRetryable: boolean = false): EmailError {
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
 * 
 * @example
 * ```typescript
 * try {
 *   await service.send({
 *     message: { from: 'invalid', to: 'test@example.com', subject: 'Hi' }
 *   });
 * } catch (error) {
 *   if (error instanceof EmailValidationError) {
 *     console.log(error.field); // 'from'
 *     console.log(error.message); // 'Invalid email address in from: invalid'
 *   }
 * }
 * ```
 */
export class EmailValidationError extends EmailError {
  /**
   * Creates a new EmailValidationError.
   * 
   * @param message - Description of the validation failure
   * @param field - The field that failed validation (e.g., 'from', 'to', 'subject')
   */
  constructor(message: string, public readonly field?: string) {
    super(message, 'validation', 400, undefined, false);
    this.name = 'EmailValidationError';
  }
}

/**
 * Error thrown when all email providers fail to send the email.
 * 
 * Contains detailed error information from each provider that was attempted.
 * 
 * @example
 * ```typescript
 * try {
 *   await service.send({ message });
 * } catch (error) {
 *   if (error instanceof EmailProviderError) {
 *     console.log('All providers failed:');
 *     error.errors.forEach(({ provider, error }) => {
 *       console.log(`  ${provider}: ${error}`);
 *     });
 *   }
 * }
 * ```
 */
export class EmailProviderError extends EmailError {
  /**
   * Creates a new EmailProviderError.
   * 
   * @param message - Overall error message
   * @param provider - Name of the last provider attempted (usually 'all')
   * @param errors - Array of individual provider errors
   */
  constructor(
    message: string,
    provider: string,
    public readonly errors: ReadonlyArray<{ readonly provider: string; readonly error: string }> = []
  ) {
    super(message, provider, undefined, undefined, false);
    this.name = 'EmailProviderError';
  }
}

/**
 * Type guard to check if an error is an EmailError.
 * 
 * @param error - Error to check
 * @returns `true` if error is an EmailError instance
 * 
 * @example
 * ```typescript
 * try {
 *   await service.send({ message });
 * } catch (error) {
 *   if (isEmailError(error)) {
 *     console.log(error.provider); // TypeScript knows this exists
 *   }
 * }
 * ```
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


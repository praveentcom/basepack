import { EmailError } from './errors';

/**
 * Configuration options for retry behavior.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Minimum timeout between retries in milliseconds (default: 1000) */
  minTimeout?: number;
  /** Maximum timeout between retries in milliseconds (default: 30000) */
  maxTimeout?: number;
  /** Exponential backoff factor (default: 2) */
  factor?: number;
  /** Callback function called before each retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  minTimeout: 1000,
  maxTimeout: 30000,
  factor: 2,
  onRetry: () => {},
};

/**
 * Calculate exponential backoff delay
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = Math.min(
    options.minTimeout * Math.pow(options.factor, attempt),
    options.maxTimeout
  );
  
  // Add jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  return Math.floor(delay + jitter);
}

/**
 * Delay for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof EmailError) {
    return error.isRetryable;
  }

  // Check for common retryable error patterns
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Network errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('network') ||
    errorMessage.includes('socket')
  ) {
    return true;
  }

  // Rate limiting errors
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return true;
  }

  // HTTP status codes that are retryable
  const statusCode = (error as any)?.statusCode || (error as any)?.status;
  if (statusCode && [408, 429, 500, 502, 503, 504].includes(statusCode)) {
    return true;
  }

  return false;
}

/**
 * Retries a function with exponential backoff.
 * 
 * Automatically retries on failures with increasing delays between attempts.
 * Only retries errors that are marked as retryable (network errors, rate limits, 5xx).
 * 
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retry attempts are exhausted
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => sendEmail(message),
 *   {
 *     retries: 3,
 *     minTimeout: 1000,
 *     maxTimeout: 10000,
 *     factor: 2,
 *     onRetry: (error, attempt) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.retries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        break;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      opts.onRetry(error instanceof Error ? error : new Error(String(error)), attempt + 1);
      await sleep(delay);
    }
  }

  // All retries exhausted, throw the last error
  throw lastError;
}


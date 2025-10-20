/**
 * Queue service error classes
 * @module queue/errors
 */

import { QueueProvider } from './types';

/**
 * Base error class for queue operations.
 */
export class QueueError extends Error {
  constructor(
    message: string,
    public readonly provider: QueueProvider,
    public readonly statusCode?: number,
    public readonly errorCode?: string
  ) {
    super(message);
    this.name = 'QueueError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueueError);
    }
  }
}

/**
 * Error thrown when queue configuration is invalid.
 */
export class QueueConfigurationError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly field?: string
  ) {
    super(message, provider);
    this.name = 'QueueConfigurationError';
  }
}

/**
 * Error thrown when queue validation fails.
 */
export class QueueValidationError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly field?: string
  ) {
    super(message, provider);
    this.name = 'QueueValidationError';
  }
}

/**
 * Error thrown when a queue is not found.
 */
export class QueueNotFoundError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly queueName?: string
  ) {
    super(message, provider, 404);
    this.name = 'QueueNotFoundError';
  }
}

/**
 * Error thrown when task validation fails.
 */
export class TaskValidationError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly field?: string
  ) {
    super(message, provider);
    this.name = 'TaskValidationError';
  }
}

/**
 * Error thrown when a task is not found.
 */
export class TaskNotFoundError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly taskId?: string
  ) {
    super(message, provider, 404);
    this.name = 'TaskNotFoundError';
  }
}

/**
 * Error thrown when queue operation times out.
 */
export class QueueTimeoutError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly timeout?: number
  ) {
    super(message, provider, 408);
    this.name = 'QueueTimeoutError';
  }
}

/**
 * Error thrown when queue provider connection fails.
 */
export class QueueConnectionError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly originalError?: Error
  ) {
    super(message, provider);
    this.name = 'QueueConnectionError';
  }
}

/**
 * Error thrown when queue operation exceeds rate limits.
 */
export class QueueRateLimitError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly retryAfter?: number
  ) {
    super(message, provider, 429);
    this.name = 'QueueRateLimitError';
  }
}

/**
 * Error thrown when operation is not supported by the provider.
 */
export class QueueOperationNotSupportedError extends QueueError {
  constructor(
    message: string,
    provider: QueueProvider,
    public readonly operation?: string
  ) {
    super(message, provider, 501);
    this.name = 'QueueOperationNotSupportedError';
  }
}

/**
 * Error type guard for QueueError.
 */
export function isQueueError(error: any): error is QueueError {
  return error instanceof QueueError;
}

/**
 * Error type guard for QueueConfigurationError.
 */
export function isQueueConfigurationError(error: any): error is QueueConfigurationError {
  return error instanceof QueueConfigurationError;
}

/**
 * Error type guard for QueueValidationError.
 */
export function isQueueValidationError(error: any): error is QueueValidationError {
  return error instanceof QueueValidationError;
}

/**
 * Error type guard for QueueNotFoundError.
 */
export function isQueueNotFoundError(error: any): error is QueueNotFoundError {
  return error instanceof QueueNotFoundError;
}

/**
 * Error type guard for TaskValidationError.
 */
export function isTaskValidationError(error: any): error is TaskValidationError {
  return error instanceof TaskValidationError;
}

/**
 * Error type guard for TaskNotFoundError.
 */
export function isTaskNotFoundError(error: any): error is TaskNotFoundError {
  return error instanceof TaskNotFoundError;
}

/**
 * Error type guard for QueueTimeoutError.
 */
export function isQueueTimeoutError(error: any): error is QueueTimeoutError {
  return error instanceof QueueTimeoutError;
}

/**
 * Error type guard for QueueConnectionError.
 */
export function isQueueConnectionError(error: any): error is QueueConnectionError {
  return error instanceof QueueConnectionError;
}

/**
 * Error type guard for QueueRateLimitError.
 */
export function isQueueRateLimitError(error: any): error is QueueRateLimitError {
  return error instanceof QueueRateLimitError;
}

/**
 * Error type guard for QueueOperationNotSupportedError.
 */
export function isQueueOperationNotSupportedError(error: any): error is QueueOperationNotSupportedError {
  return error instanceof QueueOperationNotSupportedError;
}
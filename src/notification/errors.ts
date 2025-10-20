/**
 * Custom error classes for notification service
 * @module notification/errors
 */

import { NotificationProvider } from './types';

/**
 * Base error class for all notification-related errors.
 */
export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly provider: NotificationProvider,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'NotificationError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotificationError);
    }
  }
}

/**
 * Error thrown when notification validation fails.
 */
export class NotificationValidationError extends NotificationError {
  constructor(
    message: string,
    public readonly field: string,
    provider: NotificationProvider
  ) {
    super(`Validation failed for ${field}: ${message}`, provider);
    this.name = 'NotificationValidationError';
  }
}

/**
 * Error thrown when notification configuration is invalid.
 */
export class NotificationConfigError extends NotificationError {
  constructor(
    message: string,
    provider: NotificationProvider
  ) {
    super(`Configuration error: ${message}`, provider);
    this.name = 'NotificationConfigError';
  }
}

/**
 * Error thrown when device token is invalid or expired.
 */
export class NotificationTokenError extends NotificationError {
  constructor(
    message: string,
    public readonly token: string,
    provider: NotificationProvider
  ) {
    super(`Invalid token: ${message}`, provider);
    this.name = 'NotificationTokenError';
  }
}

/**
 * Error thrown when notification payload is too large.
 */
export class NotificationPayloadTooLargeError extends NotificationError {
  constructor(
    message: string,
    public readonly size: number,
    public readonly maxSize: number,
    provider: NotificationProvider
  ) {
    super(`Payload too large (${size} bytes, max ${maxSize}): ${message}`, provider);
    this.name = 'NotificationPayloadTooLargeError';
  }
}

/**
 * Error thrown when notification rate limit is exceeded.
 */
export class NotificationRateLimitError extends NotificationError {
  constructor(
    message: string,
    provider: NotificationProvider,
    public readonly retryAfter?: number
  ) {
    super(`Rate limit exceeded: ${message}`, provider);
    this.name = 'NotificationRateLimitError';
  }
}

/**
 * Error thrown when provider authentication fails.
 */
export class NotificationAuthError extends NotificationError {
  constructor(
    message: string,
    provider: NotificationProvider
  ) {
    super(`Authentication failed: ${message}`, provider);
    this.name = 'NotificationAuthError';
  }
}

/**
 * Error thrown when provider service is unavailable.
 */
export class NotificationServiceUnavailableError extends NotificationError {
  constructor(
    message: string,
    provider: NotificationProvider
  ) {
    super(`Service unavailable: ${message}`, provider);
    this.name = 'NotificationServiceUnavailableError';
  }
}

/**
 * Error thrown when notification send times out.
 */
export class NotificationTimeoutError extends NotificationError {
  constructor(
    message: string,
    public readonly timeout: number,
    provider: NotificationProvider
  ) {
    super(`Timeout after ${timeout}ms: ${message}`, provider);
    this.name = 'NotificationTimeoutError';
  }
}

/**
 * Error thrown when network connectivity fails.
 */
export class NotificationNetworkError extends NotificationError {
  constructor(
    message: string,
    provider: NotificationProvider,
    public readonly originalError?: Error
  ) {
    super(`Network error: ${message}`, provider);
    this.name = 'NotificationNetworkError';
  }
}

/**
 * Type guards for checking error types
 */

/**
 * Check if an error is a NotificationError
 */
export function isNotificationError(error: unknown): error is NotificationError {
  return error instanceof Error && 'provider' in error && 'name' in error;
}

/**
 * Check if an error is a NotificationValidationError
 */
export function isNotificationValidationError(error: unknown): error is NotificationValidationError {
  return error instanceof NotificationValidationError;
}

/**
 * Check if an error is a NotificationConfigError
 */
export function isNotificationConfigError(error: unknown): error is NotificationConfigError {
  return error instanceof NotificationConfigError;
}

/**
 * Check if an error is a NotificationTokenError
 */
export function isNotificationTokenError(error: unknown): error is NotificationTokenError {
  return error instanceof NotificationTokenError;
}

/**
 * Check if an error is a NotificationPayloadTooLargeError
 */
export function isNotificationPayloadTooLargeError(error: unknown): error is NotificationPayloadTooLargeError {
  return error instanceof NotificationPayloadTooLargeError;
}

/**
 * Check if an error is a NotificationRateLimitError
 */
export function isNotificationRateLimitError(error: unknown): error is NotificationRateLimitError {
  return error instanceof NotificationRateLimitError;
}

/**
 * Check if an error is a NotificationAuthError
 */
export function isNotificationAuthError(error: unknown): error is NotificationAuthError {
  return error instanceof NotificationAuthError;
}

/**
 * Check if an error is a NotificationServiceUnavailableError
 */
export function isNotificationServiceUnavailableError(error: unknown): error is NotificationServiceUnavailableError {
  return error instanceof NotificationServiceUnavailableError;
}

/**
 * Check if an error is a NotificationTimeoutError
 */
export function isNotificationTimeoutError(error: unknown): error is NotificationTimeoutError {
  return error instanceof NotificationTimeoutError;
}

/**
 * Check if an error is a NotificationNetworkError
 */
export function isNotificationNetworkError(error: unknown): error is NotificationNetworkError {
  return error instanceof NotificationNetworkError;
}
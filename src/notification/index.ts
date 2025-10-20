/**
 * Notification service module exports
 * @module notification
 */

// Main service
export { NotificationService } from './service';

// Types and interfaces
export type {
  NotificationBaseOptions,
  NotificationSendResult,
  NotificationHealthInfo,
  BaseNotification,
  IosNotification,
  AndroidNotification,
  WebNotification,
  NotificationMessage,
  NotificationSendConfig,
  INotificationProvider,
  FCMConfig,
  APNSConfig,
  WebPushConfig,
  NotificationSingleProviderConfig,
  NotificationServiceConfig
} from './types';

export {
  NotificationProvider,
  isNotificationSingleMessageConfig,
  isNotificationBatchMessageConfig
} from './types';

// Error classes
export {
  NotificationError,
  NotificationValidationError,
  NotificationConfigError,
  NotificationTokenError,
  NotificationPayloadTooLargeError,
  NotificationRateLimitError,
  NotificationAuthError,
  NotificationServiceUnavailableError,
  NotificationTimeoutError,
  NotificationNetworkError
} from './errors';

export {
  isNotificationError,
  isNotificationValidationError,
  isNotificationConfigError,
  isNotificationTokenError,
  isNotificationPayloadTooLargeError,
  isNotificationRateLimitError,
  isNotificationAuthError,
  isNotificationServiceUnavailableError,
  isNotificationTimeoutError,
  isNotificationNetworkError
} from './errors';

// Validation utilities
export {
  validateDeviceToken,
  validateNotificationTitle,
  validateNotificationBody,
  validateIosNotification,
  validateAndroidNotification,
  validateWebNotification,
  validateNotificationData,
  validateNotificationMessage,
  validateNotificationSendConfig
} from './validation';

// Adapters
export {
  FCMProvider,
  APNSProvider,
  WebPushProvider
} from './adapters';

export type {
  WebPushSubscription
} from './adapters';
/**
 * Notification service types and interfaces
 * @module notification/types
 */

import type { Logger } from '../logger/types';

/**
 * Web Push subscription information
 */
export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Optional configuration for notification operations.
 */
export interface NotificationBaseOptions {
  /** Timeout in milliseconds for the notification operation */
  timeout?: number;
  /** Number of retry attempts for failed sends (default: 2) */
  retries?: number;
  /** Minimum timeout between retries in milliseconds (default: 1000) */
  retryMinTimeout?: number;
  /** Maximum timeout between retries in milliseconds (default: 10000) */
  retryMaxTimeout?: number;
  /** Exponential backoff factor (default: 2) */
  retryFactor?: number;
  /** Custom metadata to attach to the notification operation */
  metadata?: Record<string, any>;
  /** Whether to validate notification data before sending (default: true) */
  validateBeforeSend?: boolean;
  /** Priority of the notification (0 = highest, 10 = lowest) */
  priority?: number;
  /** Time-to-live for the notification in seconds */
  ttl?: number;
}

/**
 * Result of a notification send operation.
 */
export interface NotificationSendResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** Unique message ID from the notification provider (if available) */
  messageId?: string;
  /** Error message if the send failed */
  error?: string;
  /** Name of the provider that handled this notification */
  provider: NotificationProvider;
  /** Timestamp when the send operation completed */
  timestamp: Date;
}

/**
 * Health check information for a notification provider.
 */
export interface NotificationHealthInfo {
  /** Whether the provider is healthy and operational */
  ok: boolean;
  /** Optional health status message */
  message?: string;
  /** Additional provider-specific health details */
  details?: Record<string, any>;
}

/**
 * Base notification message structure.
 */
export interface BaseNotification {
  /** Device token(s) to send the notification to */
  to: string | string[] | WebPushSubscription | WebPushSubscription[];
  /** Notification title */
  title: string;
  /** Notification body content */
  body: string;
  /** Additional data payload */
  data?: Record<string, any>;
  /** Unique identifier for the notification */
  id?: string;
  /** Sound to play when notification is received */
  sound?: string;
  /** Badge count to display on app icon */
  badge?: number;
  /** Category identifier for interactive notifications */
  category?: string;
  /** Whether the notification should be silent (no sound/vibration) */
  silent?: boolean;
  /** Time-to-live for the notification in seconds */
  ttl?: number;
  /** Priority level (0 = highest, 10 = lowest) */
  priority?: number;
}

/**
 * iOS-specific notification options.
 */
export interface IosNotification {
  /** Content-available flag for background notifications */
  contentAvailable?: boolean;
  /** Mutable-content flag for rich notifications */
  mutableContent?: boolean;
  /** Thread identifier for grouping notifications */
  threadId?: string;
  /** Target content identifier for rich notifications */
  targetContentId?: string;
  /** Custom iOS-specific payload */
  payload?: Record<string, any>;
  /** Badge count to display on app icon */
  badge?: number;
  /** Category identifier for interactive notifications */
  category?: string;
  /** Sound to play when notification is received */
  sound?: string;
}

/**
 * Android-specific notification options.
 */
export interface AndroidNotification {
  /** Channel ID for Android O+ notifications */
  channelId?: string;
  /** Small icon resource name */
  smallIcon?: string;
  /** Large icon resource name */
  largeIcon?: string;
  /** Large icon image URL */
  largeIconUrl?: string;
  /** Accent color for notifications (RRGGBB format) */
  color?: string;
  /** Whether to show notification on lock screen */
  showOnLockScreen?: boolean;
  /** Whether to vibrate device */
  vibrate?: boolean;
  /** Vibration pattern */
  vibratePattern?: number[];
  /** Whether to use device lights */
  lights?: boolean;
  /** Light color and pattern */
  lightSettings?: {
    color: string;
    onMs?: number;
    offMs?: number;
  };
  /** Sound file name */
  sound?: string;
  /** Click action for notification */
  clickAction?: string;
  /** Priority level (Android priority) */
  priority?: 'high' | 'normal' | 'low';
  /** Custom Android-specific payload */
  payload?: Record<string, any>;
}

/**
 * Web push notification options.
 */
export interface WebNotification {
  /** Icon URL for the notification */
  icon?: string;
  /** Badge URL for the notification */
  badge?: string;
  /** Image URL for the notification */
  image?: string;
  /** Data to pass to the service worker */
  data?: Record<string, any>;
  /** Actions for the notification */
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  /** Vibration pattern */
  vibrate?: number[];
  /** Whether to require user interaction */
  requireInteraction?: boolean;
  /** Whether to stay silent */
  silent?: boolean;
  /** Direction of the notification */
  dir?: 'auto' | 'ltr' | 'rtl';
  /** Language tag for the notification */
  lang?: string;
  /** Renotify flag */
  renotify?: boolean;
  /** Tag for the notification */
  tag?: string;
  /** Timestamp for the notification */
  timestamp?: number;
}

/**
 * Notification message structure supporting all platforms.
 *
 * @example
 * ```typescript
 * const message: NotificationMessage = {
 *   to: 'device-token',
 *   title: 'Hello',
 *   body: 'You have a new message',
 *   data: { userId: '123' },
 *   ios: { contentAvailable: true },
 *   android: { channelId: 'default', smallIcon: 'notification_icon' },
 *   web: { icon: '/favicon.ico' }
 * };
 * ```
 */
export interface NotificationMessage extends BaseNotification {
  /** iOS-specific options */
  ios?: IosNotification;
  /** Android-specific options */
  android?: AndroidNotification;
  /** Web-specific options */
  web?: WebNotification;
}

/**
 * Configuration for sending notifications.
 * Use either `message` for single notification or `messages` for batch sending.
 *
 * @example
 * ```typescript
 * // Single notification
 * const config: NotificationSendConfig = {
 *   message: { to: 'token', title: 'Hello', body: 'World' }
 * };
 *
 * // Batch notifications
 * const config: NotificationSendConfig = {
 *   messages: [
 *     { to: 'token1', title: 'Hello', body: 'World' },
 *     { to: 'token2', title: 'Hello', body: 'World' }
 *   ]
 * };
 * ```
 */
export type NotificationSendConfig =
  | { message: NotificationMessage; messages?: never; opts?: NotificationBaseOptions }
  | { messages: NotificationMessage[]; message?: never; opts?: NotificationBaseOptions };

/**
 * Type guard to check if config is for sending a single message.
 *
 * @param config - Notification send configuration
 * @returns `true` if config contains a single message
 *
 * @example
 * ```typescript
 * if (isNotificationSingleMessageConfig(config)) {
 *   // TypeScript knows config.message exists
 *   console.log(config.message.title);
 * }
 * ```
 */
export function isNotificationSingleMessageConfig(
  config: NotificationSendConfig
): config is { message: NotificationMessage; opts?: NotificationBaseOptions } {
  return 'message' in config && config.message !== undefined;
}

/**
 * Type guard to check if config is for sending multiple messages.
 *
 * @param config - Notification send configuration
 * @returns `true` if config contains multiple messages
 *
 * @example
 * ```typescript
 * if (isNotificationBatchMessageConfig(config)) {
 *   // TypeScript knows config.messages exists
 *   console.log(config.messages.length);
 * }
 * ```
 */
export function isNotificationBatchMessageConfig(
  config: NotificationSendConfig
): config is { messages: NotificationMessage[]; opts?: NotificationBaseOptions } {
  return 'messages' in config && config.messages !== undefined;
}

/**
 * Interface that all notification provider adapters must implement.
 */
export interface INotificationProvider {
  /** Unique name of the notification provider */
  readonly name: NotificationProvider;

  /**
   * Sends a notification or batch of notifications.
   * @param config - Notification configuration with message(s) and options
   * @returns Array of send results
   */
  send(config: NotificationSendConfig): Promise<NotificationSendResult[]>;

  /**
   * Checks the health/status of the notification provider.
   * @returns Health status information
   */
  health?(): Promise<NotificationHealthInfo>;
}

/**
 * Notification provider enum
 *
 * @example
 * ```typescript
 * import { NotificationProvider } from 'basepack';
 *
 * const service = new NotificationService({
 *   provider: NotificationProvider.FCM,
 *   config: { credentials: { ... } }
 * });
 * ```
 */
export enum NotificationProvider {
  FCM = 'fcm',
  APNS = 'apns',
  WEB_PUSH = 'web-push'
}

/**
 * Firebase Cloud Messaging (FCM) configuration.
 * Requires: `firebase-admin` package
 *
 * @see https://firebase.google.com/docs/cloud-messaging
 */
export interface FCMConfig {
  /** Firebase project ID (or set FIREBASE_PROJECT_ID env var) */
  projectId?: string;
  /** Firebase service account JSON (or set FIREBASE_SERVICE_ACCOUNT env var) */
  serviceAccount?: {
    projectId?: string;
    clientEmail?: string;
    privateKey?: string;
    privateKeyId?: string;
  };
  /** Path to service account JSON file (or set FIREBASE_SERVICE_ACCOUNT_PATH env var) */
  serviceAccountPath?: string;
  /** FCM API key (for HTTP v1 API) */
  apiKey?: string;
  /** Custom FCM endpoint URL */
  endpoint?: string;
}

/**
 * Apple Push Notification Service (APNS) configuration.
 * Requires: `@parse/node-apn` package
 *
 * @see https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server
 */
export interface APNSConfig {
  /** APNS environment (development or production) */
  environment: 'development' | 'production';
  /** Team ID from Apple Developer account */
  teamId?: string;
  /** Key ID from Apple Developer account */
  keyId?: string;
  /** Bundle ID of the app */
  bundleId: string;
  /** Private key content (PEM format) */
  privateKey?: string;
  /** Path to private key file */
  privateKeyPath?: string;
  /** APNS certificate content (PEM format) */
  certificate?: string;
  /** Path to certificate file */
  certificatePath?: string;
  /** APNS connection timeout in milliseconds */
  connectionTimeout?: number;
  /** APNS token refresh interval in seconds */
  tokenRefreshInterval?: number;
}

/**
 * Web Push configuration.
 * Requires: `web-push` package
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Push_API
 */
export interface WebPushConfig {
  /** VAPID public key (or set WEB_PUSH_PUBLIC_KEY env var) */
  publicKey?: string;
  /** VAPID private key (or set WEB_PUSH_PRIVATE_KEY env var) */
  privateKey?: string;
  /** VAPID subject (contact email) */
  subject?: string;
  /** Email address for VAPID (or set WEB_PUSH_EMAIL env var) */
  email?: string;
  /** Custom Web Push service worker file */
  serviceWorker?: string;
  /** Push service endpoint override */
  endpoint?: string;
  /** GCM API key for fallback (deprecated) */
  gcmApiKey?: string;
}

/**
 * Configuration for a single notification provider.
 *
 * @example
 * ```typescript
 * const fcmConfig: NotificationSingleProviderConfig = {
 *   provider: NotificationProvider.FCM,
 *   config: { projectId: 'my-project' }
 * };
 * ```
 */
export type NotificationSingleProviderConfig =
  | { provider: NotificationProvider.FCM; config?: FCMConfig }
  | { provider: NotificationProvider.APNS; config?: APNSConfig }
  | { provider: NotificationProvider.WEB_PUSH; config?: WebPushConfig };

/**
 * NotificationService configuration with optional backup providers for automatic failover.
 *
 * Can be either:
 * - Single provider configuration
 * - Primary provider with backup providers
 *
 * @example
 * ```typescript
 * // Single provider
 * const config: NotificationServiceConfig = {
 *   provider: NotificationProvider.FCM,
 *   config: { projectId: 'my-project' }
 * };
 *
 * // With failover
 * const config: NotificationServiceConfig = {
 *   primary: { provider: NotificationProvider.FCM },
 *   backups: [
 *     { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app' } }
 *   ]
 * };
 *
 * // With logging
 * const config: NotificationServiceConfig = {
 *   provider: NotificationProvider.FCM,
 *   config: { projectId: 'my-project' },
 *   logger: console
 * };
 * ```
 */
export type NotificationServiceConfig =
  | (NotificationSingleProviderConfig & { logger?: Logger })
  | {
      /** Primary notification provider to use first */
      primary: NotificationSingleProviderConfig;
      /** Optional backup providers for automatic failover */
      backups?: NotificationSingleProviderConfig[];
      /** Optional logger for debugging and monitoring */
      logger?: Logger;
    };
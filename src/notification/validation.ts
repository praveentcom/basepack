/**
 * Validation utilities for notification service
 * @module notification/validation
 */

import {
  NotificationMessage,
  NotificationSendConfig,
  IosNotification,
  AndroidNotification,
  WebNotification,
  WebPushSubscription,
  NotificationProvider
} from './types';
import {
  NotificationValidationError
} from './errors';

/**
 * Maximum payload sizes for different providers (in bytes)
 */
const PAYLOAD_LIMITS = {
  [NotificationProvider.FCM]: 4096,
  [NotificationProvider.APNS]: 4096,
  [NotificationProvider.WEB_PUSH]: 4096,
} as const;

/**
 * Validates a device token format.
 *
 * @param token - Device token to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When token is invalid
 */
export function validateDeviceToken(token: string | WebPushSubscription, provider: NotificationProvider): void {
  // Handle WebPushSubscription for web push
  if (provider === NotificationProvider.WEB_PUSH && typeof token === 'object') {
    if (!token.endpoint || typeof token.endpoint !== 'string') {
      throw new NotificationValidationError('Web push endpoint is required', 'to', provider);
    }

    if (!token.keys || typeof token.keys !== 'object') {
      throw new NotificationValidationError('Web push keys are required', 'to', provider);
    }

    if (!token.keys.p256dh || typeof token.keys.p256dh !== 'string') {
      throw new NotificationValidationError('Web push p256dh key is required', 'to', provider);
    }

    if (!token.keys.auth || typeof token.keys.auth !== 'string') {
      throw new NotificationValidationError('Web push auth key is required', 'to', provider);
    }

    // Validate endpoint URL
    try {
      new URL(token.endpoint);
    } catch {
      throw new NotificationValidationError('Invalid web push endpoint URL', 'to', provider);
    }
    return;
  }

  // Handle string tokens for FCM and APNS
  if (!token || typeof token !== 'string') {
    throw new NotificationValidationError('Device token is required and must be a string', 'to', provider);
  }

  // Basic length checks
  if (token.length < 10) {
    throw new NotificationValidationError('Device token too short', 'to', provider);
  }

  if (token.length > 1000) {
    throw new NotificationValidationError('Device token too long', 'to', provider);
  }

  // Provider-specific format validation
  switch (provider) {
    case NotificationProvider.FCM:
      // FCM tokens are typically 152-172 characters long
      if (!/^[A-Za-z0-9:_-]+$/.test(token)) {
        throw new NotificationValidationError('Invalid FCM token format', 'to', provider);
      }
      break;

    case NotificationProvider.APNS:
      // APNS tokens are 64 characters long hexadecimal
      if (!/^[a-fA-F0-9]{64}$/.test(token)) {
        throw new NotificationValidationError('Invalid APNS token format', 'to', provider);
      }
      break;

    case NotificationProvider.WEB_PUSH:
      // Web push endpoints are URLs
      try {
        new URL(token);
      } catch {
        throw new NotificationValidationError('Invalid web push endpoint URL', 'to', provider);
      }
      break;
  }
}

/**
 * Validates notification title.
 *
 * @param title - Notification title to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When title is invalid
 */
export function validateNotificationTitle(title: string, provider: NotificationProvider): void {
  if (!title || typeof title !== 'string') {
    throw new NotificationValidationError('Title is required and must be a string', 'title', provider);
  }

  if (title.trim().length === 0) {
    throw new NotificationValidationError('Title cannot be empty', 'title', provider);
  }

  if (title.length > 1000) {
    throw new NotificationValidationError('Title too long (max 1000 characters)', 'title', provider);
  }
}

/**
 * Validates notification body.
 *
 * @param body - Notification body to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When body is invalid
 */
export function validateNotificationBody(body: string, provider: NotificationProvider): void {
  if (!body || typeof body !== 'string') {
    throw new NotificationValidationError('Body is required and must be a string', 'body', provider);
  }

  if (body.trim().length === 0) {
    throw new NotificationValidationError('Body cannot be empty', 'body', provider);
  }

  if (body.length > 10000) {
    throw new NotificationValidationError('Body too long (max 10000 characters)', 'body', provider);
  }
}

/**
 * Validates iOS notification options.
 *
 * @param ios - iOS notification options
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When iOS options are invalid
 */
export function validateIosNotification(ios: IosNotification, provider: NotificationProvider): void {
  if (!ios || typeof ios !== 'object') {
    return; // iOS options are optional
  }

  // Validate thread ID if provided
  if (ios.threadId && typeof ios.threadId !== 'string') {
    throw new NotificationValidationError('Thread ID must be a string', 'ios.threadId', provider);
  }

  // Validate target content ID if provided
  if (ios.targetContentId && typeof ios.targetContentId !== 'string') {
    throw new NotificationValidationError('Target content ID must be a string', 'ios.targetContentId', provider);
  }

  // Validate payload if provided
  if (ios.payload && typeof ios.payload !== 'object') {
    throw new NotificationValidationError('iOS payload must be an object', 'ios.payload', provider);
  }
}

/**
 * Validates Android notification options.
 *
 * @param android - Android notification options
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When Android options are invalid
 */
export function validateAndroidNotification(android: AndroidNotification, provider: NotificationProvider): void {
  if (!android || typeof android !== 'object') {
    return; // Android options are optional
  }

  // Validate channel ID if provided
  if (android.channelId && typeof android.channelId !== 'string') {
    throw new NotificationValidationError('Channel ID must be a string', 'android.channelId', provider);
  }

  // Validate color if provided (RRGGBB format)
  if (android.color && !/^#[0-9A-Fa-f]{6}$/.test(android.color)) {
    throw new NotificationValidationError('Color must be in RRGGBB format', 'android.color', provider);
  }

  // Validate vibration pattern if provided
  if (android.vibratePattern && (!Array.isArray(android.vibratePattern) ||
      !android.vibratePattern.every(num => typeof num === 'number' && num >= 0))) {
    throw new NotificationValidationError('Vibration pattern must be an array of non-negative numbers', 'android.vibratePattern', provider);
  }

  // Validate light settings if provided
  if (android.lightSettings) {
    if (typeof android.lightSettings !== 'object' || android.lightSettings === null) {
      throw new NotificationValidationError('Light settings must be an object', 'android.lightSettings', provider);
    }

    if (!android.lightSettings.color || !/^#[0-9A-Fa-f]{6}$/.test(android.lightSettings.color)) {
      throw new NotificationValidationError('Light color must be in RRGGBB format', 'android.lightSettings.color', provider);
    }

    if (android.lightSettings.onMs !== undefined && (typeof android.lightSettings.onMs !== 'number' || android.lightSettings.onMs < 0)) {
      throw new NotificationValidationError('Light onMs must be a non-negative number', 'android.lightSettings.onMs', provider);
    }

    if (android.lightSettings.offMs !== undefined && (typeof android.lightSettings.offMs !== 'number' || android.lightSettings.offMs < 0)) {
      throw new NotificationValidationError('Light offMs must be a non-negative number', 'android.lightSettings.offMs', provider);
    }
  }

  // Validate payload if provided
  if (android.payload && typeof android.payload !== 'object') {
    throw new NotificationValidationError('Android payload must be an object', 'android.payload', provider);
  }
}

/**
 * Validates web push notification options.
 *
 * @param web - Web notification options
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When web options are invalid
 */
export function validateWebNotification(web: WebNotification, provider: NotificationProvider): void {
  if (!web || typeof web !== 'object') {
    return; // Web options are optional
  }

  // Validate icon URL if provided
  if (web.icon && typeof web.icon === 'string') {
    try {
      new URL(web.icon);
    } catch {
      throw new NotificationValidationError('Invalid icon URL', 'web.icon', provider);
    }
  }

  // Validate badge URL if provided
  if (web.badge && typeof web.badge === 'string') {
    try {
      new URL(web.badge);
    } catch {
      throw new NotificationValidationError('Invalid badge URL', 'web.badge', provider);
    }
  }

  // Validate image URL if provided
  if (web.image && typeof web.image === 'string') {
    try {
      new URL(web.image);
    } catch {
      throw new NotificationValidationError('Invalid image URL', 'web.image', provider);
    }
  }

  // Validate actions if provided
  if (web.actions && (!Array.isArray(web.actions) ||
      !web.actions.every(action =>
        typeof action === 'object' &&
        action !== null &&
        typeof action.action === 'string' &&
        typeof action.title === 'string' &&
        (!action.icon || typeof action.icon === 'string')
      ))) {
    throw new NotificationValidationError('Actions must be an array with action and title properties', 'web.actions', provider);
  }

  // Validate vibration pattern if provided
  if (web.vibrate && (!Array.isArray(web.vibrate) ||
      !web.vibrate.every(num => typeof num === 'number'))) {
    throw new NotificationValidationError('Vibration must be an array of numbers', 'web.vibrate', provider);
  }

  // Validate direction if provided
  if (web.dir && !['auto', 'ltr', 'rtl'].includes(web.dir)) {
    throw new NotificationValidationError('Direction must be one of: auto, ltr, rtl', 'web.dir', provider);
  }

  // Validate timestamp if provided
  if (web.timestamp && (typeof web.timestamp !== 'number' || web.timestamp <= 0)) {
    throw new NotificationValidationError('Timestamp must be a positive number', 'web.timestamp', provider);
  }
}

/**
 * Validates notification data payload.
 *
 * @param data - Data payload to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When data is invalid
 */
export function validateNotificationData(data: Record<string, any>, provider: NotificationProvider): void {
  if (!data || typeof data !== 'object') {
    return; // Data is optional
  }

  // Check payload size
  const dataSize = JSON.stringify(data).length;
  const maxSize = PAYLOAD_LIMITS[provider];

  if (dataSize > maxSize) {
    throw new NotificationValidationError(
      `Data payload too large (${dataSize} bytes, max ${maxSize})`,
      'data',
      provider
    );
  }

  // Validate data structure
  for (const [key, value] of Object.entries(data)) {
    if (typeof key !== 'string' || key.length > 100) {
      throw new NotificationValidationError('Data keys must be strings up to 100 characters', 'data.key', provider);
    }

    if (value === undefined) {
      throw new NotificationValidationError('Data values cannot be undefined', 'data.value', provider);
    }

    // Convert objects and arrays to JSON strings
    if (typeof value === 'object' && value !== null) {
      try {
        JSON.stringify(value);
      } catch {
        throw new NotificationValidationError('Data values must be JSON serializable', 'data.value', provider);
      }
    }
  }
}

/**
 * Validates a complete notification message.
 *
 * @param message - Notification message to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When message is invalid
 */
export function validateNotificationMessage(message: NotificationMessage, provider: NotificationProvider): void {
  if (!message || typeof message !== 'object') {
    throw new NotificationValidationError('Message is required and must be an object', 'message', provider);
  }

  // Validate recipients
  if (!message.to) {
    throw new NotificationValidationError('Recipients (to) are required', 'to', provider);
  }

  if (Array.isArray(message.to)) {
    if (message.to.length === 0) {
      throw new NotificationValidationError('At least one recipient is required', 'to', provider);
    }
    if (message.to.length > 1000) {
      throw new NotificationValidationError('Too many recipients (max 1000)', 'to', provider);
    }
    for (const token of message.to) {
      validateDeviceToken(token, provider);
    }
  } else {
    validateDeviceToken(message.to, provider);
  }

  // Validate title and body
  validateNotificationTitle(message.title, provider);
  validateNotificationBody(message.body, provider);

  // Validate platform-specific options
  if (message.ios) {
    validateIosNotification(message.ios, provider);
  }

  if (message.android) {
    validateAndroidNotification(message.android, provider);
  }

  if (message.web) {
    validateWebNotification(message.web, provider);
  }

  // Validate data payload
  if (message.data) {
    validateNotificationData(message.data, provider);
  }

  // Validate optional fields
  if (message.badge !== undefined && (typeof message.badge !== 'number' || message.badge < 0 || message.badge > 99999)) {
    throw new NotificationValidationError('Badge must be a number between 0 and 99999', 'badge', provider);
  }

  if (message.priority !== undefined && (typeof message.priority !== 'number' || message.priority < 0 || message.priority > 10)) {
    throw new NotificationValidationError('Priority must be a number between 0 and 10', 'priority', provider);
  }

  if (message.ttl !== undefined && (typeof message.ttl !== 'number' || message.ttl < 0)) {
    throw new NotificationValidationError('TTL must be a non-negative number', 'ttl', provider);
  }
}

/**
 * Validates notification send configuration.
 *
 * @param config - Send configuration to validate
 * @param provider - Notification provider
 * @throws {NotificationValidationError} When config is invalid
 */
export function validateNotificationSendConfig(config: NotificationSendConfig, provider: NotificationProvider): void {
  if (!config || typeof config !== 'object') {
    throw new NotificationValidationError('Config is required and must be an object', 'config', provider);
  }

  // Check if single message or batch
  if ('message' in config && config.message) {
    validateNotificationMessage(config.message, provider);
  } else if ('messages' in config && config.messages) {
    if (!Array.isArray(config.messages)) {
      throw new NotificationValidationError('Messages must be an array', 'messages', provider);
    }

    if (config.messages.length === 0) {
      throw new NotificationValidationError('At least one message is required', 'messages', provider);
    }

    if (config.messages.length > 1000) {
      throw new NotificationValidationError('Too many messages (max 1000)', 'messages', provider);
    }

    for (const message of config.messages) {
      validateNotificationMessage(message, provider);
    }
  } else {
    throw new NotificationValidationError('Either message or messages is required', 'config', provider);
  }

  // Validate options
  if (config.opts) {
    if (typeof config.opts !== 'object') {
      throw new NotificationValidationError('Options must be an object', 'opts', provider);
    }

    if (config.opts.timeout !== undefined && (typeof config.opts.timeout !== 'number' || config.opts.timeout <= 0)) {
      throw new NotificationValidationError('Timeout must be a positive number', 'opts.timeout', provider);
    }

    if (config.opts.retries !== undefined && (typeof config.opts.retries !== 'number' || config.opts.retries < 0)) {
      throw new NotificationValidationError('Retries must be a non-negative number', 'opts.retries', provider);
    }
  }
}
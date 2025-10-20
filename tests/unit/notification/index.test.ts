/**
 * Unit tests for notification index
 */

import * as notificationModule from '../../../src/notification/index';

describe('Notification Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(notificationModule.NotificationService).toBeDefined();
    expect(notificationModule.NotificationProvider).toBeDefined();
    expect(notificationModule.FCMProvider).toBeDefined();
    expect(notificationModule.APNSProvider).toBeDefined();
    expect(notificationModule.WebPushProvider).toBeDefined();
    expect(notificationModule.NotificationError).toBeDefined();
    expect(notificationModule.NotificationValidationError).toBeDefined();
    expect(notificationModule.NotificationConfigError).toBeDefined();
    expect(notificationModule.NotificationTokenError).toBeDefined();
    expect(notificationModule.NotificationPayloadTooLargeError).toBeDefined();
    expect(notificationModule.NotificationRateLimitError).toBeDefined();
    expect(notificationModule.NotificationAuthError).toBeDefined();
    expect(notificationModule.NotificationServiceUnavailableError).toBeDefined();
    expect(notificationModule.NotificationTimeoutError).toBeDefined();
    expect(notificationModule.NotificationNetworkError).toBeDefined();
    expect(notificationModule.isNotificationError).toBeDefined();
    expect(notificationModule.isNotificationValidationError).toBeDefined();
    expect(notificationModule.isNotificationConfigError).toBeDefined();
    expect(notificationModule.isNotificationTokenError).toBeDefined();
    expect(notificationModule.isNotificationPayloadTooLargeError).toBeDefined();
    expect(notificationModule.isNotificationRateLimitError).toBeDefined();
    expect(notificationModule.isNotificationAuthError).toBeDefined();
    expect(notificationModule.isNotificationServiceUnavailableError).toBeDefined();
    expect(notificationModule.isNotificationTimeoutError).toBeDefined();
    expect(notificationModule.isNotificationNetworkError).toBeDefined();
    expect(notificationModule.validateDeviceToken).toBeDefined();
    expect(notificationModule.validateNotificationTitle).toBeDefined();
    expect(notificationModule.validateNotificationBody).toBeDefined();
    expect(notificationModule.validateIosNotification).toBeDefined();
    expect(notificationModule.validateAndroidNotification).toBeDefined();
    expect(notificationModule.validateWebNotification).toBeDefined();
    expect(notificationModule.validateNotificationData).toBeDefined();
    expect(notificationModule.validateNotificationMessage).toBeDefined();
    expect(notificationModule.validateNotificationSendConfig).toBeDefined();
    expect(notificationModule.isNotificationSingleMessageConfig).toBeDefined();
    expect(notificationModule.isNotificationBatchMessageConfig).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(notificationModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'NotificationService',
      'NotificationProvider',
      'FCMProvider',
      'APNSProvider',
      'WebPushProvider',
      'NotificationError',
      'NotificationValidationError',
      'NotificationConfigError',
      'NotificationTokenError',
      'NotificationPayloadTooLargeError',
      'NotificationRateLimitError',
      'NotificationAuthError',
      'NotificationServiceUnavailableError',
      'NotificationTimeoutError',
      'NotificationNetworkError',
      'isNotificationError',
      'isNotificationValidationError',
      'isNotificationConfigError',
      'isNotificationTokenError',
      'isNotificationPayloadTooLargeError',
      'isNotificationRateLimitError',
      'isNotificationAuthError',
      'isNotificationServiceUnavailableError',
      'isNotificationTimeoutError',
      'isNotificationNetworkError',
      'validateDeviceToken',
      'validateNotificationTitle',
      'validateNotificationBody',
      'validateIosNotification',
      'validateAndroidNotification',
      'validateWebNotification',
      'validateNotificationData',
      'validateNotificationMessage',
      'validateNotificationSendConfig',
      'isNotificationSingleMessageConfig',
      'isNotificationBatchMessageConfig',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});

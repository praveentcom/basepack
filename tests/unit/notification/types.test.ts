/**
 * Unit tests for notification types
 */

import { 
  NotificationProvider, 
  isNotificationSingleMessageConfig, 
  isNotificationBatchMessageConfig,
  type NotificationSendConfig,
  type NotificationMessage 
} from '../../../src/notification/types';

describe('Notification Types', () => {
  describe('NotificationProvider', () => {
    it('should have correct enum values', () => {
      expect(NotificationProvider.FCM).toBe('fcm');
      expect(NotificationProvider.APNS).toBe('apns');
      expect(NotificationProvider.WEB_PUSH).toBe('web-push');
    });

    it('should have three providers', () => {
      const providers = Object.values(NotificationProvider);
      expect(providers).toHaveLength(3);
      expect(providers).toContain('fcm');
      expect(providers).toContain('apns');
      expect(providers).toContain('web-push');
    });
  });

  describe('Type Guards', () => {
    const testNotification: NotificationMessage = {
      to: 'device-token-123',
      title: 'Test Notification',
      body: 'This is a test notification',
    };

    describe('isNotificationSingleMessageConfig', () => {
      it('should return true for single message config', () => {
        const config: NotificationSendConfig = {
          message: testNotification,
        };

        expect(isNotificationSingleMessageConfig(config)).toBe(true);
      });

      it('should return false for batch message config', () => {
        const config: NotificationSendConfig = {
          messages: [testNotification],
        };

        expect(isNotificationSingleMessageConfig(config)).toBe(false);
      });

      it('should return false for config with undefined message', () => {
        const config = {
          message: undefined,
        } as NotificationSendConfig;

        expect(isNotificationSingleMessageConfig(config)).toBe(false);
      });
    });

    describe('isNotificationBatchMessageConfig', () => {
      it('should return true for batch message config', () => {
        const config: NotificationSendConfig = {
          messages: [testNotification],
        };

        expect(isNotificationBatchMessageConfig(config)).toBe(true);
      });

      it('should return false for single message config', () => {
        const config: NotificationSendConfig = {
          message: testNotification,
        };

        expect(isNotificationBatchMessageConfig(config)).toBe(false);
      });

      it('should return false for config with undefined messages', () => {
        const config = {
          messages: undefined,
        } as NotificationSendConfig;

        expect(isNotificationBatchMessageConfig(config)).toBe(false);
      });
    });
  });
});

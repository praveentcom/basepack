/**
 * Firebase Cloud Messaging (FCM) adapter integration tests
 * @module tests/integration/notification/adapters/fcm.test.ts
 */

import { NotificationService, NotificationProvider } from '../../../../src/notification';
import {
  getFirebaseConfig,
  getTestNotification,
  getTestAndroidToken,
  getTestAndroidNotification,
  credentialCheckers,
  validateTestResults,
  createTestBatchNotifications,
  testProviderHealth
} from '../test-utils';

const hasCredentials = credentialCheckers.fcm();

describe(hasCredentials ? 'FCM Adapter' : 'FCM Adapter (skipped - missing credentials)', () => {
  let service: NotificationService;

  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping FCM integration tests - missing credentials', () => {});
    return;
  }

  beforeEach(() => {
    service = new NotificationService({
      provider: NotificationProvider.FCM,
      config: getFirebaseConfig(),
    });
  });

  afterAll(async () => {
    // Clean up any resources if needed
  });

  describe('Health Check', () => {
    it('should pass health check', async () => {
      await testProviderHealth(service, NotificationProvider.FCM);
    });
  });

  describe('Single Notification', () => {
    it('should send a basic notification', async () => {
      const message = getTestAndroidNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].provider).toBe(NotificationProvider.FCM);
    });

    it('should send notification with custom data', async () => {
      const message = getTestAndroidNotification({
        data: {
          userId: 'test-user-123',
          action: 'open_screen',
          screen: 'messages',
          messageId: 'msg-456'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBeDefined();
    });

    it('should send notification with Android-specific options', async () => {
      const message = getTestAndroidNotification({
        android: {
          channelId: 'high-importance',
          smallIcon: 'ic_notification_important',
          color: '#FF0000',
          priority: 'high',
          vibrate: true,
          vibratePattern: [0, 500, 200, 500],
          lights: true,
          lightSettings: {
            color: '#FF0000',
            onMs: 1000,
            offMs: 1000
          }
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send notification with iOS-specific options', async () => {
      const message = getTestNotification({
        to: getTestAndroidToken(),
        ios: {
          contentAvailable: true,
          mutableContent: true,
          threadId: 'test-thread',
          badge: 5,
          sound: 'default'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send notification with web push options', async () => {
      const message = getTestNotification({
        to: getTestAndroidToken(),
        web: {
          icon: 'https://example.com/icon.png',
          badge: 'https://example.com/badge.png',
          image: 'https://example.com/image.png',
          tag: 'test-notification',
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open',
              icon: 'https://example.com/open-icon.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            }
          ],
          data: {
            url: 'https://example.com/notification'
          }
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Batch Notifications', () => {
    it('should send multiple notifications', async () => {
      const messages = createTestBatchNotifications(3, {
        to: getTestAndroidToken(),
        android: { channelId: 'test-channel' }
      });

      const results = await service.send({ messages });

      validateTestResults(results, 3);
      expect(results.every(r => r.provider === NotificationProvider.FCM)).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      // Use one valid token and one invalid token
      const messages = [
        getTestAndroidNotification({
          to: getTestAndroidToken()
        }),
        getTestAndroidNotification({
          to: 'invalid-fcm-token'
        })
      ];

      const results = await service.send({ messages });

      expect(results).toHaveLength(2);
      // At least one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);

      // One should fail with invalid token error
      const failedResult = results.find(r => !r.success);
      if (failedResult) {
        expect(failedResult.error).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid device token gracefully', async () => {
      const message = getTestAndroidNotification({
        to: 'invalid-fcm-token-12345'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid');
    });

    it('should handle missing required fields', async () => {
      const message = getTestNotification({
        to: getTestAndroidToken(),
        title: '', // Empty title should cause validation error
        body: 'This has a body but no title'
      });

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('title');
    });

    it('should handle oversized payload', async () => {
      // Create a notification with very large data payload
      const largeData: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = 'x'.repeat(1000); // Large string
      }

      const message = getTestAndroidNotification({
        data: largeData
      });

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('large');
    });
  });

  describe('Configuration Validation', () => {
    it('should fail with missing Firebase project ID', () => {
      expect(() => {
        new NotificationService({
          provider: NotificationProvider.FCM,
          config: { /* missing projectId */ }
        });
      }).toThrow('Failed to initialize Firebase');
    });

    it('should accept service account from environment', () => {
      if (process.env.FIREBASE_PROJECT_ID) {
        expect(() => {
          new NotificationService({
            provider: NotificationProvider.FCM,
            config: {
              projectId: process.env.FIREBASE_PROJECT_ID
            }
          });
        }).not.toThrow();
      }
    });
  });

  describe('Provider Features', () => {
    it('should support message options', async () => {
      const message = getTestAndroidNotification();
      const results = await service.send({
        message,
        opts: {
          priority: 1, // High priority
          ttl: 3600, // 1 hour TTL
          retries: 3,
          retryMinTimeout: 1000,
          retryMaxTimeout: 5000,
          metadata: {
            source: 'integration-test',
            testId: 'fcm-features-test'
          }
        }
      });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should support collapse key via tag', async () => {
      const message = getTestAndroidNotification({
        web: { tag: 'collapse-test-key' }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });
});
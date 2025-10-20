/**
 * Web Push adapter integration tests
 * @module tests/integration/notification/adapters/web-push.test.ts
 */

import { NotificationService, NotificationProvider, WebPushProvider } from '../../../../src/notification';
import {
  getWebPushConfig,
  getTestNotification,
  getTestWebPushNotification,
  getTestWebPushSubscription,
  credentialCheckers,
  validateTestResults,
  createTestBatchNotifications,
  testProviderHealth
} from '../test-utils';

const hasCredentials = credentialCheckers['web-push']();

describe(hasCredentials ? 'Web Push Adapter' : 'Web Push Adapter (skipped - missing credentials)', () => {
  let service: NotificationService;
  let provider: WebPushProvider;

  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping Web Push integration tests - missing credentials', () => {});
    return;
  }

  beforeEach(() => {
    service = new NotificationService({
      provider: NotificationProvider.WEB_PUSH,
      config: getWebPushConfig(),
    });

    // Also create a provider instance for direct testing
    provider = new WebPushProvider(getWebPushConfig());
  });

  afterAll(async () => {
    // Clean up any resources if needed
  });

  describe('Health Check', () => {
    it('should pass health check', async () => {
      await testProviderHealth(service, NotificationProvider.WEB_PUSH);
    });
  });

  describe('VAPID Key Management', () => {
    it('should generate VAPID keys', () => {
      const keys = provider.generateVAPIDKeys();

      expect(keys).toHaveProperty('publicKey');
      expect(keys).toHaveProperty('privateKey');
      expect(typeof keys.publicKey).toBe('string');
      expect(typeof keys.privateKey).toBe('string');
      expect(keys.publicKey.length).toBeGreaterThan(0);
      expect(keys.privateKey.length).toBeGreaterThan(0);
    });

    it('should set VAPID keys', () => {
      const keys = provider.generateVAPIDKeys();

      expect(() => {
        provider.setVapidKeys(keys.publicKey, keys.privateKey, 'test@example.com');
      }).not.toThrow();

      const currentKeys = provider.getVapidKeys();
      expect(currentKeys?.publicKey).toBe(keys.publicKey);
      expect(currentKeys?.privateKey).toBe(keys.privateKey);
    });

    it('should set GCM API key', () => {
      expect(() => {
        provider.setGCMApiKey('test-gcm-api-key');
      }).not.toThrow();
    });
  });

  describe('Single Notification', () => {
    it('should send a basic notification', async () => {
      const message = getTestWebPushNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].provider).toBe(NotificationProvider.WEB_PUSH);
    });

    it('should send notification with custom data', async () => {
      const message = getTestWebPushNotification({
        data: {
          userId: 'test-user-123',
          action: 'open_page',
          page: '/messages',
          messageId: 'msg-456'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBeDefined();
    });

    it('should send notification with web-specific options', async () => {
      const message = getTestWebPushNotification({
        web: {
          icon: 'https://example.com/icon-192.png',
          badge: 'https://example.com/badge-72.png',
          image: 'https://example.com/notification-image.jpg',
          tag: 'web-push-test',
          requireInteraction: true,
          silent: false,
          renotify: true,
          vibrate: [200, 100, 200],
          actions: [
            {
              action: 'open',
              title: 'Open Message',
              icon: 'https://example.com/open-icon.png'
            },
            {
              action: 'dismiss',
              title: 'Dismiss'
            },
            {
              action: 'archive',
              title: 'Archive',
              icon: 'https://example.com/archive-icon.png'
            }
          ],
          dir: 'ltr',
          lang: 'en-US',
          timestamp: Date.now(),
          data: {
            url: 'https://example.com/messages/456'
          }
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send silent notification', async () => {
      const message = getTestWebPushNotification({
        silent: true,
        data: {
          backgroundSync: true,
          syncType: 'messages'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send notification with custom TTL', async () => {
      const message = getTestWebPushNotification({
        ttl: 7200 // 2 hours
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Batch Notifications', () => {
    it('should send multiple notifications', async () => {
      const messages = createTestBatchNotifications(3, {
        to: JSON.stringify(getTestWebPushSubscription()),
        web: { tag: 'batch-test' }
      });

      const results = await service.send({ messages });

      validateTestResults(results, 3);
      expect(results.every(r => r.provider === NotificationProvider.WEB_PUSH)).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      // Use one valid subscription and one invalid subscription
      const invalidSubscription = {
        endpoint: 'https://invalid-endpoint.com',
        keys: {
          p256dh: 'invalid-key',
          auth: 'invalid-auth'
        }
      };

      const messages = [
        getTestWebPushNotification({
          to: JSON.stringify(getTestWebPushSubscription())
        }),
        getTestWebPushNotification({
          to: JSON.stringify(invalidSubscription)
        })
      ];

      const results = await service.send({ messages });

      expect(results).toHaveLength(2);
      // At least one should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThan(0);

      // One might fail with invalid endpoint error
      const failedResult = results.find(r => !r.success);
      if (failedResult) {
        expect(failedResult.error).toBeDefined();
      }
    });
  });

  describe('Subscription Validation', () => {
    it('should handle invalid subscription format', async () => {
      const message = getTestNotification({
        to: 'invalid-subscription-string',
        title: 'Test',
        body: 'Test'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid');
    });

    it('should handle missing subscription fields', async () => {
      const incompleteSubscription = {
        endpoint: 'https://example.com',
        // Missing keys
      };

      const message = getTestNotification({
        to: JSON.stringify(incompleteSubscription),
        title: 'Test',
        body: 'Test'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('keys');
    });

    it('should handle invalid endpoint URL', async () => {
      const invalidSubscription = {
        endpoint: 'not-a-valid-url',
        keys: {
          p256dh: 'some-key',
          auth: 'some-auth'
        }
      };

      const message = getTestNotification({
        to: JSON.stringify(invalidSubscription),
        title: 'Test',
        body: 'Test'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('endpoint');
    });
  });

  describe('Error Handling', () => {
    it('should handle expired subscription gracefully', async () => {
      const expiredSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/expired-token',
        keys: {
          p256dh: 'BMfFTqVRgjGk9d-3x3aI1vYz9xv9k-8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f',
          auth: 'v9k8j7h6g5f4d3e2c1b0a9z8y7x6w5v4u3t2s1r0q'
        }
      };

      const message = getTestNotification({
        to: JSON.stringify(expiredSubscription),
        title: 'Test',
        body: 'Test'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      // Might fail with 410 Gone or similar status
      expect(results[0].error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const message = getTestNotification({
        to: JSON.stringify(getTestWebPushSubscription()),
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
      for (let i = 0; i < 500; i++) {
        largeData[`key${i}`] = 'x'.repeat(100); // Large string
      }

      const message = getTestWebPushNotification({
        data: largeData
      });

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('large');
    });
  });

  describe('Configuration Validation', () => {
    it('should work with VAPID keys from environment', () => {
      if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
        expect(() => {
          new NotificationService({
            provider: NotificationProvider.WEB_PUSH,
            config: {
              publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
              privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
              subject: 'test@example.com'
            }
          });
        }).not.toThrow();
      }
    });

    it('should work with email subject', () => {
      if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY && process.env.WEB_PUSH_EMAIL) {
        expect(() => {
          new NotificationService({
            provider: NotificationProvider.WEB_PUSH,
            config: {
              publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
              privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
              email: process.env.WEB_PUSH_EMAIL
            }
          });
        }).not.toThrow();
      }
    });

    it('should work with GCM API key for legacy support', () => {
      expect(() => {
        new WebPushProvider({
          gcmApiKey: 'test-gcm-key'
        });
      }).not.toThrow();
    });
  });

  describe('Provider Features', () => {
    it('should support message options', async () => {
      const message = getTestWebPushNotification();
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
            testId: 'web-push-features-test'
          }
        }
      });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should support different urgency levels', async () => {
      // Test high priority
      const highPriorityMessage = getTestWebPushNotification({
        priority: 1
      });

      const highResults = await service.send({ message: highPriorityMessage });
      validateTestResults(highResults, 1);

      // Test low priority
      const lowPriorityMessage = getTestWebPushNotification({
        priority: 8
      });

      const lowResults = await service.send({ message: lowPriorityMessage });
      validateTestResults(lowResults, 1);
    });

    it('should support custom service worker', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.WEB_PUSH,
        config: {
          ...getWebPushConfig(),
          serviceWorker: '/custom-sw.js'
        }
      });

      const message = getTestWebPushNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Cross-Platform Support', () => {
    it('should handle Android-specific options', async () => {
      const message = getTestWebPushNotification({
        android: {
          channelId: 'web-android-channel',
          smallIcon: 'ic_notification',
          color: '#FF5722',
          priority: 'high'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should handle iOS-specific options', async () => {
      const message = getTestWebPushNotification({
        ios: {
          contentAvailable: true,
          mutableContent: true,
          threadId: 'web-ios-thread',
          badge: 3
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });
});
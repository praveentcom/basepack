/**
 * Apple Push Notification Service (APNS) adapter integration tests
 * @module tests/integration/notification/adapters/apns.test.ts
 */

import { NotificationService, NotificationProvider } from '../../../../src/notification';
import {
  getApnsConfig,
  getTestNotification,
  getTestIosNotification,
  getTestIosToken,
  validateTestResults,
  createTestBatchNotifications,
  testProviderHealth,
  credentialCheckers
} from '../test-utils';

const hasCredentials = credentialCheckers.apns();

describe(hasCredentials ? 'APNS Adapter' : 'APNS Adapter (skipped - missing credentials)', () => {
  let service: NotificationService;

  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping APNS integration tests - missing credentials', () => {});
    return;
  }

  beforeEach(() => {
    service = new NotificationService({
      provider: NotificationProvider.APNS,
      config: getApnsConfig(),
    });
  });

  afterAll(async () => {
    // Clean up any resources if needed
    if (service && 'shutdown' in service.getPrimaryProvider()) {
      (service.getPrimaryProvider() as any).shutdown();
    }
  });

  describe('Health Check', () => {
    it('should pass health check', async () => {
      await testProviderHealth(service, NotificationProvider.APNS);
    });
  });

  describe('Single Notification', () => {
    it('should send a basic notification', async () => {
      const message = getTestIosNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].provider).toBe(NotificationProvider.APNS);
    });

    it('should send notification with custom data', async () => {
      const message = getTestIosNotification({
        data: {
          userId: 'test-user-123',
          action: 'open_screen',
          screen: 'messages',
          messageId: 'msg-456',
          deepLink: 'myapp://messages/456'
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
      expect(results[0].messageId).toBeDefined();
    });

    it('should send notification with iOS-specific options', async () => {
      const message = getTestIosNotification({
        ios: {
          contentAvailable: true,
          mutableContent: true,
          threadId: 'message-thread-123',
          targetContentId: 'message-456',
          badge: 5,
          sound: 'notification-sound.wav',
          category: 'MESSAGE_CATEGORY',
          payload: {
            'custom-key': 'custom-value',
            'another-key': 123
          }
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send silent background notification', async () => {
      const message = getTestIosNotification({
        title: 'Background Sync',
        body: 'Syncing data in background',
        silent: true,
        ios: {
          contentAvailable: true,
          badge: 0 // Don't show badge
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send notification with mutable content', async () => {
      const message = getTestIosNotification({
        ios: {
          mutableContent: true,
          targetContentId: 'notification-extension-target',
          payload: {
            'download-url': 'https://example.com/image.jpg',
            'attachment-type': 'image'
          }
        }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should send notification with custom sound', async () => {
      const message = getTestIosNotification({
        sound: 'custom-sound.aiff',
        ios: {
          category: 'CUSTOM_SOUND_CATEGORY'
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
        to: getTestIosToken(),
        ios: { threadId: 'batch-test-thread' }
      });

      const results = await service.send({ messages });

      validateTestResults(results, 3);
      expect(results.every(r => r.provider === NotificationProvider.APNS)).toBe(true);
    });

    it('should handle mixed success and failure in batch', async () => {
      // Use one valid token and one invalid token
      const messages = [
        getTestIosNotification({
          to: getTestIosToken()
        }),
        getTestIosNotification({
          to: 'invalid-apns-token'
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
        expect(failedResult.error).toContain('token');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid device token gracefully', async () => {
      const message = getTestIosNotification({
        to: 'invalid-apns-token-1234567890abcdef1234567890abcdef12345678'
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('token');
    });

    it('should handle missing required fields', async () => {
      const message = getTestNotification({
        to: getTestIosToken(),
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

      const message = getTestIosNotification({
        data: largeData
      });

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('large');
    });

    it('should handle invalid badge number', async () => {
      const message = getTestIosNotification({
        badge: -1 // Invalid negative badge
      });

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('badge');
    });
  });

  describe('Configuration Validation', () => {
    it('should fail with missing bundle ID', () => {
      expect(() => {
        new NotificationService({
          provider: NotificationProvider.APNS,
          config: { 
            environment: 'development',
            bundleId: '' // Empty bundleId should cause validation error
          }
        });
      }).toThrow();
    });

    it('should accept configuration from environment', () => {
      if (process.env.APNS_BUNDLE_ID) {
        expect(() => {
          new NotificationService({
            provider: NotificationProvider.APNS,
            config: {
              bundleId: process.env.APNS_BUNDLE_ID!,
              environment: 'development' as 'development' | 'production'
            }
          });
        }).not.toThrow();
      }
    });

    it('should require authentication (key or certificate)', () => {
      expect(() => {
        new NotificationService({
          provider: NotificationProvider.APNS,
          config: {
            bundleId: 'com.example.test',
            environment: 'development'
            // No key or certificate
          }
        });
      }).toThrow('Private key or private key path is required');
    });
  });

  describe('Provider Features', () => {
    it('should support message options', async () => {
      const message = getTestIosNotification();
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
            testId: 'apns-features-test'
          }
        }
      });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should support collapse ID via web tag', async () => {
      const message = getTestIosNotification({
        web: { tag: 'collapse-test-key' }
      });

      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should handle different environments', async () => {
      const env = process.env.APNS_ENVIRONMENT || 'development';

      const service = new NotificationService({
        provider: NotificationProvider.APNS,
        config: {
          ...getApnsConfig(),
          environment: env as 'development' | 'production'
        }
      });

      const message = getTestIosNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Authentication Methods', () => {
    it('should work with token authentication', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.APNS,
        config: {
          environment: 'development',
          teamId: process.env.APNS_TEAM_ID!,
          keyId: process.env.APNS_KEY_ID!,
          bundleId: process.env.APNS_BUNDLE_ID!,
          privateKey: process.env.APNS_PRIVATE_KEY!
        }
      });

      const message = getTestIosNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });

    it('should work with certificate authentication', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.APNS,
        config: {
          environment: 'development',
          bundleId: process.env.APNS_BUNDLE_ID!,
          certificate: process.env.APNS_CERTIFICATE!
        }
      });

      const message = getTestIosNotification();
      const results = await service.send({ message });

      validateTestResults(results, 1);
      expect(results[0].success).toBe(true);
    });
  });
});
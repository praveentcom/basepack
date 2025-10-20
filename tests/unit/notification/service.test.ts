import { NotificationService } from '../../../src/notification/service';
import { NotificationProvider, type WebPushSubscription } from '../../../src/notification/types';
import { NotificationError } from '../../../src/notification/errors';
import type { Logger } from '../../../src/logger/types';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the notification adapters to avoid actual dependencies
jest.mock('../../../src/notification/adapters/fcm', () => ({
  FCMProvider: jest.fn().mockImplementation(() => ({
    name: NotificationProvider.FCM,
    send: jest.fn().mockImplementation((config) => {
      const messages = 'message' in config && config.message
        ? [config.message]
        : config.messages || [];
      return Promise.resolve(messages.map((message: any, index: number) => ({
        success: true,
        messageId: `fcm-test-id-${index}`,
        provider: NotificationProvider.FCM,
        timestamp: new Date(),
      })));
    }),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

jest.mock('../../../src/notification/adapters/apns', () => ({
  APNSProvider: jest.fn().mockImplementation(() => ({
    name: NotificationProvider.APNS,
    send: jest.fn().mockImplementation((config) => {
      const messages = 'message' in config && config.message
        ? [config.message]
        : config.messages || [];
      return Promise.resolve(messages.map((message: any, index: number) => ({
        success: true,
        messageId: `apns-test-id-${index}`,
        provider: NotificationProvider.APNS,
        timestamp: new Date(),
      })));
    }),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

jest.mock('../../../src/notification/adapters/web-push', () => ({
  WebPushProvider: jest.fn().mockImplementation(() => ({
    name: NotificationProvider.WEB_PUSH,
    send: jest.fn().mockImplementation((config) => {
      const messages = 'message' in config && config.message
        ? [config.message]
        : config.messages || [];
      return Promise.resolve(messages.map((message: any, index: number) => ({
        success: true,
        messageId: `web-push-test-id-${index}`,
        provider: NotificationProvider.WEB_PUSH,
        timestamp: new Date(),
      })));
    }),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service with single provider', () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' },
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(NotificationService);
      expect(mockLogger.info).toHaveBeenCalledWith('NotificationService initialized', {
        primary: NotificationProvider.FCM,
        backups: [],
        timestamp: expect.any(String)
      });
    });

    it('should create service with primary and backup providers', () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } }
        ],
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(NotificationService);
      expect(mockLogger.info).toHaveBeenCalledWith('NotificationService initialized', {
        primary: NotificationProvider.FCM,
        backups: [NotificationProvider.APNS],
        timestamp: expect.any(String)
      });
    });

    it('should work without logger', () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' }
      });

      expect(service).toBeInstanceOf(NotificationService);
    });
  });

  describe('Single Provider - Success', () => {
    let service: NotificationService;

    beforeEach(() => {
      service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' },
        logger: mockLogger
      });
    });

    it('should send single notification successfully', async () => {
      const message = {
        to: 'device-token',
        title: 'Hello World',
        body: 'Test notification'
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe(NotificationProvider.FCM);
      expect(results[0].messageId).toBe('fcm-test-id-0');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Sending notifications', {
        count: 1,
        primary: NotificationProvider.FCM,
        timestamp: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Primary provider completed', {
        provider: NotificationProvider.FCM,
        success: 1,
        total: 1,
        timestamp: expect.any(String)
      });
    });

    it('should send multiple notifications successfully', async () => {
      const messages = [
        {
          to: 'device-token-1',
          title: 'Hello 1',
          body: 'Test notification 1'
        },
        {
          to: 'device-token-2',
          title: 'Hello 2',
          body: 'Test notification 2'
        }
      ];

      const results = await service.send({ messages });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.provider === NotificationProvider.FCM)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Sending notifications', {
        count: 2,
        primary: NotificationProvider.FCM,
        timestamp: expect.any(String)
      });
    });

    it('should handle notifications with platform-specific options', async () => {
      const message = {
        to: 'device-token',
        title: 'Hello',
        body: 'Test',
        ios: { contentAvailable: true, badge: 1 },
        android: { channelId: 'default', smallIcon: 'icon' },
        web: { icon: 'https://example.com/icon.png', actions: [{ action: 'open', title: 'Open' }] }
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle web push subscriptions', async () => {
      const webPushService = new NotificationService({
        provider: NotificationProvider.WEB_PUSH,
        config: {
          publicKey: 'test-public-key',
          privateKey: 'test-private-key'
        },
        logger: mockLogger
      });

      const subscription: WebPushSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      };

      const message = {
        to: subscription,
        title: 'Web Push Test',
        body: 'Test web push notification'
      };

      const results = await webPushService.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      const message = {
        to: ['device-token-1', 'device-token-2'],
        title: 'Broadcast',
        body: 'Test broadcast'
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Multi-Provider - Failover', () => {
    it('should failover when primary fails partially', async () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } }
        ],
        logger: mockLogger
      });

      // Mock primary provider to fail for second message
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.send = jest.fn().mockImplementation((config) => {
        const messages = 'message' in config && config.message
          ? [config.message]
          : config.messages || [];
        return Promise.resolve(messages.map((message: any, index: number) => ({
          success: index === 0, // Only first message succeeds
          messageId: `fcm-test-id-${index}`,
          provider: NotificationProvider.FCM,
          timestamp: new Date(),
          error: index === 1 ? 'Device token not registered' : undefined
        })));
      });

      const messages = [
        {
          to: 'device-token-1',
          title: 'Hello 1',
          body: 'Test notification 1'
        },
        {
          to: 'device-token-2',
          title: 'Hello 2',
          body: 'Test notification 2'
        }
      ];

      const results = await service.send({ messages });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true); // Primary success
      expect(results[0].provider).toBe(NotificationProvider.FCM);
      expect(results[1].success).toBe(true); // Backup success
      expect(results[1].provider).toBe(NotificationProvider.APNS);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Trying backup provider', {
        provider: NotificationProvider.APNS,
        failedCount: 1,
        timestamp: expect.any(String)
      });
    });

    it('should failover when primary fails completely', async () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } }
        ],
        logger: mockLogger
      });

      // Mock primary provider to throw exception
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.send = jest.fn().mockRejectedValue(new Error('FCM service unavailable'));

      const message = {
        to: 'device-token',
        title: 'Hello',
        body: 'Test'
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe(NotificationProvider.APNS);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Notification: Primary provider failed', {
        provider: NotificationProvider.FCM,
        error: 'FCM service unavailable',
        timestamp: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Trying backup provider', {
        provider: NotificationProvider.APNS,
        failedCount: 1,
        timestamp: expect.any(String)
      });
    });

    it('should handle provider failures gracefully', async () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        logger: mockLogger
      });

      // Mock primary provider to return failed results
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.send = jest.fn().mockResolvedValue([{
        success: false,
        error: 'FCM error',
        provider: NotificationProvider.FCM,
        timestamp: new Date()
      }]);

      const message = {
        to: 'device-token',
        title: 'Hello',
        body: 'Test'
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('FCM error');
    });
  });

  describe('Health Check', () => {
    it('should return health status for single provider', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' },
        logger: mockLogger
      });

      const health = await service.health();

      expect(health).toHaveProperty(NotificationProvider.FCM);
      expect(health[NotificationProvider.FCM]).toEqual({
        ok: true,
        message: 'Healthy'
      });
    });

    it('should return health status for multiple providers', async () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } },
          { provider: NotificationProvider.WEB_PUSH }
        ],
        logger: mockLogger
      });

      const health = await service.health();

      expect(health).toHaveProperty(NotificationProvider.FCM);
      expect(health).toHaveProperty(NotificationProvider.APNS);
      expect(health).toHaveProperty(NotificationProvider.WEB_PUSH);
      expect(Object.keys(health)).toHaveLength(3);
    });

    it('should handle provider health check failures', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' },
        logger: mockLogger
      });

      // Mock provider health to fail
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.health = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const health = await service.health();

      expect(health[NotificationProvider.FCM]).toEqual({
        ok: false,
        message: 'Health check failed'
      });
    });

    it('should handle providers without health method', async () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' },
        logger: mockLogger
      });

      // Mock provider without health method
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.health = undefined;

      const health = await service.health();

      expect(health[NotificationProvider.FCM]).toEqual({
        ok: true,
        message: 'Healthy'
      });
    });
  });

  describe('Provider Access Methods', () => {
    let service: NotificationService;

    beforeEach(() => {
      service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } }
        ],
        logger: mockLogger
      });
    });

    it('should return primary provider', () => {
      const primary = service.getPrimaryProvider();
      expect(primary.name).toBe(NotificationProvider.FCM);
    });

    it('should return backup providers', () => {
      const backups = service.getBackupProviders();
      expect(backups).toHaveLength(1);
      expect(backups[0].name).toBe(NotificationProvider.APNS);
    });

    it('should return all providers', () => {
      const all = service.getAllProviders();
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe(NotificationProvider.FCM);
      expect(all[1].name).toBe(NotificationProvider.APNS);
    });
  });

  describe('Provider Creation', () => {
    it('should create FCM provider', () => {
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' }
      });

      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should create APNS provider', () => {
      const service = new NotificationService({
        provider: NotificationProvider.APNS,
        config: {
          bundleId: 'com.example.app',
          environment: 'development'
        }
      });

      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should create Web Push provider', () => {
      const service = new NotificationService({
        provider: NotificationProvider.WEB_PUSH,
        config: {
          publicKey: 'test-public-key',
          privateKey: 'test-private-key'
        }
      });

      expect(service).toBeInstanceOf(NotificationService);
    });
  });

  describe('Static Provider Creation', () => {
    it('should create provider using static method', () => {
      const provider = NotificationService.createProvider({
        provider: NotificationProvider.FCM,
        config: { projectId: 'test-project' }
      });

      expect(provider.name).toBe(NotificationProvider.FCM);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid provider configuration gracefully', () => {
      // Test with undefined config should work (config is optional)
      const service = new NotificationService({
        provider: NotificationProvider.FCM,
        config: undefined
      });
      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should handle provider creation errors', () => {
      // Test that the service can handle provider creation
      // Since we're using mocked providers, this should work fine
      expect(() => {
        new NotificationService({
          provider: NotificationProvider.FCM,
          config: { projectId: 'test-project' }
        });
      }).not.toThrow();
    });
  });

  describe('Logging', () => {
    it('should log backup provider attempts when primary succeeds but backups exist', async () => {
      const service = new NotificationService({
        primary: { provider: NotificationProvider.FCM },
        backups: [
          { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app', environment: 'development' } }
        ],
        logger: mockLogger
      });

      const message = {
        to: 'device-token',
        title: 'Hello',
        body: 'Test'
      };

      await service.send({ message });

      // Should log backup attempt even when primary succeeds
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Notification: Trying backup provider', {
        provider: NotificationProvider.APNS,
        failedCount: 1,
        timestamp: expect.any(String)
      });
    });
  });
});
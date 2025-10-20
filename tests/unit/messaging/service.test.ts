import { MessagingService } from '../../../src/messaging/service';
import { MessagingProvider } from '../../../src/messaging/types';
import { MessagingError, MessagingProviderError } from '../../../src/messaging/errors';
import type { Logger } from '../../../src/logger/types';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the messaging adapters to avoid actual dependencies
jest.mock('../../../src/messaging/adapters/twilio', () => ({
  TwilioProvider: jest.fn().mockImplementation(() => ({
    name: MessagingProvider.TWILIO,
    sendSMS: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'twilio-sms-test-id',
      provider: MessagingProvider.TWILIO,
      timestamp: new Date(),
    }),
    sendWhatsApp: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'twilio-wa-test-id',
      provider: MessagingProvider.TWILIO,
      timestamp: new Date(),
    }),
    sendRCS: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'twilio-rcs-test-id',
      provider: MessagingProvider.TWILIO,
      timestamp: new Date(),
    }),
    getMessageStatus: jest.fn().mockResolvedValue({
      messageId: 'test-id',
      status: 'delivered',
      provider: MessagingProvider.TWILIO,
      timestamp: new Date(),
    }),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

jest.mock('../../../src/messaging/adapters/sns', () => ({
  SNSProvider: jest.fn().mockImplementation(() => ({
    name: MessagingProvider.SNS,
    sendSMS: jest.fn().mockResolvedValue({
      success: true,
      messageId: 'sns-sms-test-id',
      provider: MessagingProvider.SNS,
      timestamp: new Date(),
    }),
    sendWhatsApp: jest.fn().mockRejectedValue(new Error('WhatsApp not supported by SNS')),
    sendRCS: jest.fn().mockRejectedValue(new Error('RCS not supported by SNS')),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

describe('MessagingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service with single provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(MessagingService);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Messaging: Initializing service', {
        provider: MessagingProvider.TWILIO
      });
    });

    it('should create service with primary and backup providers', () => {
      const service = new MessagingService({
        primary: { provider: MessagingProvider.TWILIO },
        backups: [
          { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
        ],
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(MessagingService);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Messaging: Initializing service', {
        primary: MessagingProvider.TWILIO,
        backups: [MessagingProvider.SNS]
      });
    });

    it('should use console logger when none provided', () => {
      const service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });
  });

  describe('SMS Sending', () => {
    let service: MessagingService;

    beforeEach(() => {
      service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });
    });

    it('should send SMS successfully', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello World!'
      };

      const result = await service.sendSMS({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
      expect(result.messageId).toBe('twilio-sms-test-id');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Sending SMS', {
        from: '+14155552671',
        to: '+14155552672'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Message sent successfully', {
        provider: MessagingProvider.TWILIO,
        messageType: 'SMS',
        messageId: 'twilio-sms-test-id'
      });
    });

    it('should send SMS with media URLs', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Check out this image!',
        mediaUrls: ['https://example.com/image.jpg']
      };

      const result = await service.sendSMS({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
    });

    it('should skip validation when disabled', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Test'
      };

      const result = await service.sendSMS({
        message,
        opts: { validateBeforeSend: false }
      });

      expect(result.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      const invalidMessage = {
        from: 'invalid',
        to: '+14155552672',
        body: 'Test'
      };

      await expect(service.sendSMS({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Validation failed', {
        error: expect.any(Error)
      });
    });
  });

  describe('WhatsApp Sending', () => {
    let service: MessagingService;

    beforeEach(() => {
      service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });
    });

    it('should send WhatsApp message successfully', async () => {
      const message = {
        from: 'whatsapp:+14155552671',
        to: 'whatsapp:+14155552672',
        body: 'Hello via WhatsApp!'
      };

      const result = await service.sendWhatsApp({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
      expect(result.messageId).toBe('twilio-wa-test-id');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Sending WhatsApp', {
        from: 'whatsapp:+14155552671',
        to: 'whatsapp:+14155552672'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Message sent successfully', {
        provider: MessagingProvider.TWILIO,
        messageType: 'WhatsApp',
        messageId: 'twilio-wa-test-id'
      });
    });

    it('should send WhatsApp message with media', async () => {
      const message = {
        from: 'whatsapp:+14155552671',
        to: 'whatsapp:+14155552672',
        body: 'Check out this video!',
        mediaUrls: ['https://example.com/video.mp4']
      };

      const result = await service.sendWhatsApp({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
    });

    it('should send WhatsApp template message', async () => {
      const message = {
        from: 'whatsapp:+14155552671',
        to: 'whatsapp:+14155552672',
        body: '',
        templateName: 'welcome_message',
        templateVariables: { name: 'John', code: '12345' }
      };

      const result = await service.sendWhatsApp({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
    });

    it('should handle validation errors', async () => {
      const invalidMessage = {
        from: 'invalid',
        to: 'whatsapp:+14155552672',
        body: 'Test'
      };

      await expect(service.sendWhatsApp({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Validation failed', {
        error: expect.any(Error)
      });
    });
  });

  describe('RCS Sending', () => {
    let service: MessagingService;

    beforeEach(() => {
      service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });
    });

    it('should send RCS message successfully', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello via RCS!',
        suggestions: [
          { type: 'reply' as const, text: 'Yes' },
          { type: 'reply' as const, text: 'No' }
        ]
      };

      const result = await service.sendRCS({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
      expect(result.messageId).toBe('twilio-rcs-test-id');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Sending RCS', {
        from: '+14155552671',
        to: '+14155552672'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Message sent successfully', {
        provider: MessagingProvider.TWILIO,
        messageType: 'RCS',
        messageId: 'twilio-rcs-test-id'
      });
    });

    it('should send RCS message with media', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello via RCS!',
        mediaUrls: ['https://example.com/image.jpg']
      };

      const result = await service.sendRCS({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.TWILIO);
    });

    it('should handle validation errors', async () => {
      const invalidMessage = {
        from: 'invalid',
        to: '+14155552672',
        body: 'Test'
      };

      await expect(service.sendRCS({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Validation failed', {
        error: expect.any(Error)
      });
    });
  });

  describe('Multi-Provider - Failover', () => {
    it('should failover for SMS when primary fails', async () => {
      const service = new MessagingService({
        primary: { provider: MessagingProvider.TWILIO },
        backups: [
          { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
        ],
        logger: mockLogger
      });

      // Mock primary provider to fail
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.sendSMS = jest.fn().mockRejectedValue(new Error('Twilio error'));

      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello World!'
      };

      const result = await service.sendSMS({ message });

      expect(result.success).toBe(true);
      expect(result.provider).toBe(MessagingProvider.SNS);
      expect(result.messageId).toBe('sns-sms-test-id');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Messaging: Failing over to backup provider', {
        from: MessagingProvider.TWILIO,
        to: MessagingProvider.SNS,
        messageType: 'SMS'
      });
    });

    it('should throw when all providers fail', async () => {
      const service = new MessagingService({
        primary: { provider: MessagingProvider.TWILIO },
        backups: [
          { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
        ],
        logger: mockLogger
      });

      // Mock both providers to fail
      const primaryProvider = (service as any).primaryProvider;
      const backupProvider = (service as any).backupProviders[0];

      primaryProvider.sendSMS = jest.fn().mockRejectedValue(new Error('Twilio error'));
      backupProvider.sendSMS = jest.fn().mockRejectedValue(new Error('SNS error'));

      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello World!'
      };

      await expect(service.sendSMS({ message })).rejects.toThrow(MessagingProviderError);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: All providers failed', {
        messageType: 'SMS',
        errors: [
          { provider: MessagingProvider.TWILIO, error: 'Twilio error' },
          { provider: MessagingProvider.SNS, error: 'SNS error' }
        ]
      });
    });
  });

  describe('Message Status', () => {
    let service: MessagingService;

    beforeEach(() => {
      service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });
    });

    it('should get message status successfully', async () => {
      const status = await service.getMessageStatus('test-id');

      expect(status).toBeDefined();
      expect(status?.messageId).toBe('test-id');
      expect(status?.status).toBe('delivered');
      expect(status?.provider).toBe(MessagingProvider.TWILIO);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Messaging: Getting message status', {
        messageId: 'test-id',
        provider: MessagingProvider.TWILIO
      });
    });

    it('should handle provider without status support', async () => {
      const service = new MessagingService({
        provider: MessagingProvider.SNS,
        config: { region: 'us-east-1' },
        logger: mockLogger
      });

      const status = await service.getMessageStatus('test-id');

      expect(status).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Basepack Messaging: Provider does not support status tracking',
        { provider: MessagingProvider.SNS }
      );
    });

    it('should handle status check errors gracefully', async () => {
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.getMessageStatus = jest.fn().mockRejectedValue(new Error('API error'));

      const status = await service.getMessageStatus('test-id');

      expect(status).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Failed to get message status', {
        messageId: 'test-id',
        provider: MessagingProvider.TWILIO,
        error: expect.any(Error)
      });
    });

    it('should use specified provider when provided', async () => {
      const service = new MessagingService({
        primary: { provider: MessagingProvider.TWILIO },
        backups: [
          { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
        ],
        logger: mockLogger
      });

      const status = await service.getMessageStatus('test-id', MessagingProvider.SNS);

      expect(status).toBeNull(); // SNS doesn't support status tracking
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Messaging: Getting message status', {
        messageId: 'test-id',
        provider: MessagingProvider.SNS
      });
    });
  });

  describe('Health Check', () => {
    it('should return health status for single provider', async () => {
      const service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' },
        logger: mockLogger
      });

      const health = await service.health();

      expect(health.ok).toBe(true);
      expect(health.provider).toBe(MessagingProvider.TWILIO);
      expect(health.primary).toEqual({ ok: true });
      expect(health.backups).toEqual([]);
    });

    it('should return health status for multiple providers', async () => {
      const service = new MessagingService({
        primary: { provider: MessagingProvider.TWILIO },
        backups: [
          { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
        ],
        logger: mockLogger
      });

      const health = await service.health();

      expect(health.ok).toBe(true);
      expect(health.provider).toBe(MessagingProvider.TWILIO);
      expect(health.primary).toEqual({ ok: true });
      expect(health.backups).toHaveLength(1);
      expect(health.backups[0]).toEqual({
        name: MessagingProvider.SNS,
        health: { ok: true, message: 'Healthy' }
      });
    });

    it('should handle providers without health method', async () => {
      const service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        logger: mockLogger
      });

      // Mock provider without health method
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.health = undefined;

      const health = await service.health();

      expect(health.ok).toBe(true);
      expect(health.primary.ok).toBe(true);
    });
  });

  describe('Provider Creation', () => {
    it('should create Twilio provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        config: { accountSid: 'test-sid', authToken: 'test-token' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create SNS provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.SNS,
        config: { region: 'us-east-1' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create Meta provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.META,
        config: { phoneNumberId: 'test-id', accessToken: 'test-token' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create MSG91 provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.MSG91,
        config: { authKey: 'test-key' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create Vonage provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.VONAGE,
        config: { apiKey: 'test-key', apiSecret: 'test-secret' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create Plivo provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.PLIVO,
        config: { authId: 'test-id', authToken: 'test-token' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });

    it('should create MessageBird provider', () => {
      const service = new MessagingService({
        provider: MessagingProvider.MESSENGERBIRD,
        config: { accessKey: 'test-key' }
      });

      expect(service).toBeInstanceOf(MessagingService);
    });
  });

  describe('Error Handling', () => {
    let service: MessagingService;

    beforeEach(() => {
      service = new MessagingService({
        provider: MessagingProvider.TWILIO,
        logger: mockLogger
      });
    });

    it('should handle provider exceptions gracefully', async () => {
      const message = {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Test'
      };

      // Mock provider to throw an exception
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.sendSMS = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.sendSMS({ message })).rejects.toThrow(MessagingProviderError);
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Provider exception', {
        provider: MessagingProvider.TWILIO,
        messageType: 'SMS',
        error: 'Network error'
      });
    });

    it('should log validation errors properly', async () => {
      const invalidMessage = {
        from: 'invalid',
        to: '+14155552672',
        body: 'Test'
      };

      await expect(service.sendSMS({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Messaging: Validation failed', {
        error: expect.any(Error)
      });
    });
  });
});
import { EmailService } from '../../../src/email/service';
import { EmailProvider } from '../../../src/email/types';
import { EmailError, EmailProviderError } from '../../../src/email/errors';
import type { Logger } from '../../../src/logger/types';

// Mock logger
const mockLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock the email adapters to avoid actual dependencies
jest.mock('../../../src/email/adapters/ses', () => ({
  SESProvider: jest.fn().mockImplementation(() => ({
    name: EmailProvider.SES,
    send: jest.fn().mockImplementation((config) => {
      const messages = 'message' in config && config.message
        ? [config.message]
        : config.messages || [];
      return Promise.resolve(messages.map((message: any, index: number) => ({
        success: true,
        messageId: `ses-test-id-${index}`,
        provider: EmailProvider.SES,
        timestamp: new Date(),
      })));
    }),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

jest.mock('../../../src/email/adapters/sendgrid', () => ({
  SendGridProvider: jest.fn().mockImplementation(() => ({
    name: EmailProvider.SENDGRID,
    send: jest.fn().mockResolvedValue([{
      success: true,
      messageId: 'sg-test-id',
      provider: EmailProvider.SENDGRID,
      timestamp: new Date(),
    }]),
    health: jest.fn().mockResolvedValue({ ok: true, message: 'Healthy' }),
  })),
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create service with single provider', () => {
      const service = new EmailService({
        provider: EmailProvider.SES,
        config: { region: 'us-east-1' },
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(EmailService);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Email: Initializing service', {
        provider: EmailProvider.SES
      });
    });

    it('should create service with primary and backup providers', () => {
      const service = new EmailService({
        primary: { provider: EmailProvider.SES },
        backups: [
          { provider: EmailProvider.SENDGRID, config: { apiKey: 'test-key' } }
        ],
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(EmailService);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Email: Initializing service', {
        primary: EmailProvider.SES,
        backups: [EmailProvider.SENDGRID]
      });
    });

    it('should use console logger when none provided', () => {
      const service = new EmailService({
        provider: EmailProvider.SES,
        config: { region: 'us-east-1' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('Single Provider - Success', () => {
    let service: EmailService;

    beforeEach(() => {
      service = new EmailService({
        provider: EmailProvider.SES,
        config: { region: 'us-east-1' },
        logger: mockLogger
      });
    });

    it('should send single email successfully', async () => {
      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>Hello World</p>'
      };

      const results = await service.send({ message });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].provider).toBe(EmailProvider.SES);
      expect(results[0].messageId).toBe('ses-test-id-0');
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Email: Sending message', {
        messageCount: 1,
        to: ['recipient@example.com'],
        subject: ['Test Email']
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Email: Message sent successfully', {
        provider: EmailProvider.SES,
        messageCount: 1,
        messageIds: ['ses-test-id-0']
      });
    });

    it('should send multiple emails successfully', async () => {
      const messages = [
        {
          from: 'sender@example.com',
          to: 'recipient1@example.com',
          subject: 'Test Email 1',
          html: '<p>Hello World 1</p>'
        },
        {
          from: 'sender@example.com',
          to: 'recipient2@example.com',
          subject: 'Test Email 2',
          html: '<p>Hello World 2</p>'
        }
      ];

      const results = await service.send({ messages });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.provider === EmailProvider.SES)).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Email: Sending message', {
        messageCount: 2,
        to: ['recipient1@example.com', 'recipient2@example.com'],
        subject: ['Test Email 1', 'Test Email 2']
      });
    });

    it('should skip validation when disabled', async () => {
      const message = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      const results = await service.send({
        message,
        opts: { validateBeforeSend: false }
      });

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe('Multi-Provider - Configuration', () => {
    it('should create service with backup providers', () => {
      const service = new EmailService({
        primary: { provider: EmailProvider.SES },
        backups: [
          { provider: EmailProvider.SENDGRID, config: { apiKey: 'test-key' } }
        ],
        logger: mockLogger
      });

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('Health Check', () => {
    it('should return health status for single provider', async () => {
      const service = new EmailService({
        provider: EmailProvider.SES,
        config: { region: 'us-east-1' },
        logger: mockLogger
      });

      const health = await service.health();

      expect(health.ok).toBe(true);
      expect(health.provider).toBe(EmailProvider.SES);
      expect(health.primary).toEqual({ ok: true, message: 'Healthy' });
      expect(health.backups).toEqual([]);
    });

    it('should handle providers without health method', async () => {
      const service = new EmailService({
        provider: EmailProvider.SES,
        logger: mockLogger
      });

      // Mock provider without health method by accessing private property
      const primaryProvider = (service as any).primaryProvider;
      primaryProvider.health = undefined;

      const health = await service.health();

      expect(health.ok).toBe(true);
      expect(health.primary.ok).toBe(true);
    });
  });

  describe('Provider Creation', () => {
    it('should create SES provider', () => {
      const service = new EmailService({
        provider: EmailProvider.SES,
        config: { region: 'us-west-2' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create SendGrid provider', () => {
      const service = new EmailService({
        provider: EmailProvider.SENDGRID,
        config: { apiKey: 'test-key' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create Mailgun provider', () => {
      const service = new EmailService({
        provider: EmailProvider.MAILGUN,
        config: { apiKey: 'test-key', domain: 'test.com' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create Resend provider', () => {
      const service = new EmailService({
        provider: EmailProvider.RESEND,
        config: { apiKey: 'test-key' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create Postmark provider', () => {
      const service = new EmailService({
        provider: EmailProvider.POSTMARK,
        config: { serverToken: 'test-token' }
      });

      expect(service).toBeInstanceOf(EmailService);
    });

    it('should create SMTP provider', () => {
      const service = new EmailService({
        provider: EmailProvider.SMTP,
        config: { host: 'smtp.example.com', port: 587 }
      });

      expect(service).toBeInstanceOf(EmailService);
    });
  });

  describe('Error Handling', () => {
    let service: EmailService;

    beforeEach(() => {
      service = new EmailService({
        provider: EmailProvider.SES,
        logger: mockLogger
      });
    });

    it('should handle validation errors', async () => {
      const invalidMessage = {
        from: 'invalid-email',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      await expect(service.send({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Email: Validation failed', {
        error: expect.any(Error)
      });
    });

    it('should log validation errors properly', async () => {
      const invalidMessage = {
        from: 'invalid-email',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      };

      await expect(service.send({ message: invalidMessage })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Email: Validation failed', {
        error: expect.any(Error)
      });
    });
  });
});
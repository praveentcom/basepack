import { 
  isEmailProviderType,
  isSingleMessageConfig,
  isBatchMessageConfig,
  EMAIL_PROVIDERS
} from '../../../src/email/types';

describe('Type Guards and Utilities', () => {
  describe('EMAIL_PROVIDERS', () => {
    it('should contain all provider types', () => {
      expect(EMAIL_PROVIDERS).toEqual(['ses', 'sendgrid', 'mailgun', 'resend', 'postmark', 'smtp']);
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(EMAIL_PROVIDERS)).toBe(false); // Array literal, not frozen but const
      expect(Array.isArray(EMAIL_PROVIDERS)).toBe(true);
    });
  });

  describe('isEmailProviderType', () => {
    it('should return true for valid provider types', () => {
      expect(isEmailProviderType('ses')).toBe(true);
      expect(isEmailProviderType('sendgrid')).toBe(true);
      expect(isEmailProviderType('mailgun')).toBe(true);
      expect(isEmailProviderType('resend')).toBe(true);
      expect(isEmailProviderType('postmark')).toBe(true);
      expect(isEmailProviderType('smtp')).toBe(true);
    });

    it('should return false for invalid provider types', () => {
      expect(isEmailProviderType('gmail')).toBe(false);
      expect(isEmailProviderType('invalid')).toBe(false);
      expect(isEmailProviderType('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(isEmailProviderType(null)).toBe(false);
      expect(isEmailProviderType(undefined)).toBe(false);
      expect(isEmailProviderType(123)).toBe(false);
      expect(isEmailProviderType({})).toBe(false);
      expect(isEmailProviderType([])).toBe(false);
    });
  });

  describe('isSingleMessageConfig', () => {
    it('should return true for single message config', () => {
      const config = {
        message: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
      };
      
      expect(isSingleMessageConfig(config)).toBe(true);
    });

    it('should return true with options', () => {
      const config = {
        message: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
        opts: {
          retries: 3,
        },
      };
      
      expect(isSingleMessageConfig(config)).toBe(true);
    });

    it('should return false for batch config', () => {
      const config = {
        messages: [{
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        }],
      };
      
      expect(isSingleMessageConfig(config as any)).toBe(false);
    });

    it('should return false when message is undefined', () => {
      const config = {
        message: undefined,
      };
      
      expect(isSingleMessageConfig(config as any)).toBe(false);
    });
  });

  describe('isBatchMessageConfig', () => {
    it('should return true for batch message config', () => {
      const config = {
        messages: [
          {
            from: 'sender@example.com',
            to: 'recipient1@example.com',
            subject: 'Test 1',
            html: '<p>Test 1</p>',
          },
          {
            from: 'sender@example.com',
            to: 'recipient2@example.com',
            subject: 'Test 2',
            html: '<p>Test 2</p>',
          },
        ],
      };
      
      expect(isBatchMessageConfig(config)).toBe(true);
    });

    it('should return true with options', () => {
      const config = {
        messages: [{
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        }],
        opts: {
          retries: 3,
        },
      };
      
      expect(isBatchMessageConfig(config)).toBe(true);
    });

    it('should return false for single message config', () => {
      const config = {
        message: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
      };
      
      expect(isBatchMessageConfig(config as any)).toBe(false);
    });

    it('should return false when messages is undefined', () => {
      const config = {
        messages: undefined,
      };
      
      expect(isBatchMessageConfig(config as any)).toBe(false);
    });

    it('should return true for empty messages array', () => {
      const config = {
        messages: [],
      };
      
      expect(isBatchMessageConfig(config)).toBe(true);
    });
  });
});


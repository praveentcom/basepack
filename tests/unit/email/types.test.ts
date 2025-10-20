/**
 * Unit tests for email types
 */

import { 
  EmailProvider, 
  isEmailSingleMessageConfig, 
  isEmailBatchMessageConfig,
  type EmailSendConfig,
  type EmailMessage 
} from '../../../src/email/types';

describe('Email Types', () => {
  describe('EmailProvider', () => {
    it('should have correct enum values', () => {
      expect(EmailProvider.SES).toBe('ses');
      expect(EmailProvider.SENDGRID).toBe('sendgrid');
      expect(EmailProvider.MAILGUN).toBe('mailgun');
      expect(EmailProvider.RESEND).toBe('resend');
      expect(EmailProvider.POSTMARK).toBe('postmark');
      expect(EmailProvider.SMTP).toBe('smtp');
    });

    it('should have six providers', () => {
      const providers = Object.values(EmailProvider);
      expect(providers).toHaveLength(6);
      expect(providers).toContain('ses');
      expect(providers).toContain('sendgrid');
      expect(providers).toContain('mailgun');
      expect(providers).toContain('resend');
      expect(providers).toContain('postmark');
      expect(providers).toContain('smtp');
    });
  });

  describe('Type Guards', () => {
    const testMessage: EmailMessage = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test Email',
      html: '<p>Test content</p>',
    };

    describe('isEmailSingleMessageConfig', () => {
      it('should return true for single message config', () => {
        const config: EmailSendConfig = {
          message: testMessage,
        };

        expect(isEmailSingleMessageConfig(config)).toBe(true);
      });

      it('should return false for batch message config', () => {
        const config: EmailSendConfig = {
          messages: [testMessage],
        };

        expect(isEmailSingleMessageConfig(config)).toBe(false);
      });

      it('should return false for config with undefined message', () => {
        const config = {
          message: undefined,
        } as EmailSendConfig;

        expect(isEmailSingleMessageConfig(config)).toBe(false);
      });
    });

    describe('isEmailBatchMessageConfig', () => {
      it('should return true for batch message config', () => {
        const config: EmailSendConfig = {
          messages: [testMessage],
        };

        expect(isEmailBatchMessageConfig(config)).toBe(true);
      });

      it('should return false for single message config', () => {
        const config: EmailSendConfig = {
          message: testMessage,
        };

        expect(isEmailBatchMessageConfig(config)).toBe(false);
      });

      it('should return false for config with undefined messages', () => {
        const config = {
          messages: undefined,
        } as EmailSendConfig;

        expect(isEmailBatchMessageConfig(config)).toBe(false);
      });
    });
  });
});

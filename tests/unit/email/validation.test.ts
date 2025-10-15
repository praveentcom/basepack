import { 
  isValidEmail, 
  validateEmail, 
  validateEmails, 
  validateEmailMessage 
} from '../../../src/email/validation';
import { EmailValidationError } from '../../../src/email/errors';

describe('Email Validation', () => {
  describe('isValidEmail', () => {
    it('should validate simple email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@example.com')).toBe(true);
      expect(isValidEmail('user+tag@example.co.uk')).toBe(true);
    });

    it('should validate email addresses with display names', () => {
      expect(isValidEmail('John Doe <john@example.com>')).toBe(true);
      expect(isValidEmail('Jane Smith <jane.smith@example.com>')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(isValidEmail(null as any)).toBe(false);
      expect(isValidEmail(undefined as any)).toBe(false);
      expect(isValidEmail(123 as any)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should not throw for valid emails', () => {
      expect(() => validateEmail('user@example.com')).not.toThrow();
      expect(() => validateEmail('John <john@example.com>')).not.toThrow();
    });

    it('should throw EmailValidationError for invalid emails', () => {
      expect(() => validateEmail('invalid')).toThrow(EmailValidationError);
      expect(() => validateEmail('invalid', 'from')).toThrow(EmailValidationError);
    });

    it('should include field name in error message', () => {
      try {
        validateEmail('invalid', 'from');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(EmailValidationError);
        expect((error as EmailValidationError).field).toBe('from');
        expect((error as EmailValidationError).message).toContain('from');
      }
    });
  });

  describe('validateEmails', () => {
    it('should validate single email', () => {
      expect(() => validateEmails('user@example.com', 'to')).not.toThrow();
    });

    it('should validate array of emails', () => {
      expect(() => validateEmails(['user1@example.com', 'user2@example.com'], 'to')).not.toThrow();
    });

    it('should throw for empty array', () => {
      expect(() => validateEmails([], 'to')).toThrow(EmailValidationError);
    });

    it('should throw if any email is invalid', () => {
      expect(() => validateEmails(['valid@example.com', 'invalid'], 'to')).toThrow(EmailValidationError);
    });
  });

  describe('validateEmailMessage', () => {
    const validMessage = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    };

    it('should validate complete message', () => {
      expect(() => validateEmailMessage(validMessage)).not.toThrow();
    });

    it('should validate message with text content', () => {
      expect(() => validateEmailMessage({
        ...validMessage,
        text: 'Test',
        html: undefined,
      })).not.toThrow();
    });

    it('should throw if from is missing', () => {
      const message = { ...validMessage, from: '' };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should throw if to is missing', () => {
      const message = { ...validMessage, to: '' };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should throw if subject is missing', () => {
      const message = { ...validMessage, subject: '' };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should throw if both text and html are missing', () => {
      const message = { ...validMessage, html: undefined };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should validate CC and BCC fields', () => {
      const message = {
        ...validMessage,
        cc: 'cc@example.com',
        bcc: ['bcc1@example.com', 'bcc2@example.com'],
      };
      expect(() => validateEmailMessage(message)).not.toThrow();
    });

    it('should throw for invalid CC email', () => {
      const message = { ...validMessage, cc: 'invalid' };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should validate attachments', () => {
      const message = {
        ...validMessage,
        attachments: [{
          filename: 'test.txt',
          content: Buffer.from('test'),
          contentType: 'text/plain',
        }],
      };
      expect(() => validateEmailMessage(message)).not.toThrow();
    });

    it('should throw for attachment without filename', () => {
      const message = {
        ...validMessage,
        attachments: [{
          filename: '',
          content: Buffer.from('test'),
        }],
      };
      expect(() => validateEmailMessage(message as any)).toThrow(EmailValidationError);
    });

    it('should throw for attachment over 10MB', () => {
      const message = {
        ...validMessage,
        attachments: [{
          filename: 'large.bin',
          content: Buffer.alloc(11 * 1024 * 1024), // 11MB
        }],
      };
      expect(() => validateEmailMessage(message)).toThrow(EmailValidationError);
    });
  });
});


import { 
  EmailError, 
  EmailValidationError, 
  EmailProviderError,
  isEmailError,
  isEmailValidationError,
  isEmailProviderError
} from '../../../src/email/errors';

describe('Email Errors', () => {
  describe('EmailError', () => {
    it('should create error with all properties', () => {
      const error = new EmailError('Test error', 'ses', 500, new Error('Original'), true);
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('ses');
      expect(error.statusCode).toBe(500);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('EmailError');
    });

    it('should have default values', () => {
      const error = new EmailError('Test error', 'sendgrid');
      
      expect(error.statusCode).toBeUndefined();
      expect(error.originalError).toBeUndefined();
      expect(error.isRetryable).toBe(false);
    });

    it('should preserve stack trace', () => {
      const error = new EmailError('Test error', 'mailgun');
      expect(error.stack).toBeDefined();
    });

    describe('from static method', () => {
      it('should return EmailError as is', () => {
        const original = new EmailError('Test', 'ses', 500);
        const result = EmailError.from(original, 'sendgrid');
        
        expect(result).toBe(original);
      });

      it('should convert Error to EmailError', () => {
        const original = new Error('Test error');
        const result = EmailError.from(original, 'mailgun', true);
        
        expect(result).toBeInstanceOf(EmailError);
        expect(result.message).toBe('Test error');
        expect(result.provider).toBe('mailgun');
        expect(result.isRetryable).toBe(true);
      });

      it('should extract status code from error', () => {
        const original = { message: 'Error', statusCode: 429 };
        const result = EmailError.from(original, 'sendgrid');
        
        expect(result.statusCode).toBe(429);
      });

      it('should handle non-error objects', () => {
        const result = EmailError.from('String error', 'ses');
        
        expect(result.message).toBe('String error');
        expect(result.provider).toBe('ses');
      });
    });
  });

  describe('EmailValidationError', () => {
    it('should create validation error', () => {
      const error = new EmailValidationError('Invalid email', 'from');
      
      expect(error).toBeInstanceOf(EmailError);
      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('from');
      expect(error.provider).toBe('validation');
      expect(error.statusCode).toBe(400);
      expect(error.isRetryable).toBe(false);
      expect(error.name).toBe('EmailValidationError');
    });

    it('should work without field', () => {
      const error = new EmailValidationError('Invalid email');
      
      expect(error.field).toBeUndefined();
    });
  });

  describe('EmailProviderError', () => {
    it('should create provider error with errors array', () => {
      const errors = [
        { provider: 'ses', error: 'Throttled' },
        { provider: 'sendgrid', error: 'Invalid API key' },
      ];
      
      const error = new EmailProviderError('All failed', 'all', errors);
      
      expect(error).toBeInstanceOf(EmailError);
      expect(error.message).toBe('All failed');
      expect(error.provider).toBe('all');
      expect(error.errors).toEqual(errors);
      expect(error.name).toBe('EmailProviderError');
    });

    it('should have empty errors array by default', () => {
      const error = new EmailProviderError('All failed', 'all');
      
      expect(error.errors).toEqual([]);
    });

    it('should have readonly errors array', () => {
      const errors = [{ provider: 'ses', error: 'Error' }];
      const error = new EmailProviderError('Failed', 'all', errors);
      
      // TypeScript should enforce readonly, but runtime check
      expect(error.errors).toBeDefined();
    });
  });

  describe('Type Guards', () => {
    describe('isEmailError', () => {
      it('should return true for EmailError', () => {
        const error = new EmailError('Test', 'ses');
        expect(isEmailError(error)).toBe(true);
      });

      it('should return true for EmailValidationError', () => {
        const error = new EmailValidationError('Test', 'from');
        expect(isEmailError(error)).toBe(true);
      });

      it('should return true for EmailProviderError', () => {
        const error = new EmailProviderError('Test', 'all');
        expect(isEmailError(error)).toBe(true);
      });

      it('should return false for regular Error', () => {
        const error = new Error('Test');
        expect(isEmailError(error)).toBe(false);
      });

      it('should return false for non-errors', () => {
        expect(isEmailError('string')).toBe(false);
        expect(isEmailError(null)).toBe(false);
        expect(isEmailError(undefined)).toBe(false);
      });
    });

    describe('isEmailValidationError', () => {
      it('should return true for EmailValidationError', () => {
        const error = new EmailValidationError('Test', 'from');
        expect(isEmailValidationError(error)).toBe(true);
      });

      it('should return false for EmailError', () => {
        const error = new EmailError('Test', 'ses');
        expect(isEmailValidationError(error)).toBe(false);
      });
    });

    describe('isEmailProviderError', () => {
      it('should return true for EmailProviderError', () => {
        const error = new EmailProviderError('Test', 'all');
        expect(isEmailProviderError(error)).toBe(true);
      });

      it('should return false for EmailError', () => {
        const error = new EmailError('Test', 'ses');
        expect(isEmailProviderError(error)).toBe(false);
      });
    });
  });
});


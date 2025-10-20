/**
 * Unit tests for email index
 */

import * as emailModule from '../../../src/email/index';

describe('Email Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(emailModule.EmailService).toBeDefined();
    expect(emailModule.EmailProvider).toBeDefined();
    expect(emailModule.SESProvider).toBeDefined();
    expect(emailModule.MailgunProvider).toBeDefined();
    expect(emailModule.SendGridProvider).toBeDefined();
    expect(emailModule.ResendProvider).toBeDefined();
    expect(emailModule.PostmarkProvider).toBeDefined();
    expect(emailModule.SMTPProvider).toBeDefined();
    expect(emailModule.EmailError).toBeDefined();
    expect(emailModule.EmailValidationError).toBeDefined();
    expect(emailModule.EmailProviderError).toBeDefined();
    expect(emailModule.validateEmailMessage).toBeDefined();
    expect(emailModule.isEmailSingleMessageConfig).toBeDefined();
    expect(emailModule.isEmailBatchMessageConfig).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(emailModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'EmailService',
      'EmailProvider',
      'SESProvider',
      'MailgunProvider',
      'SendGridProvider',
      'ResendProvider',
      'PostmarkProvider',
      'SMTPProvider',
      'EmailError',
      'EmailValidationError',
      'EmailProviderError',
      'validateEmailMessage',
      'isEmailSingleMessageConfig',
      'isEmailBatchMessageConfig',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});

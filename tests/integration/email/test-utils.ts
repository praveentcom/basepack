import * as dotenv from 'dotenv';
import * as path from 'path';
import { EmailMessage } from '../../../src/email/types';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', 'test.env') });

// Common test email configuration
export const getTestEmail = (): EmailMessage => ({
  from: process.env.TEST_FROM_EMAIL || 'test@example.com',
  to: process.env.TEST_TO_EMAIL || 'recipient@example.com',
  subject: `Integration Test - ${new Date().toISOString()}`,
  text: 'This is a test email from Basepack integration tests.',
  html: '<p>This is a <strong>test email</strong> from Basepack integration tests.</p>',
});

/**
 * Check if required credentials are configured
 * 
 * @param provider - Email provider name
 * @param requiredEnvVars - Array of required environment variable names
 * @returns True if credentials are configured, false otherwise
 */
export const hasCredentials = (provider: string, requiredEnvVars: string[]): boolean => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Skipping ${provider} integration tests - missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

/**
 * Provider-specific credential checkers
 */
export const credentialCheckers = {
  ses: () => hasCredentials('SES', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION']),
  sendgrid: () => hasCredentials('SendGrid', ['SENDGRID_API_KEY']),
  mailgun: () => hasCredentials('Mailgun', ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN']),
  postmark: () => hasCredentials('Postmark', ['POSTMARK_API_KEY']),
  resend: () => hasCredentials('Resend', ['RESEND_API_KEY']),
  smtp: () => hasCredentials('SMTP', ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']),
};


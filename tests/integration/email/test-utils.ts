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


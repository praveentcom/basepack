import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail, credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.smtp();

describe(hasCredentials ? 'SMTP Provider' : 'SMTP Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping SMTP integration tests - missing credentials', () => {});
    return;
  }

  it('should send email via SMTP', async () => {
    const service = new EmailService({
      provider: EmailProvider.SMTP,
      config: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe(EmailProvider.SMTP);
  });

  it('should check SMTP health', async () => {
    const service = new EmailService({
      provider: EmailProvider.SMTP,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.SMTP);
  });
});


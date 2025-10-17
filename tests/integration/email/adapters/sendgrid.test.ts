import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail, credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.sendgrid();

describe(hasCredentials ? 'SendGrid Provider' : 'SendGrid Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping SendGrid integration tests - missing credentials', () => {});
    return;
  }

  it('should send email via SendGrid', async () => {
    const service = new EmailService({
      provider: EmailProvider.SENDGRID,
      config: {
        apiKey: process.env.SENDGRID_API_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].provider).toBe(EmailProvider.SENDGRID);
  });

  it('should check SendGrid health', async () => {
    const service = new EmailService({
      provider: EmailProvider.SENDGRID,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.SENDGRID);
  });
});


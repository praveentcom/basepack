import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail, credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.resend();

describe(hasCredentials ? 'Resend Provider' : 'Resend Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping Resend integration tests - missing credentials', () => {});
    return;
  }

  it('should send email via Resend', async () => {
    const service = new EmailService({
      provider: EmailProvider.RESEND,
      config: {
        apiKey: process.env.RESEND_API_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe(EmailProvider.RESEND);
  });

  it('should check Resend health', async () => {
    const service = new EmailService({
      provider: EmailProvider.RESEND,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.RESEND);
  });
});


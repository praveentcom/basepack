import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail } from '../test-utils';

describe('Mailgun Provider', () => {
  it('should send email via Mailgun', async () => {
    const service = new EmailService({
      provider: EmailProvider.MAILGUN,
      config: {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        region: (process.env.MAILGUN_REGION as 'us' | 'eu') || 'us',
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe(EmailProvider.MAILGUN);
  });

  it('should check Mailgun health', async () => {
    const service = new EmailService({
      provider: EmailProvider.MAILGUN,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.MAILGUN);
  });
});


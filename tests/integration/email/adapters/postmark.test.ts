import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail } from '../test-utils';

describe('Postmark Provider', () => {
  it('should send email via Postmark', async () => {
    const service = new EmailService({
      provider: EmailProvider.POSTMARK,
      config: {
        serverToken: process.env.POSTMARK_SERVER_TOKEN,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe(EmailProvider.POSTMARK);
  });

  it('should check Postmark health', async () => {
    const service = new EmailService({
      provider: EmailProvider.POSTMARK,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.POSTMARK);
  });
});

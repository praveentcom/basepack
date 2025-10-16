import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';
import { getTestEmail } from '../test-utils';

describe('SES Provider', () => {
  it('should send email via SES', async () => {
    const service = new EmailService({
      provider: EmailProvider.SES,
      config: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe(EmailProvider.SES);
  });

  it('should check SES health', async () => {
    const service = new EmailService({
      provider: EmailProvider.SES,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(EmailProvider.SES);
  });
});


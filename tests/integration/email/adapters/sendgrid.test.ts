import { EmailService } from '../../../../src/email/service';
import { getTestEmail } from '../test-utils';

describe('SendGrid Provider', () => {
  it('should send email via SendGrid', async () => {
    const service = new EmailService({
      provider: 'sendgrid',
      config: {
        apiKey: process.env.SENDGRID_API_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].provider).toBe('sendgrid');
  });

  it('should check SendGrid health', async () => {
    const service = new EmailService({
      provider: 'sendgrid',
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe('sendgrid');
  });
});


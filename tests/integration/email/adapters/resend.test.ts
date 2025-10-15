import { EmailService } from '../../../../src/email/service';
import { getTestEmail } from '../test-utils';

describe('Resend Provider', () => {
  it('should send email via Resend', async () => {
    const service = new EmailService({
      provider: 'resend',
      config: {
        apiKey: process.env.RESEND_API_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });

    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].messageId).toBeDefined();
    expect(results[0].provider).toBe('resend');
  });

  it('should check Resend health', async () => {
    const service = new EmailService({
      provider: 'resend',
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe('resend');
  });
});


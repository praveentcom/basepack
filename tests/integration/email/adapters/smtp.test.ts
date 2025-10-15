import { EmailService } from '../../../../src/email/service';
import { getTestEmail } from '../test-utils';

describe('SMTP Provider', () => {
  it('should send email via SMTP', async () => {
    const service = new EmailService({
      provider: 'smtp',
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
    expect(results[0].provider).toBe('smtp');
  });

  it('should check SMTP health', async () => {
    const service = new EmailService({
      provider: 'smtp',
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe('smtp');
  });
});


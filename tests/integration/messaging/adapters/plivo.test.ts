import { MessagingService } from '../../../../src/messaging/service';
import { MessagingProvider } from '../../../../src/messaging/types';
import { credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.plivo();

describe(hasCredentials ? 'Plivo Provider' : 'Plivo Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping Plivo integration tests - missing credentials', () => {});
    return;
  }

  it('should send SMS via Plivo', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.PLIVO,
      config: {
        authId: process.env.PLIVO_AUTH_ID,
        authToken: process.env.PLIVO_AUTH_TOKEN,
      },
    });

    const result = await service.sendSMS({
      message: {
        from: process.env.PLIVO_PHONE_NUMBER || '+14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - Plivo SMS - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.PLIVO);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send MMS via Plivo', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.PLIVO,
      config: {
        authId: process.env.PLIVO_AUTH_ID,
        authToken: process.env.PLIVO_AUTH_TOKEN,
      },
    });

    const result = await service.sendSMS({
      message: {
        from: process.env.PLIVO_PHONE_NUMBER || '+14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - Plivo MMS - ${new Date().toISOString()}`,
        mediaUrls: ['https://www.plivo.com/docs/images/plivo-logo.png'],
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.PLIVO);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send WhatsApp message via Plivo', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.PLIVO,
      config: {
        authId: process.env.PLIVO_AUTH_ID,
        authToken: process.env.PLIVO_AUTH_TOKEN,
      },
    });

    const result = await service.sendWhatsApp({
      message: {
        from: process.env.PLIVO_WHATSAPP_NUMBER || '+14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - Plivo WhatsApp - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.PLIVO);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should check Plivo health', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.PLIVO,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(MessagingProvider.PLIVO);
    expect(health.primary.ok).toBe(true);
  });
});
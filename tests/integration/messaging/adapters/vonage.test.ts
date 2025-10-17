import { MessagingService } from '../../../../src/messaging/service';
import { MessagingProvider } from '../../../../src/messaging/types';
import { credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.vonage();

describe(hasCredentials ? 'Vonage Provider' : 'Vonage Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping Vonage integration tests - missing credentials', () => {});
    return;
  }

  it('should send SMS via Vonage', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.VONAGE,
      config: {
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
      },
    });

    const result = await service.sendSMS({
      message: {
        from: process.env.VONAGE_SENDER_NAME || 'Basepack',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - Vonage SMS - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.VONAGE);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send WhatsApp message via Vonage', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.VONAGE,
      config: {
        apiKey: process.env.VONAGE_API_KEY,
        apiSecret: process.env.VONAGE_API_SECRET,
        applicationId: process.env.VONAGE_APPLICATION_ID,
        privateKey: process.env.VONAGE_PRIVATE_KEY,
      },
    });

    const result = await service.sendWhatsApp({
      message: {
        from: process.env.VONAGE_WHATSAPP_NUMBER || '14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - Vonage WhatsApp - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.VONAGE);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should check Vonage health', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.VONAGE,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(MessagingProvider.VONAGE);
    expect(health.primary.ok).toBe(true);
  });
});
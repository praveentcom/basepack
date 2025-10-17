import { MessagingService } from '../../../../src/messaging/service';
import { MessagingProvider } from '../../../../src/messaging/types';
import { credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.messagebird();

describe(hasCredentials ? 'MessageBird Provider' : 'MessageBird Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping MessageBird integration tests - missing credentials', () => {});
    return;
  }

  it('should send SMS via MessageBird', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MESSENGERBIRD,
      config: {
        accessKey: process.env.MESSENGERBIRD_ACCESS_KEY,
      },
    });

    const result = await service.sendSMS({
      message: {
        from: process.env.MESSENGERBIRD_SENDER_NAME || 'Basepack',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - MessageBird SMS - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.MESSENGERBIRD);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send WhatsApp message via MessageBird', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MESSENGERBIRD,
      config: {
        accessKey: process.env.MESSENGERBIRD_ACCESS_KEY,
      },
    });

    const result = await service.sendWhatsApp({
      message: {
        from: process.env.MESSENGERBIRD_WHATSAPP_NUMBER || '+14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: `Integration test - MessageBird WhatsApp - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.MESSENGERBIRD);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send WhatsApp template message via MessageBird', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MESSENGERBIRD,
      config: {
        accessKey: process.env.MESSENGERBIRD_ACCESS_KEY,
      },
    });

    const result = await service.sendWhatsApp({
      message: {
        from: process.env.MESSENGERBIRD_WHATSAPP_NUMBER || '+14155552671',
        to: process.env.TEST_TO_PHONE || '+14155552672',
        body: '',
        templateName: process.env.MESSENGERBIRD_TEMPLATE_NAME || 'test_template',
        templateVariables: {
          name: 'Test User',
          message: 'MessageBird integration test'
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.MESSENGERBIRD);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should check MessageBird health', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MESSENGERBIRD,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(MessagingProvider.MESSENGERBIRD);
    expect(health.primary.ok).toBe(true);
  });
});
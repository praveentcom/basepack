import { MessagingService } from '../../../../src/messaging/service';
import { MessagingProvider } from '../../../../src/messaging/types';
import { credentialCheckers } from '../test-utils';

const hasCredentials = credentialCheckers.msg91();

describe(hasCredentials ? 'MSG91 Provider' : 'MSG91 Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping MSG91 integration tests - missing credentials', () => {});
    return;
  }

  it('should send SMS via MSG91', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MSG91,
      config: {
        authKey: process.env.MSG91_AUTH_KEY,
        senderId: process.env.MSG91_SENDER_ID,
        flowId: process.env.MSG91_FLOW_ID,
      },
    });

    const result = await service.sendSMS({
      message: {
        from: process.env.MSG91_SENDER_ID!,
        to: process.env.TEST_TO_PHONE || '+919876543210',
        body: `Integration test - MSG91 SMS - ${new Date().toISOString()}`,
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.MSG91);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should send WhatsApp message via MSG91', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MSG91,
      config: {
        authKey: process.env.MSG91_AUTH_KEY,
        senderId: process.env.MSG91_SENDER_ID,
        flowId: process.env.MSG91_FLOW_ID,
      },
    });

    const result = await service.sendWhatsApp({
      message: {
        from: process.env.MSG91_SENDER_ID!,
        to: process.env.TEST_TO_PHONE || '+919876543210',
        body: `Integration test - MSG91 WhatsApp - ${new Date().toISOString()}`,
        templateName: process.env.MSG91_WHATSAPP_TEMPLATE,
        templateVariables: {
          name: 'Test User',
          message: 'MSG91 integration test'
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.provider).toBe(MessagingProvider.MSG91);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should check MSG91 health', async () => {
    const service = new MessagingService({
      provider: MessagingProvider.MSG91,
    });

    const health = await service.health();

    expect(health.ok).toBe(true);
    expect(health.provider).toBe(MessagingProvider.MSG91);
    expect(health.primary.ok).toBe(true);
  });
});
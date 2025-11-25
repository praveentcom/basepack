/**
 * Unit tests for messaging types
 */

import { MessagingProvider } from '../../../src/messaging/types';

describe('Messaging Types', () => {
  describe('MessagingProvider', () => {
    it('should have correct enum values', () => {
      expect(MessagingProvider.TWILIO).toBe('twilio');
      expect(MessagingProvider.SNS).toBe('sns');
      expect(MessagingProvider.META).toBe('meta');
      expect(MessagingProvider.MSG91).toBe('msg91');
      expect(MessagingProvider.VONAGE).toBe('vonage');
      expect(MessagingProvider.PLIVO).toBe('plivo');
      expect(MessagingProvider.MESSAGEBIRD).toBe('messagebird');
    });

    it('should have seven providers', () => {
      const providers = Object.values(MessagingProvider);
      expect(providers).toHaveLength(7);
      expect(providers).toContain('twilio');
      expect(providers).toContain('sns');
      expect(providers).toContain('meta');
      expect(providers).toContain('msg91');
      expect(providers).toContain('vonage');
      expect(providers).toContain('plivo');
      expect(providers).toContain('messagebird');
    });
  });
});

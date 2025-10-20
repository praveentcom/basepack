/**
 * Unit tests for queue types
 */

import { QueueProvider } from '../../../src/queue/types';

describe('Queue Types', () => {
  describe('QueueProvider', () => {
    it('should have correct enum values', () => {
      expect(QueueProvider.SQS).toBe('sqs');
      expect(QueueProvider.RABBITMQ).toBe('rabbitmq');
      expect(QueueProvider.GOOGLE_CLOUD_TASKS).toBe('google-cloud-tasks');
    });

    it('should have three providers', () => {
      const providers = Object.values(QueueProvider);
      expect(providers).toHaveLength(3);
      expect(providers).toContain('sqs');
      expect(providers).toContain('rabbitmq');
      expect(providers).toContain('google-cloud-tasks');
    });
  });
});

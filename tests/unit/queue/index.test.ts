/**
 * Unit tests for queue index
 */

import * as queueModule from '../../../src/queue/index';

describe('Queue Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(queueModule.QueueService).toBeDefined();
    expect(queueModule.QueueProvider).toBeDefined();
    expect(queueModule.SQSProvider).toBeDefined();
    expect(queueModule.RabbitMQProvider).toBeDefined();
    expect(queueModule.GoogleCloudTasksProvider).toBeDefined();
    expect(queueModule.QueueError).toBeDefined();
    expect(queueModule.QueueValidationError).toBeDefined();
    expect(queueModule.QueueConnectionError).toBeDefined();
    expect(queueModule.QueueTimeoutError).toBeDefined();
    expect(queueModule.isQueueError).toBeDefined();
    expect(queueModule.isQueueValidationError).toBeDefined();
    expect(queueModule.isQueueConnectionError).toBeDefined();
    expect(queueModule.isQueueTimeoutError).toBeDefined();
    expect(queueModule.validateProviderConfig).toBeDefined();
    expect(queueModule.validateCreateQueueConfig).toBeDefined();
    expect(queueModule.validateGetQueueConfig).toBeDefined();
    expect(queueModule.validateListQueuesConfig).toBeDefined();
    expect(queueModule.validateCreateTaskConfig).toBeDefined();
    expect(queueModule.validateListTasksConfig).toBeDefined();
    expect(queueModule.validateTaskOperationConfig).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(queueModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'QueueService',
      'QueueProvider',
      'SQSProvider',
      'RabbitMQProvider',
      'GoogleCloudTasksProvider',
      'QueueError',
      'QueueValidationError',
      'QueueConnectionError',
      'QueueTimeoutError',
      'isQueueError',
      'isQueueValidationError',
      'isQueueConnectionError',
      'isQueueTimeoutError',
      'validateProviderConfig',
      'validateCreateQueueConfig',
      'validateGetQueueConfig',
      'validateListQueuesConfig',
      'validateCreateTaskConfig',
      'validateListTasksConfig',
      'validateTaskOperationConfig',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});

/**
 * Unit tests for queue service
 */

import { QueueService } from '../../../src/queue/service';
import { QueueProvider, type QueueServiceConfig, type CreateQueueConfig, type CreateTaskConfig } from '../../../src/queue/types';
import type { Logger } from '../../../src/logger/types';
import { QueueError } from '../../../src/queue/errors';

// Mock the adapters
jest.mock('../../../src/queue/adapters/sqs');
jest.mock('../../../src/queue/adapters/rabbitmq');
jest.mock('../../../src/queue/adapters/google-cloud-tasks');

// Mock the validation
jest.mock('../../../src/queue/validation', () => ({
  validateProviderConfig: jest.fn(),
  validateCreateQueueConfig: jest.fn(),
  validateGetQueueConfig: jest.fn(),
  validateListQueuesConfig: jest.fn(),
  validateCreateTaskConfig: jest.fn(),
  validateListTasksConfig: jest.fn(),
  validateTaskOperationConfig: jest.fn(),
}));

import { SQSProvider } from '../../../src/queue/adapters/sqs';
import { RabbitMQProvider } from '../../../src/queue/adapters/rabbitmq';
import { GoogleCloudTasksProvider } from '../../../src/queue/adapters/google-cloud-tasks';
import { validateProviderConfig, validateCreateQueueConfig, validateCreateTaskConfig } from '../../../src/queue/validation';

describe('QueueService', () => {
  let mockLogger: Logger;
  let sqsConfig: QueueServiceConfig;
  let testCreateQueueConfig: CreateQueueConfig;
  let testCreateTaskConfig: CreateTaskConfig;
  let mockCreateProvider: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    sqsConfig = {
      provider: QueueProvider.SQS,
      config: {
        region: 'us-east-1',
      },
      logger: mockLogger,
    };

    testCreateQueueConfig = {
      name: 'test-queue',
      properties: {
        visibilityTimeout: 30,
        messageRetentionPeriod: 1209600,
      },
    };

    testCreateTaskConfig = {
      queueNameOrUrl: 'test-queue',
      task: {
        body: { message: 'Hello, world!' },
      },
    };

    // Mock provider implementation
    const mockProvider = {
      name: QueueProvider.SQS,
      createQueue: jest.fn(),
      getQueue: jest.fn(),
      listQueues: jest.fn(),
      deleteQueue: jest.fn(),
      createTask: jest.fn(),
      listTasks: jest.fn(),
      getTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      health: jest.fn(),
    };

    // Mock the createProvider function
    mockCreateProvider = jest.fn().mockReturnValue(mockProvider);
    
    // Replace the createProvider function in the module
    const queueServiceModule = require('../../../src/queue/service');
    queueServiceModule.createProvider = mockCreateProvider;
    
    // Now create the service
    const service = new QueueService(sqsConfig);
    
    expect(validateProviderConfig).toHaveBeenCalledWith(QueueProvider.SQS, sqsConfig.config);
    expect(mockCreateProvider).toHaveBeenCalledWith(sqsConfig, mockLogger);
  });

  describe('constructor', () => {
    it('should create a service with SQS provider', () => {
      const service = new QueueService(sqsConfig);
      
      expect(validateProviderConfig).toHaveBeenCalledWith(QueueProvider.SQS, sqsConfig.config);
      expect(mockCreateProvider).toHaveBeenCalledWith(sqsConfig, mockLogger);
    });

    it('should throw error for failover configuration', () => {
      const failoverConfig = {
        primary: { provider: QueueProvider.SQS },
        backups: [{ provider: QueueProvider.RABBITMQ }],
      } as any;
      
      expect(() => new QueueService(failoverConfig)).toThrow(
        'QueueService does not support failover configuration. Use single provider configuration instead.'
      );
    });
  });

  describe('createQueue', () => {
    it('should create a queue successfully', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      const mockResult = {
        success: true,
        queue: {
          name: 'test-queue',
          url: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        },
        provider: QueueProvider.SQS,
        timestamp: new Date(),
      };
      
      mockProvider.createQueue.mockResolvedValue(mockResult);
      
      const result = await service.createQueue(testCreateQueueConfig);
      
      expect(validateCreateQueueConfig).toHaveBeenCalledWith(testCreateQueueConfig, QueueProvider.SQS);
      expect(result).toEqual(mockResult);
    });

    it('should log queue creation', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      mockProvider.createQueue.mockResolvedValue({
        success: true,
        queue: { name: 'test-queue' },
        provider: QueueProvider.SQS,
        timestamp: new Date(),
      });
      
      await service.createQueue(testCreateQueueConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith('[QueueService] Creating queue: test-queue');
    });
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      const mockResult = {
        success: true,
        task: {
          id: 'task-123',
          body: { message: 'Hello, world!' },
        },
        provider: QueueProvider.SQS,
        timestamp: new Date(),
      };
      
      mockProvider.createTask.mockResolvedValue(mockResult);
      
      const result = await service.createTask(testCreateTaskConfig);
      
      expect(validateCreateTaskConfig).toHaveBeenCalledWith(testCreateTaskConfig, QueueProvider.SQS);
      expect(result).toEqual(mockResult);
    });

    it('should log task creation', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      mockProvider.createTask.mockResolvedValue({
        success: true,
        task: { id: 'task-123' },
        provider: QueueProvider.SQS,
        timestamp: new Date(),
      });
      
      await service.createTask(testCreateTaskConfig);
      
      expect(mockLogger.info).toHaveBeenCalledWith('[QueueService] Creating task in queue: test-queue');
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      const mockHealth = {
        ok: true,
        message: 'Healthy',
        provider: QueueProvider.SQS,
        timestamp: new Date(),
      };
      
      mockProvider.health.mockResolvedValue(mockHealth);
      
      const result = await service.health();
      
      expect(result).toEqual(mockHealth);
    });

    it('should handle providers without health method', async () => {
      const service = new QueueService(sqsConfig);
      const mockProvider = mockCreateProvider.mock.results[0].value;
      
      // Remove health method
      delete mockProvider.health;
      
      const result = await service.health();
      
      expect(result).toEqual({
        ok: true,
        provider: QueueProvider.SQS,
        timestamp: expect.any(Date),
      });
    });
  });
});

/**
 * Queue service main implementation
 * @module queue/service
 */

import {
  IQueueProvider,
  QueueProvider,
  QueueServiceConfig,
  CreateQueueConfig,
  GetQueueConfig,
  ListQueuesConfig,
  CreateTaskConfig,
  ListTasksConfig,
  TaskOperationConfig,
  CreateQueueResult,
  GetQueueResult,
  ListQueuesResult,
  QueueOperationResult,
  CreateTaskResult,
  ListTasksResult,
  TaskOperationResult,
  QueueHealthInfo
} from './types';
import type { Logger } from '../logger/types';
import {
  validateProviderConfig,
  validateCreateQueueConfig,
  validateGetQueueConfig,
  validateListQueuesConfig,
  validateCreateTaskConfig,
  validateListTasksConfig,
  validateTaskOperationConfig
} from './validation';

/**
 * QueueService provides a unified interface for managing queues across different providers.
 */
export class QueueService {
  private readonly provider: IQueueProvider;
  private readonly logger?: Logger;

  constructor(config: QueueServiceConfig) {
    this.logger = 'logger' in config ? config.logger : undefined;

    if ('primary' in config || 'backups' in config) {
      throw new Error('QueueService does not support failover configuration. Use single provider configuration instead.');
    }

    validateProviderConfig(config.provider, config.config);
    // Use exported factory so tests can replace it at runtime
    this.provider = (exports as any).createProvider(config, this.logger);
  }

  /**
   * Creates a new queue.
   *
   * @param config - Queue creation configuration
   * @returns Promise resolving to queue creation result
   *
   * @example
   * ```typescript
   * const result = await queueService.createQueue({
   *   name: 'my-queue',
   *   properties: {
   *     visibilityTimeout: 30,
   *     messageRetentionPeriod: 1209600
   *   }
   * });
   * ```
   */
  async createQueue(config: CreateQueueConfig): Promise<CreateQueueResult> {
    this.log(`Creating queue: ${config.name}`);
    validateCreateQueueConfig(config, this.provider.name);
    return this.provider.createQueue(config);
  }

  /**
   * Gets information about an existing queue.
   *
   * @param config - Queue retrieval configuration
   * @returns Promise resolving to queue information
   *
   * @example
   * ```typescript
   * const result = await queueService.getQueue({
   *   nameOrUrl: 'my-queue'
   * });
   * ```
   */
  async getQueue(config: GetQueueConfig): Promise<GetQueueResult> {
    this.log(`Getting queue: ${config.nameOrUrl}`);
    validateGetQueueConfig(config, this.provider.name);
    return this.provider.getQueue(config);
  }

  /**
   * Lists all queues.
   *
   * @param config - Optional queue listing configuration
   * @returns Promise resolving to list of queues
   *
   * @example
   * ```typescript
   * const result = await queueService.listQueues({
   *   prefix: 'my-app-',
   *   maxResults: 50
   * });
   * ```
   */
  async listQueues(config?: ListQueuesConfig): Promise<ListQueuesResult> {
    this.log('Listing queues');
    validateListQueuesConfig(config || {}, this.provider.name);
    return this.provider.listQueues(config);
  }

  /**
   * Deletes a queue.
   *
   * @param config - Queue deletion configuration
   * @returns Promise resolving to queue deletion result
   *
   * @example
   * ```typescript
   * const result = await queueService.deleteQueue({
   *   nameOrUrl: 'my-queue'
   * });
   * ```
   */
  async deleteQueue(config: GetQueueConfig): Promise<QueueOperationResult> {
    this.log(`Deleting queue: ${config.nameOrUrl}`);
    validateGetQueueConfig(config, this.provider.name);
    return this.provider.deleteQueue(config);
  }

  /**
   * Creates a new task in a queue.
   *
   * @param config - Task creation configuration
   * @returns Promise resolving to task creation result
   *
   * @example
   * ```typescript
   * const result = await queueService.createTask({
   *   queueNameOrUrl: 'my-queue',
   *   task: {
   *     body: { message: 'Hello World' },
   *     delaySeconds: 0
   *   }
   * });
   * ```
   */
  async createTask(config: CreateTaskConfig): Promise<CreateTaskResult> {
    this.log(`Creating task in queue: ${config.queueNameOrUrl}`);
    validateCreateTaskConfig(config, this.provider.name);
    return this.provider.createTask(config);
  }

  /**
   * Lists tasks in a queue.
   *
   * @param config - Task listing configuration
   * @returns Promise resolving to list of tasks
   *
   * @example
   * ```typescript
   * const result = await queueService.listTasks({
   *   queueNameOrUrl: 'my-queue',
   *   maxResults: 10,
   *   visibilityTimeout: 30,
   *   waitTimeSeconds: 20
   * });
   * ```
   */
  async listTasks(config: ListTasksConfig): Promise<ListTasksResult> {
    this.log(`Listing tasks in queue: ${config.queueNameOrUrl}`);
    validateListTasksConfig(config, this.provider.name);
    return this.provider.listTasks(config);
  }

  /**
   * Forces immediate execution of a task (if supported by provider).
   *
   * @param config - Task force configuration
   * @returns Promise resolving to task force result
   *
   * @example
   * ```typescript
   * const result = await queueService.forceTask({
   *   queueNameOrUrl: 'my-queue',
   *   taskId: 'task-123'
   * });
   * ```
   */
  async forceTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    this.log(`Forcing task execution: ${config.taskId}`);
    validateTaskOperationConfig(config, this.provider.name);
    return this.provider.forceTask(config);
  }

  /**
   * Deletes a task from a queue.
   *
   * @param config - Task deletion configuration
   * @returns Promise resolving to task deletion result
   *
   * @example
   * ```typescript
   * const result = await queueService.deleteTask({
   *   queueNameOrUrl: 'my-queue',
   *   taskId: 'task-123'
   * });
   * ```
   */
  async deleteTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    this.log(`Deleting task: ${config.taskId}`);
    validateTaskOperationConfig(config, this.provider.name);
    return this.provider.deleteTask(config);
  }

  /**
   * Checks the health of the configured provider.
   *
   * @returns Promise resolving to health check result
   *
   * @example
   * ```typescript
   * const healthResult = await queueService.health();
   * console.log('Provider health:', healthResult);
   * ```
   */
  async health(): Promise<QueueHealthInfo> {
    try {
      if (this.provider.health) {
        const health = await this.provider.health();
        this.log(`health for ${this.provider.name}: ${health.ok ? 'OK' : 'FAILED'}`);
        return health;
      } else {
        // Provider doesn't implement health check
        return {
          ok: true,
          provider: this.provider.name,
          timestamp: new Date(),
        } as any;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log(`health check failed for ${this.provider.name}: ${errorMessage}`);
      return {
        ok: false,
        message: errorMessage,
        details: { error: errorMessage }
      };
    }
  }

  /**
   * Gets the provider name.
   */
  get providerName(): QueueProvider {
    return this.provider.name;
  }

  /**
   * Logs a message if logger is available.
   */
  private log(message: string): void {
    if (this.logger) {
      this.logger.info(`[QueueService] ${message}`);
    }
  }
}

/**
 * Creates a queue provider instance based on configuration.
 */
export function createProvider(config: QueueServiceConfig, logger?: Logger): IQueueProvider {
  const provider = config.provider;
  switch (provider) {
    case QueueProvider.SQS:
      try {
        const { SQSProvider } = require('./adapters/sqs');
        return new SQSProvider(config.config, logger);
      } catch (error) {
        throw new Error('Install package: npm install @aws-sdk/client-sqs');
      }

    case QueueProvider.RABBITMQ:
      try {
        const { RabbitMQProvider } = require('./adapters/rabbitmq');
        return new RabbitMQProvider(config.config, logger);
      } catch (error) {
        throw new Error('Install package: npm install amqplib');
      }

    case QueueProvider.GOOGLE_CLOUD_TASKS:
      try {
        const { GoogleCloudTasksProvider } = require('./adapters/google-cloud-tasks');
        return new GoogleCloudTasksProvider(config.config, logger);
      } catch (error) {
        throw new Error('Install package: npm install @google-cloud/tasks');
      }

    default:
      throw new Error(`Unsupported queue provider: ${provider}`);
  }
}
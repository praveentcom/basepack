/**
 * RabbitMQ adapter implementation
 * @module queue/adapters/rabbitmq
 */

import {
  IQueueProvider,
  QueueProvider,
  RabbitMQConfig,
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
  QueueHealthInfo,
  QueueProperties,
  Task
} from '../types';
import {
  QueueError,
  QueueConnectionError,
  QueueNotFoundError,
  TaskNotFoundError,
  QueueValidationError,
  QueueTimeoutError
} from '../errors';

/**
 * RabbitMQ adapter implementation.
 */
export class RabbitMQProvider implements IQueueProvider {
  readonly name = QueueProvider.RABBITMQ;
  private readonly config: RabbitMQConfig;
  private connection: any = null;
  private channel: any = null;

  constructor(config: RabbitMQConfig = {}) {
    this.config = {
      url: process.env.RABBITMQ_URL,
      hostname: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER || 'guest',
      password: process.env.RABBITMQ_PASS || 'guest',
      vhost: process.env.RABBITMQ_VHOST || '/',
      ssl: process.env.RABBITMQ_SSL === 'true',
      timeout: parseInt(process.env.RABBITMQ_TIMEOUT || '10000'),
      heartbeat: parseInt(process.env.RABBITMQ_HEARTBEAT || '60'),
      ...config
    };
  }

  /**
   * Gets or creates a RabbitMQ connection.
   */
  private async getConnection(): Promise<any> {
    if (!this.connection) {
      try {
        const amqp = require('amqplib');

        const connectionOptions: any = {
          hostname: this.config.hostname,
          port: this.config.port,
          username: this.config.username,
          password: this.config.password,
          vhost: this.config.vhost,
          timeout: this.config.timeout,
          heartbeat: this.config.heartbeat
        };

        if (this.config.url) {
          this.connection = await amqp.connect(this.config.url, connectionOptions);
        } else {
          this.connection = await amqp.connect(connectionOptions);
        }

        // Handle connection errors
        this.connection.on('error', (err: Error) => {
          console.error('RabbitMQ connection error:', err);
          this.connection = null;
        });

        this.connection.on('close', () => {
          this.connection = null;
          this.channel = null;
        });
      } catch (error) {
        throw new QueueConnectionError(
          `Failed to connect to RabbitMQ: ${error instanceof Error ? error.message : 'Unknown error'}`,
          this.name,
          error instanceof Error ? error : undefined
        );
      }
    }

    return this.connection;
  }

  /**
   * Gets or creates a RabbitMQ channel.
   */
  private async getChannel(): Promise<any> {
    const connection = await this.getConnection();

    if (!this.channel || this.channel.connection !== connection) {
      this.channel = await connection.createChannel();

      // Handle channel errors
      this.channel.on('error', (err: Error) => {
        console.error('RabbitMQ channel error:', err);
        this.channel = null;
      });

      this.channel.on('close', () => {
        this.channel = null;
      });
    }

    return this.channel;
  }

  /**
   * Creates a new RabbitMQ queue.
   */
  async createQueue(config: CreateQueueConfig): Promise<CreateQueueResult> {
    try {
      const channel = await this.getChannel();

      const options: any = {
        durable: true,
        exclusive: false,
        autoDelete: false
      };

      // Handle properties
      if (config.properties) {
        if (config.properties.messageRetentionPeriod !== undefined) {
          // RabbitMQ doesn't have message retention, but we can use TTL
          options.messageTtl = config.properties.messageRetentionPeriod * 1000;
        }

        if (config.properties.maximumMessageSize !== undefined) {
          options.maxLength = config.properties.maximumMessageSize;
        }

        if (config.properties.deadLetterTargetArn !== undefined) {
          // RabbitMQ uses dead letter exchanges
          options.deadLetterExchange = '';
          options.deadLetterRoutingKey = config.properties.deadLetterTargetArn;
        }
      }

      await channel.assertQueue(config.name, options);

      return {
        success: true,
        id: config.name,
        queueUrl: config.name, // RabbitMQ uses queue names directly
        properties: {
          name: config.name,
          url: config.name,
          ...config.properties
        },
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('createQueue', error);
    }
  }

  /**
   * Gets information about a RabbitMQ queue.
   */
  async getQueue(config: GetQueueConfig): Promise<GetQueueResult> {
    try {
      const channel = await this.getChannel();

      const checkResult = await channel.checkQueue(config.nameOrUrl);

      const properties: QueueProperties = {
        name: config.nameOrUrl,
        url: config.nameOrUrl,
        messageCount: checkResult.messageCount,
        consumerCount: checkResult.consumerCount
      };

      // Get queue info from management API if available
      try {
        const managementInfo = await this.getQueueFromManagement(config.nameOrUrl);
        if (managementInfo) {
          properties.providerSpecific = managementInfo;
        }
      } catch {
        // Management API not available, ignore
      }

      return {
        success: true,
        id: config.nameOrUrl,
        properties,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('getQueue', error);
    }
  }

  /**
   * Lists RabbitMQ queues.
   */
  async listQueues(config?: ListQueuesConfig): Promise<ListQueuesResult> {
    try {
      const channel = await this.getChannel();

      let queues: string[] = [];

      if (config?.prefix) {
        // RabbitMQ doesn't support prefix filtering natively
        // We'll need to use management API or filter manually
        try {
          queues = await this.getQueuesFromManagement(config.prefix);
        } catch {
          // Fallback to basic method
          queues = await this.getQueuesBasic();
          queues = queues.filter(name => config!.prefix && name.startsWith(config!.prefix));
        }
      } else {
        try {
          queues = await this.getQueuesFromManagement();
        } catch {
          queues = await this.getQueuesBasic();
        }
      }

      if (config?.maxResults) {
        queues = queues.slice(0, config.maxResults);
      }

      return {
        success: true,
        queueUrls: queues,
        queues: queues.map(name => ({
          name: name,
          url: name
        })),
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('listQueues', error);
    }
  }

  /**
   * Deletes a RabbitMQ queue.
   */
  async deleteQueue(config: GetQueueConfig): Promise<QueueOperationResult> {
    try {
      const channel = await this.getChannel();

      await channel.deleteQueue(config.nameOrUrl);

      return {
        success: true,
        id: config.nameOrUrl,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('deleteQueue', error);
    }
  }

  /**
   * Sends a message to a RabbitMQ queue.
   */
  async createTask(config: CreateTaskConfig): Promise<CreateTaskResult> {
    try {
      const channel = await this.getChannel();

      const options: any = {
        persistent: true,
        timestamp: Date.now()
      };

      if (config.task.priority !== undefined) {
        options.priority = config.task.priority;
      }

      if (config.task.delaySeconds !== undefined) {
        options.expiration = config.task.delaySeconds * 1000;
      }

      const message = Buffer.from(JSON.stringify(config.task.body));
      const sent = channel.sendToQueue(config.queueNameOrUrl, message, options);

      if (!sent) {
        throw new QueueError('Failed to send message to RabbitMQ', this.name);
      }

      return {
        success: true,
        taskId: `rabbitmq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('createTask', error);
    }
  }

  /**
   * Receives messages from a RabbitMQ queue.
   */
  async listTasks(config: ListTasksConfig): Promise<ListTasksResult> {
    try {
      const channel = await this.getChannel();

      const options: any = {
        noAck: false // We'll ack manually after getting the receipt handle
      };

      const tasks: Task[] = [];

      // RabbitMQ doesn't support receiving multiple messages in one call
      // We'll receive one message at a time
      const maxMessages = Math.min(config.maxResults || 1, 10);

      for (let i = 0; i < maxMessages; i++) {
        const message = await new Promise<any>((resolve, reject) => {
          const timeout = config.waitTimeSeconds ? config.waitTimeSeconds * 1000 : 10000;
          let resolved = false;

          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(null); // No message available
            }
          }, timeout);

          channel.get(config.queueNameOrUrl, options, (err: Error, msg: any) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);

            if (err) {
              reject(err);
            } else {
              resolve(msg);
            }
          });
        });

        if (message) {
          let body: any;
          try {
            body = JSON.parse(message.content.toString());
          } catch {
            body = message.content.toString();
          }

          const task: Task = {
            id: message.properties.messageId || `rabbitmq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            body,
            attributes: {
              deliveryTag: message.fields.deliveryTag,
              redelivered: message.fields.redelivered,
              exchange: message.fields.exchange,
              routingKey: message.fields.routingKey,
              correlationId: message.properties.correlationId,
              replyTo: message.properties.replyTo,
              expiration: message.properties.expiration,
              priority: message.properties.priority,
              receiptHandle: message.fields.deliveryTag // Store deliveryTag for deletion
            }
          };

          tasks.push(task);

          // Don't acknowledge the message so it stays in the queue
          // User can delete it using the deliveryTag/receiptHandle
        } else {
          break; // No more messages available
        }
      }

      return {
        success: true,
        tasks,
        hasMore: tasks.length === maxMessages,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('listTasks', error);
    }
  }

  /**
   * Force task execution (requeue with higher priority) for RabbitMQ.
   */
  async forceTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    try {
      // For RabbitMQ, we can simulate forcing by increasing priority
      // This would require re-queuing the message, which is complex
      // For now, we'll return not supported
      return {
        success: false,
        error: 'Force task operation is not supported by RabbitMQ adapter',
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('forceTask', error);
    }
  }

  /**
   * Deletes a message from a RabbitMQ queue.
   */
  async deleteTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    try {
      const channel = await this.getChannel();

      // For RabbitMQ, we need the delivery tag from the message
      // The taskId should contain the deliveryTag
      const deliveryTag = parseInt(config.taskId);

      if (isNaN(deliveryTag)) {
        throw new QueueValidationError(
          'RabbitMQ requires delivery tag to delete messages. Use the deliveryTag from task.attributes.receiptHandle',
          this.name
        );
      }

      await channel.ack({ fields: { deliveryTag } });

      return {
        success: true,
        count: 1,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('deleteTask', error);
    }
  }

  /**
   * Checks RabbitMQ health by testing connection.
   */
  async health(): Promise<QueueHealthInfo> {
    try {
      const connection = await this.getConnection();
      const channel = await connection.createChannel();
      await channel.close();

      return {
        ok: true,
        message: 'RabbitMQ is healthy'
      };
    } catch (error: any) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error: error.name || 'UnknownError' }
      };
    }
  }

  /**
   * Closes the RabbitMQ connection.
   */
  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error) {
      // Ignore errors during close
    }
  }

  /**
   * Handles RabbitMQ errors and converts them to appropriate QueueError types.
   */
  private handleError(operation: string, error: any): any {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    const baseResult = {
      success: false,
      error: errorMessage,
      provider: this.name,
      timestamp: new Date()
    };

    // Handle specific error types
    if (error.message?.includes('NOT_FOUND') || error.message?.includes('404')) {
      throw new QueueNotFoundError(errorMessage, this.name);
    }

    if (error.message?.includes('ACCESS_REFUSED') || error.message?.includes('403')) {
      throw new QueueError(errorMessage, this.name, 403, 'AccessDenied');
    }

    if (error.message?.includes('PRECONDITION_FAILED') || error.message?.includes('406')) {
      throw new QueueValidationError(errorMessage, this.name);
    }

    if (error.message?.includes('CONNECTION_FORCED') || error.message?.includes('INTERNAL_ERROR')) {
      throw new QueueConnectionError(errorMessage, this.name, error);
    }

    if (error.message?.includes('TIMEOUT')) {
      throw new QueueTimeoutError(errorMessage, this.name);
    }

    throw new QueueError(errorMessage, this.name);
  }

  /**
   * Gets queue information from RabbitMQ Management API.
   */
  private async getQueueFromManagement(queueName: string): Promise<any | null> {
    try {
      // This would require additional dependencies and management API access
      // For now, return null to indicate management API not available
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Gets list of queues from RabbitMQ Management API.
   */
  private async getQueuesFromManagement(prefix?: string): Promise<string[]> {
    try {
      // This would require additional dependencies and management API access
      // For now, throw error to fall back to basic method
      throw new Error('Management API not available');
    } catch {
      throw new Error('Management API not available');
    }
  }

  /**
   * Gets list of queues using basic RabbitMQ methods.
   */
  private async getQueuesBasic(): Promise<string[]> {
    // Basic RabbitMQ doesn't have a direct way to list all queues
    // This would require management API or maintaining a registry
    // For now, return empty array
    return [];
  }
}
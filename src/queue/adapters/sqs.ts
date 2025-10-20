/**
 * Amazon SQS adapter implementation
 * @module queue/adapters/sqs
 */

import {
  IQueueProvider,
  QueueProvider,
  SQSConfig,
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
  QueueTimeoutError,
  QueueRateLimitError
} from '../errors';

/**
 * Amazon SQS adapter implementation.
 */
export class SQSProvider implements IQueueProvider {
  readonly name = QueueProvider.SQS;
  private readonly client: any;
  private readonly config: SQSConfig;

  constructor(config: SQSConfig = {}) {
    this.config = {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
      endpoint: process.env.AWS_ENDPOINT_URL,
      accountId: process.env.AWS_ACCOUNT_ID,
      ...config
    };

    try {
      const { SQSClient } = require('@aws-sdk/client-sqs');
      this.client = new SQSClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId!,
          secretAccessKey: this.config.secretAccessKey!,
          sessionToken: this.config.sessionToken
        },
        endpoint: this.config.endpoint
      });
    } catch (error) {
      throw new Error('Install package: npm install @aws-sdk/client-sqs');
    }
  }

  /**
   * Creates a new SQS queue.
   */
  async createQueue(config: CreateQueueConfig): Promise<CreateQueueResult> {
    try {
      const { CreateQueueCommand } = require('@aws-sdk/client-sqs');

      const params: any = {
        QueueName: config.name
      };

      // Add attributes from properties
      const attributes: any = {};

      if (config.properties?.visibilityTimeout !== undefined) {
        attributes.VisibilityTimeout = config.properties.visibilityTimeout.toString();
      }

      if (config.properties?.messageRetentionPeriod !== undefined) {
        attributes.MessageRetentionPeriod = config.properties.messageRetentionPeriod.toString();
      }

      if (config.properties?.maximumMessageSize !== undefined) {
        attributes.MaximumMessageSize = config.properties.maximumMessageSize.toString();
      }

      if (config.properties?.delaySeconds !== undefined) {
        attributes.DelaySeconds = config.properties.delaySeconds.toString();
      }

      if (config.properties?.receiveMessageWaitTimeSeconds !== undefined) {
        attributes.ReceiveMessageWaitTimeSeconds = config.properties.receiveMessageWaitTimeSeconds.toString();
      }

      if (config.properties?.deadLetterTargetArn !== undefined) {
        const { maxReceiveCount = 10 } = config.properties;
        attributes.RedrivePolicy = JSON.stringify({
          deadLetterTargetArn: config.properties.deadLetterTargetArn,
          maxReceiveCount
        });
      }

      if (config.properties?.fifoQueue) {
        attributes.FifoQueue = 'true';
      }

      if (config.properties?.contentBasedDeduplication !== undefined) {
        attributes.ContentBasedDeduplication = config.properties.contentBasedDeduplication.toString();
      }

      if (Object.keys(attributes).length > 0) {
        params.Attributes = attributes;
      }

      const command = new CreateQueueCommand(params);
      const result = await this.client.send(command);

      return {
        success: true,
        id: result.QueueUrl,
        queueUrl: result.QueueUrl,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('createQueue', error);
    }
  }

  /**
   * Gets information about an SQS queue.
   */
  async getQueue(config: GetQueueConfig): Promise<GetQueueResult> {
    try {
      const { GetQueueAttributesCommand } = require('@aws-sdk/client-sqs');

      const queueUrl = this.getQueueUrl(config.nameOrUrl);

      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['All']
      });

      const result = await this.client.send(command);

      const properties: QueueProperties = {
        name: this.extractQueueName(queueUrl),
        url: queueUrl,
        arn: result.Attributes?.QueueArn
      };

      // Parse attributes
      if (result.Attributes?.VisibilityTimeout) {
        properties.visibilityTimeout = parseInt(result.Attributes.VisibilityTimeout);
      }

      if (result.Attributes?.MessageRetentionPeriod) {
        properties.messageRetentionPeriod = parseInt(result.Attributes.MessageRetentionPeriod);
      }

      if (result.Attributes?.MaximumMessageSize) {
        properties.maximumMessageSize = parseInt(result.Attributes.MaximumMessageSize);
      }

      if (result.Attributes?.DelaySeconds) {
        properties.delaySeconds = parseInt(result.Attributes.DelaySeconds);
      }

      if (result.Attributes?.ReceiveMessageWaitTimeSeconds) {
        properties.receiveMessageWaitTimeSeconds = parseInt(result.Attributes.ReceiveMessageWaitTimeSeconds);
      }

      if (result.Attributes?.RedrivePolicy) {
        try {
          const redrivePolicy = JSON.parse(result.Attributes.RedrivePolicy);
          properties.deadLetterTargetArn = redrivePolicy.deadLetterTargetArn;
          properties.maxReceiveCount = redrivePolicy.maxReceiveCount;
        } catch {
          // Ignore invalid JSON
        }
      }

      if (result.Attributes?.FifoQueue === 'true') {
        properties.fifoQueue = true;
      }

      if (result.Attributes?.ContentBasedDeduplication === 'true') {
        properties.contentBasedDeduplication = true;
      }

      return {
        success: true,
        id: queueUrl,
        properties,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('getQueue', error);
    }
  }

  /**
   * Lists SQS queues.
   */
  async listQueues(config?: ListQueuesConfig): Promise<ListQueuesResult> {
    try {
      const { ListQueuesCommand } = require('@aws-sdk/client-sqs');

      const params: any = {};

      if (config?.prefix) {
        params.QueueNamePrefix = config.prefix;
      }

      if (config?.nextToken) {
        params.NextToken = config.nextToken;
      }

      if (config?.maxResults) {
        params.MaxResults = Math.min(config.maxResults, 1000);
      }

      const command = new ListQueuesCommand(params);
      const result = await this.client.send(command);

      return {
        success: true,
        queueUrls: result.QueueUrls || [],
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('listQueues', error);
    }
  }

  /**
   * Deletes an SQS queue.
   */
  async deleteQueue(config: GetQueueConfig): Promise<QueueOperationResult> {
    try {
      const { DeleteQueueCommand } = require('@aws-sdk/client-sqs');

      const queueUrl = this.getQueueUrl(config.nameOrUrl);

      const command = new DeleteQueueCommand({
        QueueUrl: queueUrl
      });

      await this.client.send(command);

      return {
        success: true,
        id: queueUrl,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('deleteQueue', error);
    }
  }

  /**
   * Sends a message to an SQS queue.
   */
  async createTask(config: CreateTaskConfig): Promise<CreateTaskResult> {
    try {
      const { SendMessageCommand } = require('@aws-sdk/client-sqs');

      const queueUrl = this.getQueueUrl(config.queueNameOrUrl);

      const params: any = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(config.task.body)
      };

      if (config.task.delaySeconds !== undefined) {
        params.DelaySeconds = config.task.delaySeconds;
      }

      if (config.task.messageGroupId !== undefined) {
        params.MessageGroupId = config.task.messageGroupId;
      }

      if (config.task.messageDeduplicationId !== undefined) {
        params.MessageDeduplicationId = config.task.messageDeduplicationId;
      }

      const command = new SendMessageCommand(params);
      const result = await this.client.send(command);

      return {
        success: true,
        id: result.MessageId,
        taskId: result.MessageId,
        sequenceNumber: result.SequenceNumber,
        md5OfMessageBody: result.MD5OfMessageBody,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('createTask', error);
    }
  }

  /**
   * Receives messages from an SQS queue.
   */
  async listTasks(config: ListTasksConfig): Promise<ListTasksResult> {
    try {
      const { ReceiveMessageCommand } = require('@aws-sdk/client-sqs');

      const queueUrl = this.getQueueUrl(config.queueNameOrUrl);

      const params: any = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(config.maxResults || 1, 10)
      };

      if (config.visibilityTimeout !== undefined) {
        params.VisibilityTimeout = config.visibilityTimeout;
      }

      if (config.waitTimeSeconds !== undefined) {
        params.WaitTimeSeconds = Math.min(config.waitTimeSeconds, 20);
      }

      const command = new ReceiveMessageCommand(params);
      const result = await this.client.send(command);

      const tasks: Task[] = [];

      if (result.Messages) {
        for (const message of result.Messages) {
          let body: any;
          try {
            body = JSON.parse(message.Body || '{}');
          } catch {
            body = message.Body;
          }

          const task: Task = {
            id: message.MessageId,
            body,
            attributes: {
              receiptHandle: message.ReceiptHandle,
              md5OfBody: message.MD5OfBody,
              ...message.Attributes
            }
          };

          tasks.push(task);
        }
      }

      return {
        success: true,
        tasks,
        hasMore: result.Messages?.length === params.MaxNumberOfMessages,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error: any) {
      return this.handleError('listTasks', error);
    }
  }

  /**
   * Force task execution is not supported by SQS.
   */
  async forceTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    return {
      success: false,
      error: 'Force task operation is not supported by SQS',
      provider: this.name,
      timestamp: new Date()
    };
  }

  /**
   * Deletes a message from an SQS queue.
   */
  async deleteTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    try {
      const { DeleteMessageCommand } = require('@aws-sdk/client-sqs');

      const queueUrl = this.getQueueUrl(config.queueNameOrUrl);

      // For SQS, we need the receipt handle, not just the message ID
      // This is a limitation - we need to have stored the receipt handle from listTasks
      throw new QueueValidationError(
        'SQS requires receipt handle to delete messages. Use the receiptHandle from task.attributes.receiptHandle',
        this.name
      );
    } catch (error: any) {
      return this.handleError('deleteTask', error);
    }
  }

  /**
   * Checks SQS health by attempting to list queues.
   */
  async health(): Promise<QueueHealthInfo> {
    try {
      const { ListQueuesCommand } = require('@aws-sdk/client-sqs');
      const command = new ListQueuesCommand({ MaxResults: 1 });
      await this.client.send(command);

      return {
        ok: true,
        message: 'SQS is healthy'
      };
    } catch (error: any) {
      return {
        ok: false,
        message: error.message,
        details: { error: error.name }
      };
    }
  }

  /**
   * Handles AWS SQS errors and converts them to appropriate QueueError types.
   */
  private handleError(operation: string, error: any): any {
    const errorCode = error.name || 'UnknownError';
    const errorMessage = error.message || 'Unknown error occurred';
    const statusCode = error.$metadata?.httpStatusCode;

    // Create base result
    const baseResult = {
      success: false,
      error: errorMessage,
      provider: this.name,
      timestamp: new Date()
    };

    // Handle specific error types
    switch (errorCode) {
      case 'QueueDoesNotExist':
        throw new QueueNotFoundError(errorMessage, this.name);

      case 'MessageNotInflight':
        throw new TaskNotFoundError(errorMessage, this.name);

      case 'InvalidParameterValue':
      case 'InvalidAttributeName':
        throw new QueueValidationError(errorMessage, this.name);

      case 'RequestTimeout':
        throw new QueueTimeoutError(errorMessage, this.name);

      case 'ThrottlingException':
        throw new QueueRateLimitError(errorMessage, this.name, error.$retryDelay);

      case 'AccessDenied':
        throw new QueueError(errorMessage, this.name, 403, errorCode);

      case 'InternalError':
      case 'ServiceUnavailable':
        throw new QueueConnectionError(errorMessage, this.name, error);

      default:
        throw new QueueError(errorMessage, this.name, statusCode, errorCode);
    }
  }

  /**
   * Converts queue name to full SQS URL if needed.
   */
  private getQueueUrl(nameOrUrl: string): string {
    // If it's already a URL, return as-is
    if (nameOrUrl.startsWith('https://')) {
      return nameOrUrl;
    }

    // Construct URL from name
    const region = this.config.region || 'us-east-1';
    const accountId = this.config.accountId;

    if (!accountId) {
      throw new QueueValidationError(
        'AWS account ID is required to construct queue URL. Provide it in config or AWS_ACCOUNT_ID env var.',
        this.name
      );
    }

    return `https://sqs.${region}.amazonaws.com/${accountId}/${nameOrUrl}`;
  }

  /**
   * Extracts queue name from SQS URL.
   */
  private extractQueueName(queueUrl: string): string {
    const parts = queueUrl.split('/');
    return parts[parts.length - 1];
  }
}
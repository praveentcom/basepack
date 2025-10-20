/**
 * Google Cloud Tasks adapter implementation using official GCP SDK.
 * @module queue/adapters/google-cloud-tasks
 */

import {
  IQueueProvider,
  QueueProvider,
  GoogleCloudTasksConfig,
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
  QueueValidationError,
  QueueTimeoutError,
  QueueRateLimitError,
  QueueOperationNotSupportedError
} from '../errors';

/**
 * Google Cloud Tasks adapter implementation using official GCP SDK.
 */
export class GoogleCloudTasksProvider implements IQueueProvider {
  readonly name = QueueProvider.GOOGLE_CLOUD_TASKS;
  private readonly config: GoogleCloudTasksConfig;
  private readonly projectId: string;
  private readonly location: string;
  private readonly client: any;

  constructor(config: GoogleCloudTasksConfig = {}) {
    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      ...config
    };

    this.projectId = this.config.projectId!;
    this.location = this.config.location!;

    if (!this.projectId) {
      throw new QueueValidationError(
        'Google Cloud project ID is required. Set GOOGLE_CLOUD_PROJECT env var or provide in config.',
        this.name
      );
    }

    try {
      const { CloudTasksClient } = require('@google-cloud/tasks');

      const clientConfig: any = {
        projectId: this.projectId
      };

      if (this.config.keyFile) {
        clientConfig.keyFile = this.config.keyFile;
      } else if (this.config.credentials) {
        clientConfig.credentials = this.config.credentials;
      }

      this.client = new CloudTasksClient(clientConfig);
    } catch (error) {
      throw new Error('Install package: npm install @google-cloud/tasks');
    }
  }

  /**
   * Gets the full queue name for Google Cloud Tasks API.
   */
  private getQueueName(queueName: string): string {
    if (queueName.startsWith('projects/')) {
      return queueName;
    }
    return this.client.queuePath(this.projectId, this.location, queueName);
  }

  /**
   * Gets the location path for Google Cloud Tasks API.
   */
  private getLocationPath(): string {
    return this.client.locationPath(this.projectId, this.location);
  }

  /**
   * Creates a new Google Cloud Tasks queue.
   */
  async createQueue(config: CreateQueueConfig): Promise<CreateQueueResult> {
    try {
      const queueName = this.getQueueName(config.name);
      const parent = this.getLocationPath();

      const queue: any = {
        name: queueName
      };

      // Add rate limits if specified
      if (config.properties) {
        const rateLimits: any = {};
        const retryConfig: any = {};

        if (config.properties.maxMessagesPerSecond !== undefined) {
          rateLimits.maxDispatchesPerSecond = config.properties.maxMessagesPerSecond;
        }

        if (config.properties.maxConcurrentTasks !== undefined) {
          rateLimits.maxConcurrentDispatches = config.properties.maxConcurrentTasks;
        }

        if (Object.keys(rateLimits).length > 0) {
          queue.rateLimits = rateLimits;
        }

        if (config.properties.maxAttempts !== undefined) {
          retryConfig.maxAttempts = config.properties.maxAttempts;
        }

        if (config.properties.messageRetentionPeriod !== undefined) {
          retryConfig.maxRetryDuration = {
            seconds: config.properties.messageRetentionPeriod
          };
        }

        if (Object.keys(retryConfig).length > 0) {
          queue.retryConfig = retryConfig;
        }
      }

      const [result] = await this.client.createQueue({ parent, queue });

      return {
        success: true,
        id: result.name,
        queueUrl: result.name,
        properties: {
          name: config.name,
          url: result.name,
          providerSpecific: result
        },
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('createQueue', error);
    }
  }

  /**
   * Gets information about a Google Cloud Tasks queue.
   */
  async getQueue(config: GetQueueConfig): Promise<GetQueueResult> {
    try {
      const queueName = this.getQueueName(config.nameOrUrl);
      const [result] = await this.client.getQueue({ name: queueName });

      const properties: QueueProperties = {
        name: this.extractQueueName(result.name),
        url: result.name,
        providerSpecific: result
      };

      return {
        success: true,
        id: result.name,
        properties,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('getQueue', error);
    }
  }

  /**
   * Lists Google Cloud Tasks queues.
   */
  async listQueues(config?: ListQueuesConfig): Promise<ListQueuesResult> {
    try {
      const parent = this.getLocationPath();
      const request: any = { parent };

      if (config?.maxResults) {
        request.pageSize = Math.min(config.maxResults, 100);
      }

      if (config?.nextToken) {
        request.pageToken = config.nextToken;
      }

      if (config?.prefix) {
        request.filter = `name="${parent}/queues/${config.prefix}"`;
      }

      const [result] = await this.client.listQueues(request);

      const queueUrls = result.map((queue: any) => queue.name) || [];
      const queues = result.map((queue: any) => ({
        name: this.extractQueueName(queue.name),
        url: queue.name,
        providerSpecific: queue
      })) || [];

      return {
        success: true,
        queueUrls,
        queues,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('listQueues', error);
    }
  }

  /**
   * Deletes a Google Cloud Tasks queue.
   */
  async deleteQueue(config: GetQueueConfig): Promise<QueueOperationResult> {
    try {
      const queueName = this.getQueueName(config.nameOrUrl);
      await this.client.deleteQueue({ name: queueName });

      return {
        success: true,
        id: queueName,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('deleteQueue', error);
    }
  }

  /**
   * Creates a new task in a Google Cloud Tasks queue.
   */
  async createTask(config: CreateTaskConfig): Promise<CreateTaskResult> {
    try {
      const queueName = this.getQueueName(config.queueNameOrUrl);
      const parent = queueName;

      const task: any = {};

      // Handle different task body types
      if (typeof config.task.body === 'string') {
        // HTTP request task
        task.httpRequest = {
          httpMethod: 'POST',
          url: config.task.body,
          body: Buffer.from(JSON.stringify(config.task.body || {})).toString('base64'),
          headers: {
            'Content-Type': 'application/json'
          }
        };
      } else {
        // HTTP request task with JSON body
        task.httpRequest = {
          httpMethod: 'POST',
          url: 'https://example.com/_ah/task', // Default placeholder - should be configured
          body: Buffer.from(JSON.stringify(config.task.body)).toString('base64'),
          headers: {
            'Content-Type': 'application/json'
          }
        };
      }

      // Handle scheduling
      if (config.task.delaySeconds !== undefined) {
        const scheduleTime = {
          seconds: Math.floor(Date.now() / 1000) + config.task.delaySeconds
        };
        task.scheduleTime = scheduleTime;
      }

      // Handle task name for deduplication
      if (config.task.id) {
        task.name = `${queueName}/tasks/${config.task.id}`;
      }

      const [result] = await this.client.createTask({ parent, task });

      return {
        success: true,
        id: result.name,
        taskId: this.extractTaskName(result.name),
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('createTask', error);
    }
  }

  /**
   * Lists tasks in a Google Cloud Tasks queue.
   */
  async listTasks(config: ListTasksConfig): Promise<ListTasksResult> {
    try {
      const queueName = this.getQueueName(config.queueNameOrUrl);
      const request: any = { parent: queueName };

      if (config.maxResults) {
        request.pageSize = Math.min(config.maxResults, 1000);
      }

      // Google Cloud Tasks doesn't use nextToken for tasks pagination

      // Google Cloud Tasks doesn't support visibilityTimeout or waitTimeSeconds
      // These are SQS-specific concepts

      const [result] = await this.client.listTasks(request);
      const tasks: Task[] = [];

      if (result) {
        for (const task of result) {
          let body: any;

          try {
            if (task.httpRequest?.body) {
              body = JSON.parse(Buffer.from(task.httpRequest.body, 'base64').toString());
            } else {
              body = {};
            }
          } catch {
            body = task.httpRequest?.body || {};
          }

          const taskObj: Task = {
            id: this.extractTaskName(task.name),
            body,
            attributes: {
              name: task.name,
              createTime: task.createTime,
              scheduleTime: task.scheduleTime,
              dispatchCount: task.dispatchCount,
              responseCount: task.responseCount,
              firstAttempt: task.firstAttempt,
              lastAttempt: task.lastAttempt,
              view: task.view
            }
          };

          tasks.push(taskObj);
        }
      }

      return {
        success: true,
        tasks,
        hasMore: !!result.nextPageToken,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('listTasks', error);
    }
  }

  /**
   * Forces immediate execution of a Google Cloud Tasks task.
   */
  async forceTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    try {
      const queueName = this.getQueueName(config.queueNameOrUrl);
      const taskName = `${queueName}/tasks/${config.taskId}`;

      // Google Cloud Tasks uses "run" method for forcing execution
      await this.client.runTask({ name: taskName });

      return {
        success: true,
        count: 1,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('forceTask', error);
    }
  }

  /**
   * Deletes a task from a Google Cloud Tasks queue.
   */
  async deleteTask(config: TaskOperationConfig): Promise<TaskOperationResult> {
    try {
      const queueName = this.getQueueName(config.queueNameOrUrl);
      const taskName = `${queueName}/tasks/${config.taskId}`;

      await this.client.deleteTask({ name: taskName });

      return {
        success: true,
        count: 1,
        provider: this.name,
        timestamp: new Date()
      };
    } catch (error) {
      return this.handleError('deleteTask', error);
    }
  }

  /**
   * Checks Google Cloud Tasks health by attempting to list queues.
   */
  async health(): Promise<QueueHealthInfo> {
    try {
      const parent = this.getLocationPath();
      await this.client.listQueues({ parent, pageSize: 1 });

      return {
        ok: true,
        message: 'Google Cloud Tasks is healthy'
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { error: error || 'UnknownError' }
      };
    }
  }

  /**
   * Handles Google Cloud Tasks errors and converts them to appropriate QueueError types.
   */
  private handleError(operation: string, error: any): any {
    const errorCode = error.code;
    const errorMessage = error.message || 'Unknown error occurred';
    const statusCode = error.code;

    // Handle specific error types based on gRPC status codes
    switch (errorCode) {
      case 5: // NOT_FOUND
        throw new QueueNotFoundError(errorMessage, this.name);

      case 7: // PERMISSION_DENIED
        throw new QueueError(errorMessage, this.name, 403, 'PERMISSION_DENIED');

      case 3: // INVALID_ARGUMENT
        throw new QueueValidationError(errorMessage, this.name);

      case 4: // DEADLINE_EXCEEDED
        throw new QueueTimeoutError(errorMessage, this.name);

      case 8: // RESOURCE_EXHAUSTED
        throw new QueueRateLimitError(errorMessage, this.name);

      case 12: // UNIMPLEMENTED
        throw new QueueOperationNotSupportedError(errorMessage, this.name, operation);

      case 14: // UNAVAILABLE
      case 13: // INTERNAL
        throw new QueueConnectionError(errorMessage, this.name);

      default:
        throw new QueueError(errorMessage, this.name, statusCode, errorCode?.toString());
    }
  }

  /**
   * Extracts queue name from full Google Cloud Tasks queue name.
   */
  private extractQueueName(fullName: string): string {
    const parts = fullName.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Extracts task name from full Google Cloud Tasks task name.
   */
  private extractTaskName(fullName: string): string {
    const parts = fullName.split('/');
    return parts[parts.length - 1];
  }
}
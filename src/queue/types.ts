/**
 * Queue service types and interfaces
 * @module queue/types
 */

import type { Logger } from '../logger/types';

/**
 * Optional configuration for queue operations.
 */
export interface QueueBaseOptions {
  /** Timeout in milliseconds for the operation */
  timeout?: number;
  /** Number of retry attempts for failed operations (default: 2) */
  retries?: number;
  /** Minimum timeout between retries in milliseconds (default: 1000) */
  retryMinTimeout?: number;
  /** Maximum timeout between retries in milliseconds (default: 10000) */
  retryMaxTimeout?: number;
  /** Exponential backoff factor (default: 2) */
  retryFactor?: number;
  /** Custom metadata to attach to the operation */
  metadata?: Record<string, any>;
}

/**
 * Result of a queue operation.
 */
export interface QueueOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Unique identifier for the operation (if available) */
  id?: string;
  /** Error message if the operation failed */
  error?: string;
  /** Name of the provider that handled this operation */
  provider: QueueProvider;
  /** Timestamp when the operation completed */
  timestamp: Date;
}

/**
 * Queue configuration properties.
 */
export interface QueueProperties {
  /** Queue name */
  name: string;
  /** Queue URL or identifier */
  url?: string;
  /** Queue ARN (Amazon Resource Name) for SQS */
  arn?: string;
  /** Visibility timeout in seconds (SQS) */
  visibilityTimeout?: number;
  /** Message retention period in seconds (SQS) */
  messageRetentionPeriod?: number;
  /** Maximum message size in bytes (SQS) */
  maximumMessageSize?: number;
  /** Delivery delay in seconds (SQS) */
  delaySeconds?: number;
  /** Receive message wait time in seconds (SQS) */
  receiveMessageWaitTimeSeconds?: number;
  /** Dead letter queue configuration (SQS) */
  deadLetterTargetArn?: string;
  /** Maximum receives before message goes to dead letter queue (SQS) */
  maxReceiveCount?: number;
  /** Queue type (SQS FIFO) */
  fifoQueue?: boolean;
  /** Content-based deduplication (SQS FIFO) */
  contentBasedDeduplication?: boolean;
  /** Maximum messages dispatched per second (Google Cloud Tasks) */
  maxMessagesPerSecond?: number;
  /** Maximum concurrent tasks (Google Cloud Tasks) */
  maxConcurrentTasks?: number;
  /** Maximum number of retry attempts (Google Cloud Tasks) */
  maxAttempts?: number;
  /** Number of messages in the queue (RabbitMQ) */
  messageCount?: number;
  /** Number of active consumers (RabbitMQ) */
  consumerCount?: number;
  /** Additional provider-specific properties */
  providerSpecific?: Record<string, any>;
}

/**
 * Task/message structure.
 */
export interface Task {
  /** Task payload data */
  body: any;
  /** Optional task ID */
  id?: string;
  /** Optional delay for task execution in seconds */
  delaySeconds?: number;
  /** Task priority (if supported by provider) */
  priority?: number;
  /** Message group ID (for FIFO queues) */
  messageGroupId?: string;
  /** Message deduplication ID (for FIFO queues) */
  messageDeduplicationId?: string;
  /** Additional metadata */
  attributes?: Record<string, any>;
}

/**
 * Result of creating a queue.
 */
export interface CreateQueueResult extends QueueOperationResult {
  /** Queue URL or identifier */
  queueUrl?: string;
  /** Queue properties */
  properties?: QueueProperties;
}

/**
 * Result of getting a queue.
 */
export interface GetQueueResult extends QueueOperationResult {
  /** Queue properties */
  properties?: QueueProperties;
}

/**
 * Result of listing queues.
 */
export interface ListQueuesResult extends QueueOperationResult {
  /** List of queue URLs or identifiers */
  queueUrls?: string[];
  /** List of queue properties */
  queues?: QueueProperties[];
}

/**
 * Result of creating a task.
 */
export interface CreateTaskResult extends QueueOperationResult {
  /** Task/message ID */
  taskId?: string;
  /** Task sequence number (for FIFO queues) */
  sequenceNumber?: string;
  /** MD5 checksum of the message body (SQS) */
  md5OfMessageBody?: string;
}

/**
 * Result of listing tasks.
 */
export interface ListTasksResult extends QueueOperationResult {
  /** List of tasks/messages */
  tasks?: Task[];
  /** Whether more messages are available */
  hasMore?: boolean;
}

/**
 * Result of forcing/deleting a task.
 */
export interface TaskOperationResult extends QueueOperationResult {
  /** Number of tasks affected */
  count?: number;
}

/**
 * Health check information for a queue provider.
 */
export interface QueueHealthInfo {
  /** Whether the provider is healthy and operational */
  ok: boolean;
  /** Optional health status message */
  message?: string;
  /** Additional provider-specific health details */
  details?: Record<string, any>;
}

/**
 * Configuration for creating a queue.
 */
export interface CreateQueueConfig {
  /** Queue name */
  name: string;
  /** Queue properties */
  properties?: Partial<QueueProperties>;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Configuration for getting a queue.
 */
export interface GetQueueConfig {
  /** Queue name or URL */
  nameOrUrl: string;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Configuration for listing queues.
 */
export interface ListQueuesConfig {
  /** Optional prefix filter for queue names */
  prefix?: string;
  /** Maximum number of queues to return */
  maxResults?: number;
  /** Pagination token */
  nextToken?: string;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Configuration for creating a task.
 */
export interface CreateTaskConfig {
  /** Queue name or URL */
  queueNameOrUrl: string;
  /** Task data */
  task: Task;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Configuration for listing tasks.
 */
export interface ListTasksConfig {
  /** Queue name or URL */
  queueNameOrUrl: string;
  /** Maximum number of tasks to return */
  maxResults?: number;
  /** Visibility timeout in seconds for received messages */
  visibilityTimeout?: number;
  /** Wait time in seconds for long polling */
  waitTimeSeconds?: number;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Configuration for forcing/deleting a task.
 */
export interface TaskOperationConfig {
  /** Queue name or URL */
  queueNameOrUrl: string;
  /** Task/message ID */
  taskId: string;
  /** Options for the operation */
  opts?: QueueBaseOptions;
}

/**
 * Interface that all queue provider adapters must implement.
 */
export interface IQueueProvider {
  /** Unique name of the queue provider */
  readonly name: QueueProvider;

  /**
   * Creates a new queue.
   * @param config - Queue creation configuration
   * @returns Queue creation result
   */
  createQueue(config: CreateQueueConfig): Promise<CreateQueueResult>;

  /**
   * Gets information about an existing queue.
   * @param config - Queue retrieval configuration
   * @returns Queue information result
   */
  getQueue(config: GetQueueConfig): Promise<GetQueueResult>;

  /**
   * Lists all queues.
   * @param config - Queue listing configuration
   * @returns List of queues
   */
  listQueues(config?: ListQueuesConfig): Promise<ListQueuesResult>;

  /**
   * Deletes a queue.
   * @param config - Queue deletion configuration
   * @returns Queue deletion result
   */
  deleteQueue(config: GetQueueConfig): Promise<QueueOperationResult>;

  /**
   * Creates a new task in a queue.
   * @param config - Task creation configuration
   * @returns Task creation result
   */
  createTask(config: CreateTaskConfig): Promise<CreateTaskResult>;

  /**
   * Lists tasks in a queue.
   * @param config - Task listing configuration
   * @returns List of tasks
   */
  listTasks(config: ListTasksConfig): Promise<ListTasksResult>;

  /**
   * Forces immediate execution of a task (if supported).
   * @param config - Task force configuration
   * @returns Task force result
   */
  forceTask(config: TaskOperationConfig): Promise<TaskOperationResult>;

  /**
   * Deletes a task from a queue.
   * @param config - Task deletion configuration
   * @returns Task deletion result
   */
  deleteTask(config: TaskOperationConfig): Promise<TaskOperationResult>;

  /**
   * Checks the health/status of the queue provider.
   * @returns Health status information
   */
  health?(): Promise<QueueHealthInfo>;
}

/**
 * Queue provider enum
 */
export enum QueueProvider {
  SQS = 'sqs',
  RABBITMQ = 'rabbitmq',
  GOOGLE_CLOUD_TASKS = 'google-cloud-tasks'
}

/**
 * AWS SQS (Simple Queue Service) configuration.
 * Requires: `@aws-sdk/client-sqs` package
 */
export interface SQSConfig {
  /** AWS region (default: from AWS_REGION or 'us-east-1') */
  region?: string;
  /** AWS access key ID (or set AWS_ACCESS_KEY_ID env var) */
  accessKeyId?: string;
  /** AWS secret access key (or set AWS_SECRET_ACCESS_KEY env var) */
  secretAccessKey?: string;
  /** AWS session token for temporary credentials (or set AWS_SESSION_TOKEN env var) */
  sessionToken?: string;
  /** Custom SQS endpoint URL (or set AWS_ENDPOINT_URL env var) */
  endpoint?: string;
  /** Account ID for constructing queue URLs */
  accountId?: string;
}

/**
 * RabbitMQ configuration.
 * Requires: `amqplib` package
 */
export interface RabbitMQConfig {
  /** RabbitMQ server URL (or set RABBITMQ_URL env var) */
  url?: string;
  /** RabbitMQ hostname (or set RABBITMQ_HOST env var) */
  hostname?: string;
  /** RabbitMQ port (or set RABBITMQ_PORT env var, default: 5672) */
  port?: number;
  /** RabbitMQ username (or set RABBITMQ_USER env var) */
  username?: string;
  /** RabbitMQ password (or set RABBITMQ_PASS env var) */
  password?: string;
  /** Virtual host (or set RABBITMQ_VHOST env var, default: '/') */
  vhost?: string;
  /** Whether to use SSL/TLS (or set RABBITMQ_SSL env var, default: false) */
  ssl?: boolean;
  /** Connection timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Heartbeat interval in seconds (default: 60) */
  heartbeat?: number;
}

/**
 * Google Cloud Tasks configuration.
 * Requires: `@google-cloud/tasks` package
 */
export interface GoogleCloudTasksConfig {
  /** Google Cloud project ID (or set GOOGLE_CLOUD_PROJECT env var) */
  projectId?: string;
  /** Google Cloud region/location for tasks (default: 'us-central1') */
  location?: string;
  /** Path to service account key file (or set GOOGLE_APPLICATION_CREDENTIALS env var) */
  keyFile?: string;
  /** Service account credentials JSON */
  credentials?: {
    client_email: string;
    private_key: string;
  };
  /** API endpoint (default: 'https://cloudtasks.googleapis.com') */
  endpoint?: string;
}

/**
 * Configuration for a single queue provider.
 */
export type QueueSingleProviderConfig =
  | { provider: QueueProvider.SQS; config?: SQSConfig }
  | { provider: QueueProvider.RABBITMQ; config?: RabbitMQConfig }
  | { provider: QueueProvider.GOOGLE_CLOUD_TASKS; config?: GoogleCloudTasksConfig };

/**
 * QueueService configuration with single provider.
 */
export type QueueServiceConfig = QueueSingleProviderConfig & { logger?: Logger };
# Queue Service

The Queue Service provides a unified interface for managing queues across different providers. It supports Amazon SQS, RabbitMQ, and Google Cloud Tasks.

## Supported Providers

| Provider | Package Required | Features |
|----------|-----------------|----------|
| **Amazon SQS** | `@aws-sdk/client-sqs` | FIFO queues, dead letter queues, long polling |
| **RabbitMQ** | `amqplib` | Message routing, acknowledgments, publisher confirms |
| **Google Cloud Tasks** | `@google-cloud/tasks` | HTTP tasks, App Engine tasks, scheduled execution |

## Quick Start

```typescript
import { QueueService, QueueProvider } from 'basepack';

// Initialize with Amazon SQS
const queueService = new QueueService({
  provider: QueueProvider.SQS,
  config: {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Create a queue
const queueResult = await queueService.createQueue({
  name: 'my-queue',
  properties: {
    visibilityTimeout: 30,
    messageRetentionPeriod: 1209600 // 14 days
  }
});

// Send a task
const taskResult = await queueService.createTask({
  queueNameOrUrl: 'my-queue',
  task: {
    body: { message: 'Hello World', userId: 123 },
    delaySeconds: 0
  }
});
```

## Configuration

### Amazon SQS

```typescript
import { QueueService, QueueProvider } from 'basepack';

const queueService = new QueueService({
  provider: QueueProvider.SQS,
  config: {
    region: 'us-east-1',
    accessKeyId: 'your-access-key',
    secretAccessKey: 'your-secret-key',
    // Optional
    sessionToken: 'your-session-token',
    endpoint: 'https://sqs.us-east-1.amazonaws.com',
    accountId: '123456789012'
  }
});
```

**Environment Variables:**
- `AWS_REGION` - AWS region (default: 'us-east-1')
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_SESSION_TOKEN` - AWS session token (optional)
- `AWS_ENDPOINT_URL` - Custom endpoint URL (optional)
- `AWS_ACCOUNT_ID` - AWS account ID (optional)

### RabbitMQ

```typescript
import { QueueService, QueueProvider } from 'basepack';

const queueService = new QueueService({
  provider: QueueProvider.RABBITMQ,
  config: {
    url: 'amqp://guest:guest@localhost:5672',
    // Or individual settings
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    vhost: '/',
    ssl: false,
    timeout: 10000,
    heartbeat: 60
  }
});
```

**Environment Variables:**
- `RABBITMQ_URL` - Full connection URL
- `RABBITMQ_HOST` - Hostname (default: 'localhost')
- `RABBITMQ_PORT` - Port (default: 5672)
- `RABBITMQ_USER` - Username (default: 'guest')
- `RABBITMQ_PASS` - Password (default: 'guest')
- `RABBITMQ_VHOST` - Virtual host (default: '/')
- `RABBITMQ_SSL` - Use SSL (default: false)
- `RABBITMQ_TIMEOUT` - Connection timeout (default: 10000)
- `RABBITMQ_HEARTBEAT` - Heartbeat interval (default: 60)

### Google Cloud Tasks

```typescript
import { QueueService, QueueProvider } from 'basepack';

const queueService = new QueueService({
  provider: QueueProvider.GOOGLE_CLOUD_TASKS,
  config: {
    projectId: 'my-project',
    location: 'us-central1',
    keyFile: '/path/to/service-account-key.json',
    // Or credentials object
    credentials: {
      client_email: 'service-account@my-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\n...'
    }
  }
});
```

**Environment Variables:**
- `GOOGLE_CLOUD_PROJECT` - Project ID
- `GOOGLE_CLOUD_LOCATION` - Location (default: 'us-central1')
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account key
- `GOOGLE_CLOUD_TASKS_ENDPOINT` - API endpoint (default: 'https://cloudtasks.googleapis.com')

## API Reference

### Queue Management

#### `createQueue(config)`

Creates a new queue with the specified properties.

```typescript
const result = await queueService.createQueue({
  name: 'my-queue',
  properties: {
    visibilityTimeout: 30,          // SQS: Seconds message is invisible
    messageRetentionPeriod: 1209600, // SQS: Seconds to retain messages
    maximumMessageSize: 262144,     // SQS: Max message size in bytes
    delaySeconds: 0,                // SQS: Default delay for messages
    receiveMessageWaitTimeSeconds: 20, // SQS: Long polling time
    fifoQueue: true,                // SQS: FIFO queue
    contentBasedDeduplication: true, // SQS: Content deduplication
    deadLetterTargetArn: 'arn:aws:sqs:...', // SQS: Dead letter queue
    maxReceiveCount: 10             // SQS: Max receives before DLQ
  }
});
```

#### `getQueue(config)`

Retrieves information about an existing queue.

```typescript
const result = await queueService.getQueue({
  nameOrUrl: 'my-queue' // Can be queue name or full URL
});
```

#### `listQueues(config?)`

Lists all queues, optionally filtered by prefix.

```typescript
const result = await queueService.listQueues({
  prefix: 'my-app-',
  maxResults: 50,
  nextToken: 'pagination-token'
});
```

#### `deleteQueue(config)`

Deletes a queue and all its messages.

```typescript
const result = await queueService.deleteQueue({
  nameOrUrl: 'my-queue'
});
```

### Task Management

#### `createTask(config)`

Sends a new task to a queue.

```typescript
const result = await queueService.createTask({
  queueNameOrUrl: 'my-queue',
  task: {
    body: {
      message: 'Process this data',
      userId: 123,
      data: { /* complex object */ }
    },
    delaySeconds: 60,                    // Delay execution
    priority: 5,                         // Priority (if supported)
    messageGroupId: 'group-1',           // FIFO group ID (SQS)
    messageDeduplicationId: 'unique-123' // Deduplication ID (SQS FIFO)
  }
});
```

#### `listTasks(config)`

Retrieves tasks from a queue.

```typescript
const result = await queueService.listTasks({
  queueNameOrUrl: 'my-queue',
  maxResults: 10,
  visibilityTimeout: 30, // Hide messages for 30 seconds
  waitTimeSeconds: 20    // Long poll for up to 20 seconds
});
```

#### `forceTask(config)`

Forces immediate execution of a task (if supported).

```typescript
const result = await queueService.forceTask({
  queueNameOrUrl: 'my-queue',
  taskId: 'task-123'
});
```

> **Note:** This operation is only supported by Google Cloud Tasks. SQS and RabbitMQ do not support forcing task execution.

#### `deleteTask(config)`

Deletes a task from a queue.

```typescript
const result = await queueService.deleteTask({
  queueNameOrUrl: 'my-queue',
  taskId: 'task-123'
});
```

> **Note:** For SQS, you need the receipt handle from the task attributes. For RabbitMQ, you need the delivery tag.

### Health Checks

#### `health()`

Checks the health of the configured provider.

```typescript
const healthResult = await queueService.health();
console.log(healthResult);
// { ok: true, message: 'SQS is healthy' }
```



## Error Handling

The service provides specific error types:

```typescript
import {
  QueueError,
  QueueValidationError,
  QueueNotFoundError,
  QueueConnectionError,
  QueueTimeoutError,
  QueueRateLimitError
} from 'basepack';

try {
  await queueService.createQueue({ name: 'invalid-name!' });
} catch (error) {
  if (error instanceof QueueValidationError) {
    console.log('Validation failed:', error.message);
    console.log('Field:', error.field);
  } else if (error instanceof QueueConnectionError) {
    console.log('Connection error:', error.message);
  }
}
```

## Provider-Specific Features

### Amazon SQS

- **FIFO Queues:** Enable with `fifoQueue: true` in queue properties
- **Dead Letter Queues:** Configure with `deadLetterTargetArn` and `maxReceiveCount`
- **Long Polling:** Set `receiveMessageWaitTimeSeconds` up to 20 seconds
- **Message Retention:** Up to 14 days (`1209600` seconds)
- **Visibility Timeout:** Hide messages for processing (0-43200 seconds)

### RabbitMQ

- **Message Acknowledgments:** Handle with receipt handles
- **Durable Queues:** Enabled by default
- **Priority Queuing:** Set `priority` on tasks
- **Message TTL:** Configure with `messageRetentionPeriod`
- **Exchange Types:** Direct, topic, fanout, headers

### Google Cloud Tasks

- **HTTP Tasks:** Send HTTP requests to any endpoint
- **App Engine Tasks:** Target App Engine services
- **Scheduled Execution:** Use `delaySeconds` for future execution
- **Rate Limiting:** Configure `maxDispatchesPerSecond`
- **Retry Policies:** Configure retry attempts and durations
- **Force Execution:** Use `forceTask()` for immediate execution

## Best Practices

1. **Queue Naming:** Use consistent naming conventions
   - SQS: 1-80 characters, alphanumeric, hyphens, underscores
   - RabbitMQ: Up to 255 characters, avoid spaces and special chars
   - Google Cloud: 1-500 characters, alphanumeric, hyphens, underscores

2. **Message Size:** Consider provider limits
   - SQS: 256 KB
   - RabbitMQ: No hard limit (depends on server config)
   - Google Cloud: 100 KB

3. **Error Handling:** Always handle provider-specific errors
4. **Health Checks:** Monitor provider health in production
5. **Configuration:** Use environment variables for sensitive credentials

## Examples

### Batch Processing

```typescript
// Send multiple tasks
const tasks = [
  { body: { id: 1, data: 'item1' } },
  { body: { id: 2, data: 'item2' } },
  { body: { id: 3, data: 'item3' } }
];

const results = await Promise.all(
  tasks.map(task =>
    queueService.createTask({
      queueNameOrUrl: 'batch-processor',
      task
    })
  )
);
```

### Scheduled Tasks

```typescript
// Schedule task for future execution
await queueService.createTask({
  queueNameOrUrl: 'scheduled-tasks',
  task: {
    body: { action: 'send-reminder', userId: 123 },
    delaySeconds: 3600 // Execute in 1 hour
  }
});
```

### FIFO Processing

```typescript
// Create FIFO queue (SQS only)
await queueService.createQueue({
  name: 'my-fifo-queue.fifo',
  properties: {
    fifoQueue: true,
    contentBasedDeduplication: true
  }
});

// Send messages in order
await queueService.createTask({
  queueNameOrUrl: 'my-fifo-queue.fifo',
  task: {
    body: { step: 1, action: 'process-order', orderId: '123' },
    messageGroupId: 'order-123',
    messageDeduplicationId: 'step-1-123'
  }
});
```
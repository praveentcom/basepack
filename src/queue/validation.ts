/**
 * Queue service validation utilities
 * @module queue/validation
 */

import {
  CreateQueueConfig,
  GetQueueConfig,
  ListQueuesConfig,
  CreateTaskConfig,
  ListTasksConfig,
  TaskOperationConfig,
  Task,
  QueueProperties
} from './types';
import { QueueProvider } from './types';
import {
  QueueValidationError,
  TaskValidationError,
  QueueConfigurationError
} from './errors';

/**
 * Validates queue name according to provider-specific rules.
 */
export function validateQueueName(name: string, provider: QueueProvider): void {
  if (!name || typeof name !== 'string') {
    throw new QueueValidationError('Queue name is required and must be a string', provider, 'name');
  }

  name = name.trim();
  if (!name) {
    throw new QueueValidationError('Queue name cannot be empty', provider, 'name');
  }

  switch (provider) {
    case QueueProvider.SQS:
      // SQS: 1-80 characters, alphanumeric, hyphens, and underscores
      if (name.length < 1 || name.length > 80) {
        throw new QueueValidationError(
          'SQS queue name must be between 1 and 80 characters',
          provider,
          'name'
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new QueueValidationError(
          'SQS queue name can only contain alphanumeric characters, hyphens, and underscores',
          provider,
          'name'
        );
      }
      break;

    case QueueProvider.RABBITMQ:
      // RabbitMQ: Most characters allowed except some special ones
      if (name.length > 255) {
        throw new QueueValidationError(
          'RabbitMQ queue name must not exceed 255 characters',
          provider,
          'name'
        );
      }
      if (/[\s'":]/.test(name)) {
        throw new QueueValidationError(
          'RabbitMQ queue name cannot contain spaces, quotes, or colons',
          provider,
          'name'
        );
      }
      break;

    case QueueProvider.GOOGLE_CLOUD_TASKS:
      // Google Cloud Tasks: More restrictive
      if (name.length < 1 || name.length > 500) {
        throw new QueueValidationError(
          'Google Cloud Tasks queue name must be between 1 and 500 characters',
          provider,
          'name'
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        throw new QueueValidationError(
          'Google Cloud Tasks queue name can only contain alphanumeric characters, hyphens, and underscores',
          provider,
          'name'
        );
      }
      break;
  }
}

/**
 * Validates create queue configuration.
 */
export function validateCreateQueueConfig(config: CreateQueueConfig, provider: QueueProvider): void {
  if (!config) {
    throw new QueueValidationError('Create queue configuration is required', provider);
  }

  validateQueueName(config.name, provider);

  if (config.properties) {
    validateQueueProperties(config.properties, provider);
  }
}

/**
 * Validates get queue configuration.
 */
export function validateGetQueueConfig(config: GetQueueConfig, provider: QueueProvider): void {
  if (!config) {
    throw new QueueValidationError('Get queue configuration is required', provider);
  }

  if (!config.nameOrUrl || typeof config.nameOrUrl !== 'string') {
    throw new QueueValidationError(
      'Queue name or URL is required and must be a string',
      provider,
      'nameOrUrl'
    );
  }

  const trimmed = config.nameOrUrl.trim();
  if (!trimmed) {
    throw new QueueValidationError('Queue name or URL cannot be empty', provider, 'nameOrUrl');
  }
}

/**
 * Validates list queues configuration.
 */
export function validateListQueuesConfig(config: ListQueuesConfig, provider: QueueProvider): void {
  if (!config) {
    return; // Empty config is valid
  }

  if (config.prefix !== undefined) {
    if (typeof config.prefix !== 'string') {
      throw new QueueValidationError('Prefix must be a string', provider, 'prefix');
    }
    if (config.prefix.length > 1000) {
      throw new QueueValidationError('Prefix is too long', provider, 'prefix');
    }
  }

  if (config.maxResults !== undefined) {
    if (typeof config.maxResults !== 'number' || config.maxResults < 1) {
      throw new QueueValidationError(
        'maxResults must be a positive number',
        provider,
        'maxResults'
      );
    }
    // Provider-specific limits
    switch (provider) {
      case QueueProvider.SQS:
        if (config.maxResults > 1000) {
          throw new QueueValidationError(
            'SQS maxResults cannot exceed 1000',
            provider,
            'maxResults'
          );
        }
        break;
      case QueueProvider.GOOGLE_CLOUD_TASKS:
        if (config.maxResults > 100) {
          throw new QueueValidationError(
            'Google Cloud Tasks maxResults cannot exceed 100',
            provider,
            'maxResults'
          );
        }
        break;
    }
  }
}

/**
 * Validates create task configuration.
 */
export function validateCreateTaskConfig(config: CreateTaskConfig, provider: QueueProvider): void {
  if (!config) {
    throw new QueueValidationError('Create task configuration is required', provider);
  }

  if (!config.queueNameOrUrl || typeof config.queueNameOrUrl !== 'string') {
    throw new QueueValidationError(
      'Queue name or URL is required and must be a string',
      provider,
      'queueNameOrUrl'
    );
  }

  if (!config.task) {
    throw new QueueValidationError('Task data is required', provider, 'task');
  }

  validateTask(config.task, provider);
}

/**
 * Validates list tasks configuration.
 */
export function validateListTasksConfig(config: ListTasksConfig, provider: QueueProvider): void {
  if (!config) {
    throw new QueueValidationError('List tasks configuration is required', provider);
  }

  if (!config.queueNameOrUrl || typeof config.queueNameOrUrl !== 'string') {
    throw new QueueValidationError(
      'Queue name or URL is required and must be a string',
      provider,
      'queueNameOrUrl'
    );
  }

  if (config.maxResults !== undefined) {
    if (typeof config.maxResults !== 'number' || config.maxResults < 1) {
      throw new QueueValidationError(
        'maxResults must be a positive number',
        provider,
        'maxResults'
      );
    }
    // Provider-specific limits
    switch (provider) {
      case QueueProvider.SQS:
        if (config.maxResults > 10) {
          throw new QueueValidationError(
            'SQS maxResults cannot exceed 10',
            provider,
            'maxResults'
          );
        }
        break;
      case QueueProvider.GOOGLE_CLOUD_TASKS:
        if (config.maxResults > 1000) {
          throw new QueueValidationError(
            'Google Cloud Tasks maxResults cannot exceed 1000',
            provider,
            'maxResults'
          );
        }
        break;
    }
  }

  if (config.visibilityTimeout !== undefined) {
    if (typeof config.visibilityTimeout !== 'number' || config.visibilityTimeout < 0) {
      throw new QueueValidationError(
        'visibilityTimeout must be a non-negative number',
        provider,
        'visibilityTimeout'
      );
    }
    if (provider === QueueProvider.SQS && config.visibilityTimeout > 43200) {
      throw new QueueValidationError(
        'SQS visibilityTimeout cannot exceed 43200 seconds (12 hours)',
        provider,
        'visibilityTimeout'
      );
    }
  }

  if (config.waitTimeSeconds !== undefined) {
    if (typeof config.waitTimeSeconds !== 'number' || config.waitTimeSeconds < 0) {
      throw new QueueValidationError(
        'waitTimeSeconds must be a non-negative number',
        provider,
        'waitTimeSeconds'
      );
    }
    if (provider === QueueProvider.SQS && config.waitTimeSeconds > 20) {
      throw new QueueValidationError(
        'SQS waitTimeSeconds cannot exceed 20 seconds',
        provider,
        'waitTimeSeconds'
      );
    }
  }
}

/**
 * Validates task operation configuration.
 */
export function validateTaskOperationConfig(config: TaskOperationConfig, provider: QueueProvider): void {
  if (!config) {
    throw new QueueValidationError('Task operation configuration is required', provider);
  }

  if (!config.queueNameOrUrl || typeof config.queueNameOrUrl !== 'string') {
    throw new QueueValidationError(
      'Queue name or URL is required and must be a string',
      provider,
      'queueNameOrUrl'
    );
  }

  if (!config.taskId || typeof config.taskId !== 'string') {
    throw new QueueValidationError(
      'Task ID is required and must be a string',
      provider,
      'taskId'
    );
  }

  const trimmed = config.taskId.trim();
  if (!trimmed) {
    throw new QueueValidationError('Task ID cannot be empty', provider, 'taskId');
  }
}

/**
 * Validates task data.
 */
export function validateTask(task: Task, provider: QueueProvider): void {
  if (!task) {
    throw new TaskValidationError('Task is required', provider);
  }

  if (task.body === undefined || task.body === null) {
    throw new TaskValidationError('Task body is required', provider, 'body');
  }

  // Validate task size for providers with limits
  const bodySize = JSON.stringify(task.body).length;
  switch (provider) {
    case QueueProvider.SQS:
      if (bodySize > 262144) {
        throw new TaskValidationError(
          'SQS task body cannot exceed 256 KB',
          provider,
          'body'
        );
      }
      break;
    case QueueProvider.GOOGLE_CLOUD_TASKS:
      if (bodySize > 102400) {
        throw new TaskValidationError(
          'Google Cloud Tasks task body cannot exceed 100 KB',
          provider,
          'body'
        );
      }
      break;
  }

  if (task.delaySeconds !== undefined) {
    if (typeof task.delaySeconds !== 'number' || task.delaySeconds < 0) {
      throw new TaskValidationError(
        'delaySeconds must be a non-negative number',
        provider,
        'delaySeconds'
      );
    }
    if (provider === QueueProvider.SQS && task.delaySeconds > 900) {
      throw new TaskValidationError(
        'SQS delaySeconds cannot exceed 900 seconds (15 minutes)',
        provider,
        'delaySeconds'
      );
    }
  }

  if (task.priority !== undefined) {
    if (typeof task.priority !== 'number' || task.priority < 0) {
      throw new TaskValidationError(
        'priority must be a non-negative number',
        provider,
        'priority'
      );
    }
  }

  if (task.messageGroupId !== undefined) {
    if (typeof task.messageGroupId !== 'string') {
      throw new TaskValidationError(
        'messageGroupId must be a string',
        provider,
        'messageGroupId'
      );
    }
    if (provider === QueueProvider.SQS && !/^[a-zA-Z0-9_-]{1,128}$/.test(task.messageGroupId)) {
      throw new TaskValidationError(
        'SQS messageGroupId must be 1-128 alphanumeric characters, hyphens, and underscores',
        provider,
        'messageGroupId'
      );
    }
  }

  if (task.messageDeduplicationId !== undefined) {
    if (typeof task.messageDeduplicationId !== 'string') {
      throw new TaskValidationError(
        'messageDeduplicationId must be a string',
        provider,
        'messageDeduplicationId'
      );
    }
    if (provider === QueueProvider.SQS && !/^[a-zA-Z0-9_-]{1,128}$/.test(task.messageDeduplicationId)) {
      throw new TaskValidationError(
        'SQS messageDeduplicationId must be 1-128 alphanumeric characters, hyphens, and underscores',
        provider,
        'messageDeduplicationId'
      );
    }
  }
}

/**
 * Validates queue properties.
 */
export function validateQueueProperties(properties: Partial<QueueProperties>, provider: QueueProvider): void {
  if (!properties) {
    return;
  }

  // Validate common properties
  if (properties.visibilityTimeout !== undefined) {
    if (typeof properties.visibilityTimeout !== 'number' || properties.visibilityTimeout < 0) {
      throw new QueueValidationError(
        'visibilityTimeout must be a non-negative number',
        provider,
        'visibilityTimeout'
      );
    }
    if (provider === QueueProvider.SQS && (properties.visibilityTimeout < 0 || properties.visibilityTimeout > 43200)) {
      throw new QueueValidationError(
        'SQS visibilityTimeout must be between 0 and 43200 seconds',
        provider,
        'visibilityTimeout'
      );
    }
  }

  if (properties.messageRetentionPeriod !== undefined) {
    if (typeof properties.messageRetentionPeriod !== 'number' || properties.messageRetentionPeriod < 60) {
      throw new QueueValidationError(
        'messageRetentionPeriod must be at least 60 seconds',
        provider,
        'messageRetentionPeriod'
      );
    }
    if (provider === QueueProvider.SQS && properties.messageRetentionPeriod > 1209600) {
      throw new QueueValidationError(
        'SQS messageRetentionPeriod cannot exceed 1209600 seconds (14 days)',
        provider,
        'messageRetentionPeriod'
      );
    }
  }

  if (properties.maximumMessageSize !== undefined) {
    if (typeof properties.maximumMessageSize !== 'number' || properties.maximumMessageSize < 1024) {
      throw new QueueValidationError(
        'maximumMessageSize must be at least 1024 bytes',
        provider,
        'maximumMessageSize'
      );
    }
    if (provider === QueueProvider.SQS && properties.maximumMessageSize > 262144) {
      throw new QueueValidationError(
        'SQS maximumMessageSize cannot exceed 262144 bytes (256 KB)',
        provider,
        'maximumMessageSize'
      );
    }
  }

  if (properties.delaySeconds !== undefined) {
    if (typeof properties.delaySeconds !== 'number' || properties.delaySeconds < 0) {
      throw new QueueValidationError(
        'delaySeconds must be a non-negative number',
        provider,
        'delaySeconds'
      );
    }
    if (provider === QueueProvider.SQS && properties.delaySeconds > 900) {
      throw new QueueValidationError(
        'SQS delaySeconds cannot exceed 900 seconds (15 minutes)',
        provider,
        'delaySeconds'
      );
    }
  }

  if (properties.receiveMessageWaitTimeSeconds !== undefined) {
    if (typeof properties.receiveMessageWaitTimeSeconds !== 'number' || properties.receiveMessageWaitTimeSeconds < 0) {
      throw new QueueValidationError(
        'receiveMessageWaitTimeSeconds must be a non-negative number',
        provider,
        'receiveMessageWaitTimeSeconds'
      );
    }
    if (provider === QueueProvider.SQS && properties.receiveMessageWaitTimeSeconds > 20) {
      throw new QueueValidationError(
        'SQS receiveMessageWaitTimeSeconds cannot exceed 20 seconds',
        provider,
        'receiveMessageWaitTimeSeconds'
      );
    }
  }

  // Validate FIFO-specific properties for SQS
  if (provider === QueueProvider.SQS) {
    if (properties.fifoQueue && properties.contentBasedDeduplication !== undefined) {
      if (typeof properties.contentBasedDeduplication !== 'boolean') {
        throw new QueueValidationError(
          'contentBasedDeduplication must be a boolean',
          provider,
          'contentBasedDeduplication'
        );
      }
    }
  }
}

/**
 * Validates provider configuration.
 */
export function validateProviderConfig(provider: QueueProvider, config: any): void {
  if (!config || typeof config !== 'object') {
    return; // Empty config is valid
  }

  switch (provider) {
    case QueueProvider.SQS:
      if (config.region && typeof config.region !== 'string') {
        throw new QueueConfigurationError('SQS region must be a string', provider, 'region');
      }
      break;

    case QueueProvider.RABBITMQ:
      if (config.url && typeof config.url !== 'string') {
        throw new QueueConfigurationError('RabbitMQ URL must be a string', provider, 'url');
      }
      if (config.port && (typeof config.port !== 'number' || config.port < 1 || config.port > 65535)) {
        throw new QueueConfigurationError('RabbitMQ port must be a valid port number', provider, 'port');
      }
      break;

    case QueueProvider.GOOGLE_CLOUD_TASKS:
      if (config.projectId && typeof config.projectId !== 'string') {
        throw new QueueConfigurationError(
          'Google Cloud project ID must be a string',
          provider,
          'projectId'
        );
      }
      if (config.location && typeof config.location !== 'string') {
        throw new QueueConfigurationError(
          'Google Cloud location must be a string',
          provider,
          'location'
        );
      }
      break;
  }
}
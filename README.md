# Basepack

An opinionated library of ready-to-use service utilities for backend applications. Comprises of commonly used services like email, cache, storage, logging, etc.

[![npm version](https://badge.fury.io/js/basepack.svg)](https://www.npmjs.com/package/basepack)
[![CI](https://github.com/praveentcom/basepack/actions/workflows/ci.yml/badge.svg)](https://github.com/praveentcom/basepack/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/praveentcom/basepack/branch/main/graph/badge.svg?token=Lh9pAkx9m6)](https://codecov.io/gh/praveentcom/basepack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

Basepack provides production-ready service utilities for Node.js backend applications. Built with TypeScript, it offers multi-provider support with automatic failover, making your backend services more resilient and flexible. It includes commonly used services like email, cache, storage, and more.

**Key Features:**
- Built-in validation
- Full TypeScript support with comprehensive JSDoc
- Lightweight with optional peer dependencies
- Logger injection support for monitoring and debugging

## Installation

```bash
npm install basepack
```

## Services

### Email

Multi-provider email service with support for popular providers.

**Quick Example:**
```typescript
import { EmailService, EmailProvider } from 'basepack';

const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: { apiKey: process.env.SENDGRID_API_KEY }
});

await service.send({
  message: {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Hello',
    html: '<p>Hello World</p>'
  }
});
```

#### Supported Providers

| Provider | Package Required |
|----------|------------------|
| SendGrid | None |
| Mailgun | None |
| Resend | None |
| Postmark | None |
| AWS SES | `@aws-sdk/client-ses` |
| SMTP | `nodemailer` |

**[Complete Email Documentation](./docs/email/README.md)** - Setup guides, configuration, examples, and API reference

### Cache

Multi-provider caching service for high-performance data caching with Redis, Valkey, Memcached, and Amazon ElastiCache support.

**Quick Example:**
```typescript
import { CacheService, CacheProvider } from 'basepack';

const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'localhost',
    port: 6379
  }
});

// Set a value with TTL
await cache.set({
  key: 'user:123',
  value: { name: 'John', email: 'john@example.com' },
  ttl: 3600
});

// Get a value
const result = await cache.get({ key: 'user:123' });
if (result.found) {
  console.log('User:', result.value);
}
```

#### Supported Providers

| Provider | Package Required | Notes |
|----------|------------------|-------|
| Redis | `ioredis` | Self-hosted or managed Redis |
| Valkey | `ioredis` | Open-source Redis fork (fully Redis-compatible) |
| Memcached | `memcached` | Self-hosted or managed Memcached |
| Amazon ElastiCache | `ioredis` or `memcached` | Use Redis or Memcached adapter with ElastiCache endpoints |

**[Complete Cache Documentation](./docs/cache/README.md)** - Setup guides, configuration, examples, and API reference

### Storage

Multi-provider storage service for file operations with support for AWS S3, Google Cloud Storage, Azure Blob Storage, and S3-compatible services.

**Quick Example:**
```typescript
import { StorageService, StorageProvider } from 'basepack';

const storage = new StorageService({
  provider: StorageProvider.S3,
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1'
  }
});

// Upload a file
await storage.upload({
  key: 'documents/report.pdf',
  data: buffer,
  contentType: 'application/pdf'
});

// Generate signed URL
const result = await storage.getSignedUrl({
  key: 'documents/report.pdf',
  expiresIn: 3600
});
```

#### Supported Providers

| Provider | Package Required |
|----------|------------------|
| AWS S3 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| Google Cloud Storage | `@google-cloud/storage` |
| Azure Blob Storage | `@azure/storage-blob` |

**[Complete Storage Documentation](./docs/storage/README.md)** - Setup guides, configuration, examples, and API reference

### Messaging

Multi-provider messaging for SMS, WhatsApp, and RCS with automatic failover across providers.

**Quick Example:**
```typescript
import { MessagingService, MessagingProvider } from 'basepack';

const messaging = new MessagingService({
  provider: MessagingProvider.TWILIO,
  config: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN
  }
});

await messaging.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Hello from Basepack!'
  }
});
```

#### Supported Providers

| Provider | Package Required | Notes |
|----------|------------------|-------|
| Twilio | None | SMS, WhatsApp, RCS |
| AWS SNS | `@aws-sdk/client-sns` | SMS |
| Meta (WhatsApp) | None | WhatsApp Business |
| MSG91 | None | SMS |
| Vonage | None | SMS, WhatsApp |
| Plivo | None | SMS |
| MessageBird | None | SMS, WhatsApp |

**[Complete Messaging Documentation](./docs/messaging/README.md)** - Setup guides, configuration, examples, and API reference

### Notification

Unified push notifications for iOS (APNs), Android/Web (FCM), and Web Push, with batch sending and per-platform options.

**Quick Example:**
```typescript
import { NotificationService, NotificationProvider } from 'basepack';

const notifications = new NotificationService({
  provider: NotificationProvider.FCM,
  config: { projectId: 'my-project' }
});

await notifications.send({
  message: {
    to: 'device-token',
    title: 'Hello',
    body: 'You have a new message'
  }
});
```

#### Supported Providers

| Provider | Package Required |
|----------|------------------|
| FCM | `firebase-admin` |
| APNs | `@parse/node-apn` |
| Web Push | `web-push` |

**[Complete Notification Documentation](./docs/notification/README.md)** - Setup guides, configuration, examples, and API reference

### Queue

Abstraction over popular queue backends for creating queues and dispatching background tasks.

**Quick Example:**
```typescript
import { QueueService, QueueProvider } from 'basepack';

const queue = new QueueService({
  provider: QueueProvider.SQS,
  config: { region: 'us-east-1' }
});

await queue.createTask({
  queueNameOrUrl: 'my-queue',
  task: {
    body: { type: 'email', to: 'user@example.com' },
    delaySeconds: 0
  }
});
```

#### Supported Providers

| Provider | Package Required |
|----------|------------------|
| Amazon SQS | `@aws-sdk/client-sqs` |
| RabbitMQ | `amqplib` |
| Google Cloud Tasks | `@google-cloud/tasks` |

**[Complete Queue Documentation](./docs/queue/README.md)** - Setup guides, configuration, examples, and API reference

## Logging

All services log with colored output by default. You can customize logging by injecting your own logger or disable it entirely with `noopLogger`.

**Default Behavior (logs to console):**
```typescript
import { EmailService } from 'basepack';
import { EmailProvider } from 'basepack';

const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: { apiKey: process.env.SENDGRID_API_KEY }
});
// Output: Basepack Email: Initializing service { provider: EmailProvider.SENDGRID }
```

**Disable Logging:**
```typescript
import { EmailService, noopLogger } from 'basepack';
import { EmailProvider } from 'basepack';

const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: { apiKey: process.env.SENDGRID_API_KEY },
  logger: noopLogger  // Silent - no logs
});
```

**Use Custom Logger (Pino):**
```typescript
import { EmailService, wrapPino } from 'basepack';
import { EmailProvider } from 'basepack';
import pino from 'pino';

const logger = wrapPino(pino({ level: 'debug' }));

const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: { apiKey: process.env.SENDGRID_API_KEY },
  logger
});
```

**Custom loggers:**
- `wrapPino(pinoLogger)` - Pino logger
- `wrapWinston(winstonLogger)` - Winston logger
- `wrapBunyan(bunyanLogger)` - Bunyan logger
- `noopLogger` - Silent logger (no output)
- Or implement the simple `Logger` interface for any other logger

## Requirements

- **Node.js** >= 22.0.0
- **TypeScript** >= 5.0 (for TypeScript users)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/praveentcom/basepack.git
cd basepack

# Install dependencies
npm install

# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage -- tests/unit

# Build
npm run build

# Run in watch mode
npm run dev
```

## License

MIT License - Copyright (c) 2025 Praveen Thirumurugan

See [LICENSE](./LICENSE) for details.

## Links

- [npm Package](https://www.npmjs.com/package/basepack)
- [GitHub Repository](https://github.com/praveentcom/basepack)
- [Issue Tracker](https://github.com/praveentcom/basepack/issues)
- [Changelog](./CHANGELOG.md)
- [Email Service Documentation](./docs/email/README.md)
- [Storage Service Documentation](./docs/storage/README.md)
 - [Messaging Service Documentation](./docs/messaging/README.md)
 - [Notification Service Documentation](./docs/notification/README.md)
 - [Queue Service Documentation](./docs/queue/README.md)

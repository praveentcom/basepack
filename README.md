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

Multi-provider caching service for high-performance data caching with Redis and Memcached support.

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

| Provider | Package Required |
|----------|------------------|
| Redis | `ioredis` |
| Memcached | `memcached` |

**[Complete Cache Documentation](./docs/cache/README.md)** - Setup guides, configuration, examples, and API reference

### Storage

Multi-provider storage service for file operations with support for AWS S3, Google Cloud Storage, and S3-compatible services.

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

**[Complete Storage Documentation](./docs/storage/README.md)** - Setup guides, configuration, examples, and API reference

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

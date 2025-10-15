# Basepack

> Ready-to-use service utilities for backend applications with multi-provider support and automatic failover.

[![npm version](https://badge.fury.io/js/basepack.svg)](https://www.npmjs.com/package/basepack)
[![CI](https://github.com/praveentcom/basepack/actions/workflows/ci.yml/badge.svg)](https://github.com/praveentcom/basepack/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/praveentcom/basepack/branch/main/graph/badge.svg?token=Lh9pAkx9m6)](https://codecov.io/gh/praveentcom/basepack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## About

Basepack provides production-ready service utilities for Node.js backend applications. Built with TypeScript, it offers multi-provider support with automatic failover, making your backend services more resilient and flexible.

**Key Features:**
- Built-in validation
- Full TypeScript support with comprehensive JSDoc
- Lightweight with optional peer dependencies

## Installation

```bash
npm install basepack
```

## Services

### Email

Multi-provider email service with support for popular providers.

**Quick Example:**
```typescript
import { EmailService } from 'basepack';

const service = new EmailService({
  provider: 'sendgrid',
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

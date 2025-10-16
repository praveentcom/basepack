# Email Service

Multi-provider email service with automatic failover, retry logic, and validation.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported Providers](#supported-providers)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
- [API Reference](#api-reference)

## Installation

```bash
npm install basepack
```

### Provider-Specific Dependencies

Install additional packages based on which providers you use:

```bash
# For AWS SES
npm install @aws-sdk/client-ses

# For SMTP
npm install nodemailer

# For SendGrid, Mailgun, Resend, Postmark
# No additional packages needed
```

## Quick Start

### Single Provider

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
    subject: 'Hello World',
    html: '<h1>Hello!</h1><p>This is a test email.</p>',
    text: 'Hello! This is a test email.'
  }
});
```

### With Automatic Failover

```typescript
const service = new EmailService({
  primary: { provider: EmailProvider.SES, config: { region: 'us-east-1' } },
  backups: [
    { provider: EmailProvider.SENDGRID, config: { apiKey: process.env.SENDGRID_API_KEY } },
    { provider: EmailProvider.SMTP, config: { 
      host: 'smtp.gmail.com', 
      port: 587,
      auth: { user: 'user@gmail.com', pass: 'password' }
    }}
  ]
});
```

## Supported Providers

| Provider | Package Required | Documentation |
|----------|------------------|---------------|
| AWS SES | `@aws-sdk/client-ses` | [Configuration](#aws-ses-configuration) |
| SendGrid | None | [Configuration](#sendgrid-configuration) |
| Mailgun | None | [Configuration](#mailgun-configuration) |
| Resend | None | [Configuration](#resend-configuration) |
| Postmark | None | [Configuration](#postmark-configuration) |
| SMTP | `nodemailer` | [Configuration](#smtp-configuration) |

## Configuration

All providers support both programmatic configuration and environment variables.

### AWS SES Configuration

**Package Required:** `@aws-sdk/client-ses`

```typescript
const service = new EmailService({
  provider: EmailProvider.SES,
  config: {
    region: 'us-east-1',           // AWS region
    accessKeyId: 'YOUR_KEY',       // AWS credentials
    secretAccessKey: 'YOUR_SECRET',
    sessionToken: 'TOKEN',         // Optional, for temporary credentials
    endpoint: 'http://localhost:4566' // Optional, for LocalStack
  }
});
```

**Environment Variables:**
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_SESSION_TOKEN` - Session token (optional)
- `AWS_ENDPOINT_URL` - Custom endpoint (optional)

---

### SendGrid Configuration

**Package Required:** None (uses built-in `fetch`)

```typescript
const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: {
    apiKey: 'YOUR_SENDGRID_API_KEY',
    endpoint: 'https://api.sendgrid.com/v3' // Optional
  }
});
```

**Environment Variables:**
- `SENDGRID_API_KEY` - SendGrid API key

---

### Mailgun Configuration

**Package Required:** None (uses built-in `fetch`)

```typescript
const service = new EmailService({
  provider: EmailProvider.MAILGUN,
  config: {
    apiKey: 'YOUR_MAILGUN_API_KEY',
    domain: 'your-domain.com',
    region: 'us' // or 'eu'
  }
});
```

**Environment Variables:**
- `MAILGUN_API_KEY` - Mailgun API key
- `MAILGUN_DOMAIN` - Your verified domain
- `MAILGUN_REGION` - Region (us or eu)

---

### Resend Configuration

**Package Required:** None (uses built-in `fetch`)

```typescript
const service = new EmailService({
  provider: EmailProvider.RESEND,
  config: {
    apiKey: 'YOUR_RESEND_API_KEY'
  }
});
```

**Environment Variables:**
- `RESEND_API_KEY` - Resend API key

---

### Postmark Configuration

**Package Required:** None (uses built-in `fetch`)

```typescript
const service = new EmailService({
  provider: EmailProvider.POSTMARK,
  config: {
    serverToken: 'YOUR_POSTMARK_SERVER_TOKEN'
  }
});
```

**Environment Variables:**
- `POSTMARK_SERVER_TOKEN` - Postmark server token

**Note:** Postmark provider automatically uses batch API when sending multiple messages for improved performance.

---

### SMTP Configuration

**Package Required:** `nodemailer`

```typescript
const service = new EmailService({
  provider: EmailProvider.SMTP,
  config: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    pool: true,           // Use connection pooling
    maxConnections: 5,    // Max simultaneous connections
    maxMessages: 100,     // Max messages per connection
    tls: {
      rejectUnauthorized: true
    }
  }
});
```

**Environment Variables:**
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port
- `SMTP_USER` - Username
- `SMTP_PASS` - Password
- `SMTP_SECURE` - Use TLS (true/false)

**Common SMTP Servers:**

| Service | Host | Port | Secure |
|---------|------|------|--------|
| Gmail | smtp.gmail.com | 587 | false |
| Outlook | smtp-mail.outlook.com | 587 | false |
| Yahoo | smtp.mail.yahoo.com | 465 | true |
| Custom | your-server.com | 587/465 | varies |

**Note:** For Gmail, use App Passwords instead of your regular password. For Yahoo and other providers, check your provider's SMTP documentation.

---

## Usage Examples

### Send Email with Attachments

```typescript
import fs from 'fs';

await service.send({
  message: {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Invoice #12345',
    html: '<p>Please find your invoice attached.</p>',
    attachments: [{
      filename: 'invoice.pdf',
      content: fs.readFileSync('invoice.pdf'),
      contentType: 'application/pdf'
    }]
  }
});
```

### Batch Sending

```typescript
await service.send({
  messages: [
    { from: 'sender@example.com', to: 'user1@example.com', subject: 'Hi User 1', html: '<p>Welcome!</p>' },
    { from: 'sender@example.com', to: 'user2@example.com', subject: 'Hi User 2', html: '<p>Welcome!</p>' },
    { from: 'sender@example.com', to: 'user3@example.com', subject: 'Hi User 3', html: '<p>Welcome!</p>' },
  ]
});
```

### CC and BCC

```typescript
await service.send({
  message: {
    from: 'sender@example.com',
    to: 'primary@example.com',
    cc: ['manager@example.com', 'team@example.com'],
    bcc: 'archive@example.com',
    subject: 'Team Update',
    html: '<p>Weekly update...</p>'
  }
});
```

### Custom Retry Configuration

```typescript
await service.send({
  message: myEmail,
  opts: {
    retries: 5,              // Number of retry attempts
    retryMinTimeout: 2000,   // 2 seconds minimum
    retryMaxTimeout: 30000,  // 30 seconds maximum
    retryFactor: 2           // Exponential growth
  }
});
```

### Disable Validation

```typescript
// Skip validation if you've already validated
await service.send({
  message: myEmail,
  opts: { validateBeforeSend: false }
});
```

### Error Handling

```typescript
import { 
  EmailValidationError, 
  EmailProviderError,
  isEmailValidationError,
  isEmailProviderError
} from 'basepack';

try {
  const results = await service.send({ message: myEmail });
  console.log('Email sent:', results[0].messageId);
  
} catch (error) {
  if (isEmailValidationError(error)) {
    // Validation failed before sending
    console.error(`Invalid ${error.field}: ${error.message}`);
    
  } else if (isEmailProviderError(error)) {
    // All providers failed
    console.error('All providers failed:');
    error.errors.forEach(({ provider, error }) => {
      console.error(`  - ${provider}: ${error}`);
    });
    
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Health Checks

```typescript
const health = await service.health();

if (health.ok) {
  console.log(`Primary provider (${health.provider}) is healthy`);
  console.log('Details:', health.primary.details);
  
  // Check backup providers
  health.backups.forEach(backup => {
    console.log(`${backup.name}: ${backup.health.ok ? 'healthy' : 'unhealthy'}`);
  });
} else {
  console.error('Primary provider is down');
}
```

## Advanced Features

### Email Validation

Validation is enabled by default and checks:
- Email address format (RFC 5322 simplified)
- Display names: `John Doe <john@example.com>`
- Required fields (from, to, subject)
- At least one of text or html content
- Attachment size limits (10MB per file)
- CC and BCC email formats

**Validation Examples:**

```typescript
// Valid formats
'user@example.com'
'John Doe <john@example.com>'
['user1@example.com', 'User Two <user2@example.com>']

// Invalid - throws EmailValidationError
'invalid-email'
'@example.com'
'user@'
```

### Automatic Retry

Retries are automatic for transient failures:

**Retryable Errors:**
- Network errors (timeouts, connection refused, DNS failures)
- Rate limits (HTTP 429)
- Server errors (HTTP 500, 502, 503, 504)
- Provider-specific errors (AWS throttling, SMTP connection issues)

**Default Configuration:**
- Retries: 2 attempts
- Min timeout: 1 second
- Max timeout: 10 seconds
- Factor: 2 (exponential growth)
- Jitter: 10% random variation

**Retry Behavior:**
```
Attempt 1: Immediate
Attempt 2: ~1 second delay
Attempt 3: ~2 second delay
Attempt 4: ~4 second delay (if retries: 3)
```

### Type Safety

TypeScript provides intelligent autocomplete based on the provider:

```typescript
const service = new EmailService({
  provider: EmailProvider.MAILGUN,
  config: {
    // TypeScript autocompletes: apiKey, domain, region, endpoint
    apiKey: '...',
    domain: '...',
    region: 'us' // Autocomplete: 'us' | 'eu'
  }
});

// Different provider = different config fields
const service2 = new EmailService({
  provider: EmailProvider.SES,
  config: {
    // TypeScript autocompletes: region, accessKeyId, secretAccessKey, etc.
    region: 'us-east-1'
  }
});
```

### Discriminated Unions

Send configuration uses discriminated unions for type safety:

```typescript
// Single message
await service.send({
  message: { /* ... */ }
  // messages: [...] // TypeScript error: can't use both
});

// Batch messages
await service.send({
  messages: [{ /* ... */ }]
  // message: { ... } // TypeScript error: can't use both
});
```

## API Reference

### `EmailService`

#### Constructor

```typescript
new EmailService(config: EmailServiceConfig)
```

**Single Provider:**
```typescript
{
  provider: EmailProvider, // or 'ses' | 'sendgrid' | 'mailgun' | 'resend' | 'postmark' | 'smtp'
  config?: ProviderConfig
}
```

**With Failover:**
```typescript
{
  primary: SingleProviderConfig,
  backups?: SingleProviderConfig[]
}
```

#### Methods

##### `send(config: EmailSendConfig): Promise<EmailSendResult[]>`

Sends an email or batch of emails.

**Parameters:**
- `config.message` - Single email message (mutually exclusive with `messages`)
- `config.messages` - Array of email messages (mutually exclusive with `message`)
- `config.opts` - Optional configuration:
  - `retries?: number` - Number of retry attempts (default: 2)
  - `retryMinTimeout?: number` - Min retry delay in ms (default: 1000)
  - `retryMaxTimeout?: number` - Max retry delay in ms (default: 10000)
  - `retryFactor?: number` - Exponential backoff factor (default: 2)
  - `validateBeforeSend?: boolean` - Enable validation (default: true)
  - `timeout?: number` - Operation timeout
  - `metadata?: Record<string, any>` - Custom metadata

**Returns:** Array of `EmailSendResult` objects

**Throws:**
- `EmailValidationError` - If email validation fails
- `EmailProviderError` - If all providers fail

**Example:**
```typescript
const results = await service.send({
  message: {
    from: 'sender@example.com',
    to: 'recipient@example.com',
    subject: 'Hello',
    html: '<p>Hello World</p>'
  },
  opts: {
    retries: 3,
    validateBeforeSend: true
  }
});

console.log(results[0].messageId); // Message ID from provider
console.log(results[0].provider);  // 'ses'
console.log(results[0].success);   // true
```

##### `health(): Promise<HealthStatus>`

Checks health of all configured providers.

**Returns:**
```typescript
{
  ok: boolean,              // Primary provider health
  provider: string,         // Primary provider name
  primary: EmailHealthInfo, // Primary provider details
  backups: Array<{          // Backup provider statuses
    name: string,
    health: EmailHealthInfo
  }>
}
```

**Example:**
```typescript
const health = await service.health();

if (health.ok) {
  console.log('All systems operational');
} else {
  console.error('Primary provider is down, using backups');
}
```

### Types

#### `EmailMessage`

```typescript
interface EmailMessage {
  from: string;                    // Sender (supports display names)
  to: string | string[];           // Recipients
  cc?: string | string[];          // CC recipients
  bcc?: string | string[];         // BCC recipients
  subject: string;                 // Email subject
  text?: string;                   // Plain text (one of text/html required)
  html?: string;                   // HTML content (one of text/html required)
  attachments?: EmailAttachment[]; // File attachments
}
```

#### `EmailAttachment`

```typescript
interface EmailAttachment {
  filename: string;           // File name
  content: Buffer | string;   // File content
  contentType?: string;       // MIME type (e.g., 'application/pdf')
  encoding?: string;          // Encoding (e.g., 'base64', 'utf-8')
}
```

#### `EmailSendResult`

```typescript
interface EmailSendResult {
  success: boolean;    // Whether send succeeded
  messageId?: string;  // Provider's message ID
  error?: string;      // Error message if failed
  provider: string;    // Provider that handled the email
  timestamp: Date;     // When the operation completed
}
```

### Error Classes

#### `EmailError`

Base error class for all email-related errors.

**Properties:**
- `provider: string` - Provider where error occurred
- `statusCode?: number` - HTTP status code
- `isRetryable: boolean` - Whether error should be retried
- `originalError?: unknown` - Original error object

#### `EmailValidationError`

Thrown when email validation fails.

**Properties:**
- `field?: string` - Field that failed validation (e.g., 'from', 'to')

#### `EmailProviderError`

Thrown when all providers fail.

**Properties:**
- `errors: Array<{ provider: string; error: string }>` - Errors from each provider

### Type Guards

```typescript
import { 
  isEmailError,
  isEmailValidationError,
  isEmailProviderError
} from 'basepack';

if (isEmailError(error)) {
  // TypeScript knows error has provider, statusCode, etc.
}
```

## Validation Rules

### Email Address Format

Supports both simple and display name formats:

```typescript
// Simple format
'user@example.com'

// With display name
'John Doe <john@example.com>'

// Multiple recipients
['user1@example.com', 'User Two <user2@example.com>']
```

### Message Requirements

- `from` - Required, must be valid email address
- `to` - Required, must contain at least one valid email address
- `subject` - Required
- `text` or `html` - At least one must be provided
- `cc` and `bcc` - Optional, must be valid if provided
- Attachments - Must have filename and content
- Attachment size limit - 10MB per file

## Best Practices

### Use Environment Variables

Avoid hardcoding credentials:

```typescript
// Recommended
const service = new EmailService({
  provider: EmailProvider.SENDGRID
  // Reads from SENDGRID_API_KEY environment variable
});

// Not recommended
const service = new EmailService({
  provider: EmailProvider.SENDGRID,
  config: { apiKey: 'SG.hardcoded-key' }
});
```

### Handle Errors Appropriately

Always handle promise rejections:

```typescript
try {
  await service.send({ message });
} catch (error) {
  logger.error('Failed to send email', { error });
  // Implement error handling logic
}
```

### Configure Failover for High Availability

For critical transactional emails, configure backup providers:

```typescript
const service = new EmailService({
  primary: { provider: EmailProvider.SES },
  backups: [{ provider: EmailProvider.SENDGRID }]
});
```

### Sanitize User-Generated Content

Always sanitize HTML content from users to prevent XSS attacks:

```typescript
import sanitizeHtml from 'sanitize-html';

const html = sanitizeHtml(userGeneratedContent);
await service.send({ message: { ..., html } });
```

### Implement Health Monitoring

Monitor provider health for production systems:

```typescript
setInterval(async () => {
  const health = await service.health();
  if (!health.ok) {
    logger.warn('Primary provider unhealthy', health);
  }
}, 60000);
```

## Troubleshooting

### "AWS SDK for SES is not installed"

**Solution:** Install the AWS SDK:
```bash
npm install @aws-sdk/client-ses
```

### "nodemailer is not installed"

**Solution:** Install nodemailer:
```bash
npm install nodemailer
```

### All Providers Failed

**Check:**
1. API keys are correct and not expired
2. Environment variables are loaded (use `dotenv`)
3. Provider account is active and in good standing
4. Check provider dashboards for issues
5. Review error messages in `EmailProviderError.errors`

### Validation Errors

**Common Issues:**
- Missing `@` symbol in email addresses
- Missing domain in email addresses
- Both `text` and `html` are missing
- Attachment exceeds 10MB limit

**Solution:** Check the `field` property in `EmailValidationError` to see which field failed.

### Rate Limiting

If you hit rate limits frequently:
1. Use a higher tier plan with your provider
2. Implement application-level rate limiting
3. Use batch sending where supported (Postmark)
4. Configure higher retry delays

## Performance

### Bundle Size

- **Core library:** ~45 KB (minified)
- **With SES:** ~45 KB + ~5 MB (AWS SDK)
- **With SMTP:** ~45 KB + ~2 MB (nodemailer)
- **With SendGrid/Mailgun/Resend/Postmark:** ~45 KB (no extra dependencies)

### Throughput

- **Sequential sending:** ~10-50 emails/second (provider dependent)
- **Batch sending:** Up to 500 emails in single request (Postmark)
- **Connection pooling:** SMTP supports connection pooling for better performance

## Examples

See [examples directory](../../tests/integration/email/adapters/) for working integration tests with each provider.

## Support

- [Documentation](https://github.com/praveentcom/basepack#readme)
- [Issue Tracker](https://github.com/praveentcom/basepack/issues)
- [Discussions](https://github.com/praveentcom/basepack/discussions)

## License

MIT License - Copyright (c) 2025 Praveen Thirumurugan


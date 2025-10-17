# Basepack Code Standards

## TypeScript Rules

- Use strict mode (no `any`, handle nulls explicitly)
- Use `interface` for objects and public APIs
- Use `type` for unions and combinations
- Use proper `enums` for provider names across all services

## Documentation

All exported code needs JSDoc comments:

```typescript
/**
 * Brief description.
 * 
 * @param name - What this parameter does
 * @returns What this returns
 * @throws {ErrorType} When this throws
 * 
 * @example
 * ```typescript
 * const result = myFunction('test');
 * ```
 */
export function myFunction(name: string): string {
  // ...
}
```

For interfaces, document each property:

```typescript
/** Email message configuration. */
export interface EmailMessage {
  /** Sender email address */
  from: string;
  /** Recipient email address(es) */
  to: string | string[];
}
```

## Errors

Create custom error classes with useful context:

```typescript
export class EmailError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'EmailError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EmailError);
    }
  }
}
```

Throw specific errors, not generic ones:

```typescript
// Good
throw new EmailValidationError('Invalid email', 'from');

// Bad
throw new Error('Invalid email');
```

## Provider Adapters

All adapters implement the service interface. Use `require()` with try-catch for optional dependencies:

```typescript
export class SESProvider implements IEmailProvider {
  readonly name = EmailProvider.SES;
  
  constructor(config: SESConfig = {}) {
    try {
      const { SESClient } = require('@aws-sdk/client-ses');
      // Initialize
    } catch (error) {
      throw new Error('Install package: npm install @aws-sdk/client-ses');
    }
  }
  
  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    // Implementation
  }
}
```

Catch errors and return structured results:

```typescript
try {
  const result = await this.sendMessage(message);
  results.push(result);
} catch (error) {
  results.push({
    success: false,
    error: error.message,
    provider: this.name, // ProviderName enum
    timestamp: new Date()
  });
}
```

## Validation

Validate all public inputs and throw specific errors:

```typescript
export function validateEmail(message: EmailMessage): void {
  if (!message.from) {
    throw new EmailValidationError('From address required', 'from');
  }
  if (!message.to) {
    throw new EmailValidationError('To address required', 'to');
  }
}
```

## Naming

- **Classes**: `PascalCase` - `ClassName`
- **Interfaces**: `PascalCase` - `IInterfaceName`
- **Functions**: `camelCase` - `functionName`
- **Constants**: `UPPER_SNAKE_CASE` - `CONSTANT_NAME`

## Code Style

- Use `readonly` for properties that don't change
- Use `async/await`, not `.then()` 
- Mark properties `readonly` in constructors:

```typescript
export class EmailService {
  private readonly provider: IEmailProvider;
  
  constructor(config: EmailServiceConfig) {
    this.provider = createProvider(config);
  }
}
```

## Testing

- Unit tests: `tests/unit/email/validation.test.ts` (mirrors `src/email/validation.ts`)
- Integration tests: `tests/integration/email/adapters/ses.test.ts` (real API and service calls)

## Exports

Export public APIs from each module's `index.ts`:

```typescript
// src/email/index.ts
export * from './service';
export * from './types';
export * from './errors';
```

# Basepack Code Structure

## Project Organization

Basepack is a modular service utilities library. Each service is self-contained in its own directory under `src/`.

### Directory Structure

```
src/
├── index.ts                    # Main entry point - re-exports all services
└── email/                      # Email service module
    ├── index.ts                # Email module exports
    ├── types.ts                # Type definitions and interfaces
    ├── service.ts              # EmailService class
    ├── errors.ts               # Error classes (EmailError, EmailValidationError, etc.)
    ├── validation.ts           # Validation utilities
    ├── retry.ts                # Retry logic with exponential backoff
    └── adapters/               # Provider implementations
        ├── index.ts            # Adapter exports
        ├── ses.ts              # AWS SES adapter
        ├── sendgrid.ts         # SendGrid adapter
        ├── mailgun.ts          # Mailgun adapter
        ├── resend.ts           # Resend adapter
        ├── postmark.ts         # Postmark adapter
        └── smtp.ts             # SMTP adapter
```

### File Responsibilities

**Service Module Pattern** (applies to all services):

1. **`types.ts`** - Type definitions
   - All interfaces and types for the service
   - Configuration types for each provider
   - Type guards and utility types
   - Const assertions for enums

2. **`service.ts`** - Main service class
   - Public API for the service
   - Multi-provider orchestration
   - Failover logic
   - Provider factory method

3. **`errors.ts`** - Error handling
   - Service-specific error classes
   - Type guards for errors
   - Structured error information

4. **`validation.ts`** - Input validation
   - Validation functions
   - Validation rules
   - Error throwing on invalid input

5. **`retry.ts`** - Retry logic (if needed)
   - Exponential backoff implementation
   - Retryable error detection
   - Configurable retry options

6. **`adapters/`** - Provider implementations
   - Each provider in its own file
   - Implements `IProvider` interface
   - Uses dynamic imports for optional dependencies
   - Provider-specific error handling

### Adding New Services

When adding a new service (e.g., cache, storage):

```
src/
└── cache/                      # New service
    ├── index.ts                # Export service and types
    ├── types.ts                # ICacheProvider, CacheConfig, etc.
    ├── service.ts              # CacheService class
    ├── errors.ts               # CacheError, etc.
    └── adapters/
        ├── redis.ts            # Redis adapter
        ├── memcached.ts        # Memcached adapter
        └── memory.ts           # In-memory adapter
```

Then export from main [index.ts](mdc:src/index.ts):
```typescript
export * from './cache';
```

### Testing Structure

```
tests/
├── unit/                       # Unit tests (run in CI)
│   └── email/
│       ├── validation.test.ts
│       ├── errors.test.ts
│       ├── retry.test.ts
│       └── types.test.ts
└── integration/                # Integration tests (run locally)
    └── email/
        └── adapters/
            ├── ses.test.ts
            ├── sendgrid.test.ts
            └── ...
```

### Documentation Structure

```
docs/
└── email/
    └── README.md               # Complete email service documentation
```

Main [README.md](mdc:README.md) stays minimal and links to service-specific docs.

#### Documentation Organization Rules

**Common patterns and cross-cutting concerns go in the main README only:**

1. **Logging** - Main README has complete logging documentation
   - Service-specific docs: ❌ No logging sections
   - Users refer to main README to understand how to configure logging

2. **Error Handling** - If error patterns are similar across services
   - Main README: ✅ General error handling patterns
   - Service docs: Only service-specific error details

3. **Authentication/Configuration Patterns** - If pattern is consistent
   - Main README: ✅ Common configuration patterns
   - Service docs: Provider-specific configuration only

4. **Common Features** (validation, retry logic, health checks)
   - Main README: ✅ General concepts if applicable to multiple services
   - Service docs: Service-specific behavior and examples

**Service-specific documentation should include:**
- Provider setup guides and configuration
- Service-specific features and capabilities
- API reference for that service
- Examples unique to that service

**Example:**
```markdown
<!-- docs/email/README.md -->

## Configuration
[Service-specific provider configs...]

## Usage Examples
[Email-specific examples...]

## API Reference
[EmailService methods...]

<!-- No logging section - users see main README -->
```

**Benefits:**
- Single source of truth for common patterns
- Easier to maintain (update once, not N times)
- Clearer separation between common and service-specific concerns
- Reduces documentation bloat

### Build Output

```
dist/
├── index.js                    # ESM bundle
├── index.js.map                # ESM source map
├── index.cjs                   # CommonJS bundle
├── index.cjs.map               # CJS source map
├── index.d.ts                  # TypeScript definitions (ESM)
└── index.d.cts                 # TypeScript definitions (CJS)
```

## Key Principles

1. **Service Independence** - Each service is self-contained
2. **Adapter Pattern** - All providers implement a common interface
3. **Optional Dependencies** - Heavy dependencies are peer dependencies with dynamic imports
4. **Type Safety** - Discriminated unions for provider-specific configs
5. **Validation** - All inputs validated before processing
6. **Error Handling** - Structured errors with type guards
7. **Documentation** - JSDoc on all public APIs

# Basepack Testing Standards

- KISS Principle: Keep It Simple, Stupid

## Integration Test Standards

**Integration tests should be simple and straightforward.**

- Test the happy path for core functionality
- Avoid over-engineering or redundant test cases
- One test per main feature (upload, download, etc.)
- Don't test every parameter combination
- Don't test error handling exhaustively (that's for unit tests)
- Reuse test data between tests where possible

**Good:** Simple test covering the main use case
```typescript
it('should upload a file to S3', async () => {
  const result = await service.upload({ key: 'test.txt', data: buffer });
  expect(result.success).toBe(true);
});
```

**Bad:** Over-engineered tests with excessive assertions
```typescript
it('should upload a file with metadata and cache control and encoding', async () => {
  const result = await service.upload({
    key: 'test.txt',
    data: buffer,
    metadata: { a: '1', b: '2' },
    cacheControl: 'max-age=3600',
    contentEncoding: 'gzip'
  });
  expect(result.success).toBe(true);
  expect(result.key).toBe('test.txt');
  expect(result.provider).toBe(StorageProvider.S3);
  expect(result.etag).toBeDefined();
  expect(result.timestamp).toBeInstanceOf(Date);
});
```

### Test Through Service Layer Only

**Always test through the service layer, not directly with providers.**

Integration tests should use the service classes (`EmailService`, `StorageService`, etc.) rather than provider adapters directly (`SESProvider`, `S3Provider`, etc.).

**Why?**
- Users interact with services, not providers directly
- Tests verify the complete user-facing API
- Avoids redundant testing of the same functionality
- Consistent with how the library is actually used
- Service layer may add orchestration logic (logging, future failover, etc.)

**Good:**
```typescript
// tests/integration/email/adapters/ses.test.ts
import { EmailService } from '../../../../src/email/service';
import { EmailProvider } from '../../../../src/email/types';

describe('SES Provider', () => {
  it('should send email via SES', async () => {
    const service = new EmailService({
      provider: EmailProvider.SES,
      config: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const results = await service.send({ message: getTestEmail() });
    
    expect(results[0].success).toBe(true);
    expect(results[0].provider).toBe(EmailProvider.SES);
  });
});
```

**Bad:**
```typescript
// DON'T DO THIS
import { SESProvider } from '../../../../src/email/adapters/ses';

describe('SES Provider', () => {
  it('should send email via SES', async () => {
    const provider = new SESProvider({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    const results = await provider.send({ message: getTestEmail() });
    
    expect(results[0].success).toBe(true);
  });
});
```

### File Structure

Integration tests should mirror the source structure:

```
tests/integration/
├── email/
│   ├── adapters/
│   │   ├── ses.test.ts         # Tests EmailService with SES
│   │   ├── sendgrid.test.ts    # Tests EmailService with SendGrid
│   │   └── ...
│   └── test-utils.ts           # Shared test utilities
├── storage/
│   ├── adapters/
│   │   └── s3.test.ts          # Tests StorageService with S3
│   └── test-utils.ts
├── test.env.example            # Example credentials file
└── test.env                    # Actual credentials (gitignored)
```

### Test Utilities

Each service module should have a `test-utils.ts` file with:

- Helper functions for loading test config
- Test data generators
- Common test fixtures

**Example:**
```typescript
// tests/integration/email/test-utils.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import { EmailMessage } from '../../../src/email/types';
import { StorageProvider } from '../../../src/storage/types';

dotenv.config({ path: path.join(__dirname, '..', 'test.env') });

export const getTestEmail = (): EmailMessage => ({
  from: process.env.TEST_FROM_EMAIL || 'test@example.com',
  to: process.env.TEST_TO_EMAIL || 'recipient@example.com',
  subject: `Integration Test - ${new Date().toISOString()}`,
  text: 'Test email content',
});
```

### Environment Variables

- Integration tests use `tests/integration/test.env` for credentials which is gitignored.
- Always use the `test.env.example` to update the relevant environment variables needed for the integration tests.

## Unit Test Standards

### Provider Tests

Unit tests for providers should mock external dependencies and focus on:

- Validation logic
- Error handling and error transformation
- Internal logic (retry logic, rate limiting, etc.)
- Edge cases

### Service Tests

Unit tests for services should mock providers and focus on:

- Provider orchestration
- Failover logic
- Service-level error handling
- Configuration validation

## Running Tests

```bash
# Run all unit tests (fast, no credentials needed)
npm run test:unit

# Run all integration tests (slow, credentials required)
npm run test:integration

# Run specific integration test
npm run test:integration -- tests/integration/email/adapters/ses.test.ts
```

## Test Naming Conventions

- Test files: `*.test.ts`
- Describe blocks: Use the feature/method name
- Test cases: Start with "should" and describe the expected behavior

```typescript
describe('upload', () => {
  it('should upload a file successfully', async () => { /* ... */ });
  it('should handle upload errors gracefully', async () => { /* ... */ });
  it('should validate file key', async () => { /* ... */ });
});
```

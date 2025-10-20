# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
```bash
npm run build          # Build the project (tsup)
npm run dev            # Build in watch mode
npm run clean          # Clean dist directory
```

### Testing
```bash
npm run test           # Run unit tests only
npm run test:unit      # Run unit tests (Jest)
npm run test:integration    # Run integration tests (requires credentials)
npm run test:coverage  # Run tests with coverage report
npm run test:watch     # Run tests in watch mode
```

### Publishing
```bash
npm run prepare        # Build project (runs automatically on install)
npm run prepublishOnly # Build and run unit tests before publishing
npm run version        # Build and stage dist files for version commit
```

## Project Architecture

Basepack is a modular service utilities library for Node.js backend applications. Each service is self-contained with its own providers, adapters, and configuration.

### Service Module Pattern

Each service follows this consistent structure:
```
src/[service]/
├── index.ts           # Public exports
├── types.ts           # TypeScript interfaces and enums
├── service.ts         # Main service class
├── errors.ts          # Custom error classes
├── validation.ts      # Input validation
├── retry.ts           # Retry logic (if applicable)
└── adapters/          # Provider implementations
    ├── index.ts       # Adapter exports
    └── [provider].ts  # Individual provider adapters
```

### Key Architectural Principles

1. **Adapter Pattern** - All providers implement a common interface for their service
2. **Multi-Provider Support** - Services support primary provider with automatic failover to backups
3. **Optional Dependencies** - Heavy provider SDKs are peer dependencies with dynamic imports
4. **Type Safety** - Discriminated unions for provider-specific configurations
5. **Input Validation** - All public inputs validated before processing
6. **Structured Error Handling** - Custom error classes with type guards
7. **Logger Injection** - All services accept custom loggers or use default console logging

### Testing Strategy

- **Unit Tests** (`tests/unit/`) - Fast tests without external dependencies, mirror source structure
- **Integration Tests** (`tests/integration/`) - Test real provider APIs through service layer only
- **Test Through Services** - Always test via service classes, not provider adapters directly
- **KISS Principle** - Integration tests focus on happy path, avoid over-engineering

### Build System

- **tsup** for bundling (ESM + CJS output)
- **Jest** for testing with ts-jest preset
- **TypeScript** strict mode with Node 22 target
- **Source maps** included for debugging

### Development Workflow

1. Feature development in service modules
2. Unit tests for validation and error handling
3. Integration tests for provider functionality
4. Build verification with TypeScript checks
5. Documentation updates in service-specific README files

### Environment Configuration

- Integration tests use `tests/integration/test.env` (gitignored)
- Example environment variables in `tests/integration/test.env.example`
- Each provider documents its required environment variables

### Code Standards (from Cursor Rules)

- **TypeScript**: Strict mode, interfaces for objects, types for unions
- **JSDoc**: Required on all exported code with examples
- **Error Handling**: Custom error classes with context, not generic errors
- **Naming**: PascalCase for classes/interfaces, camelCase for functions, UPPER_SNAKE_CASE for constants
- **Dependencies**: Dynamic imports with try-catch for optional peer dependencies

### Adding New Services

When adding a new service:
1. Follow the established module pattern
2. Create adapters directory with provider implementations
3. Export from main `src/index.ts`
4. Update documentation in `docs/[service]/README.md`
5. Add unit tests in `tests/unit/[service]/` and ensure it passes.
6. Add integration tests for the adapters in `tests/integration/[service]/` and ensure it works.

### Package Structure

- **Main exports**: ESM and CJS bundles with TypeScript definitions
- **Peer dependencies**: Optional provider SDKs installed by users as needed
- **Minimal bundle size**: Core library ~45KB, provider SDKs add size as needed
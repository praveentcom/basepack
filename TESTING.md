# Integration Tests

This directory contains integration tests for all email providers in Basepack.

## Setup

1. Copy the environment template:
```bash
cd tests/integration
cp test.env.example test.env
```

2. Fill in your provider credentials in `test.env`. You only need to configure the providers you want to test.

## Running Tests

Run all integration tests:
```bash
npm test
```

Run only integration tests:
```bash
npm run test:integration
```

Run tests in watch mode:
```bash
npm run test:watch
```

## How It Works

- Tests automatically detect which providers are configured based on environment variables
- All tests run in parallel for speed (up to 6 workers)

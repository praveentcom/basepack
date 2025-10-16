# Cache Service

The Cache service provides a unified interface for caching operations across different cache providers. It currently supports:
- **Redis** - High-performance in-memory cache
- **Valkey** - Open-source Redis fork (fully Redis-compatible)
- **Memcached** - Distributed memory caching system
- **Amazon ElastiCache** - AWS managed caching (Redis or Memcached compatible)

## Features

- **Multi-Provider Support**: Start with Redis or Memcached, easily switch between providers
- **Type Safety**: Full TypeScript support with strict typing
- **Automatic Serialization**: JSON serialization/deserialization for objects
- **TTL Support**: Set expiration times for cached values
- **Key Prefix**: Namespace your cache keys with prefixes
- **Connection Pooling**: Efficient connection management
- **Health Checks**: Monitor cache provider connectivity
- **Error Handling**: Comprehensive error types and validation
- **Graceful Degradation**: Operations return structured results instead of throwing

## Installation

```bash
npm install basepack
```

### Peer Dependencies

For Redis support, install ioredis:

```bash
npm install ioredis
```

For Memcached support, install memcached:

```bash
npm install memcached
```

## Quick Start

### Basic Redis Usage

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
  ttl: 3600 // 1 hour in seconds
});

// Get a value
const result = await cache.get({ key: 'user:123' });
if (result.found) {
  console.log('User:', result.value);
}

// Delete a value
await cache.delete({ key: 'user:123' });

// Check if key exists
const hasResult = await cache.has({ key: 'user:123' });
console.log('Exists:', hasResult.exists);
```

### Basic Memcached Usage

```typescript
import { CacheService, CacheProvider } from 'basepack';

const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    servers: ['localhost:11211']
  }
});

await cache.set({
  key: 'session:abc',
  value: { userId: '123', timestamp: Date.now() },
  ttl: 1800 // 30 minutes
});

const result = await cache.get({ key: 'session:abc' });
if (result.found) {
  console.log('Session:', result.value);
}
```

## Configuration

### Redis

#### Basic Configuration

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'localhost',
    port: 6379
  }
});
```

#### With Authentication

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'redis.example.com',
    port: 6379,
    password: 'your-password',
    db: 0
  }
});
```

#### Using Connection URL

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    url: 'redis://username:password@localhost:6379/0'
  }
});
```

#### With TLS/SSL

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'redis.example.com',
    port: 6380,
    tls: true,
    password: 'your-password'
  }
});
```

#### With Key Prefix

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'myapp:' // All keys will be prefixed with 'myapp:'
  }
});
```

#### Redis Configuration Options

```typescript
interface RedisConfig {
  /** Redis server hostname (default: 'localhost') */
  host?: string;
  /** Redis server port (default: 6379) */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number (default: 0) */
  db?: number;
  /** Connection URL (overrides host/port/password/db) */
  url?: string;
  /** Enable TLS/SSL connection */
  tls?: boolean;
  /** Key prefix for all cache keys */
  keyPrefix?: string;
  /** Connection timeout in milliseconds (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in milliseconds (default: 5000) */
  commandTimeout?: number;
  /** Maximum number of retries (default: 3) */
  retries?: number;
}
```

#### Redis Environment Variables

You can use environment variables for Redis configuration:

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=your-password
export REDIS_DB=0
export REDIS_URL=redis://localhost:6379/0  # Overrides individual settings
export REDIS_TLS=true
export REDIS_KEY_PREFIX=myapp:
```

Then initialize without explicit config:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS
  // Uses environment variables
});
```

### Memcached

#### Basic Configuration

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    servers: ['localhost:11211']
  }
});
```

#### Multiple Servers

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    servers: [
      'cache1.example.com:11211',
      'cache2.example.com:11211',
      'cache3.example.com:11211'
    ],
    options: {
      poolSize: 10,
      retries: 3
    }
  }
});
```

#### Memcached Configuration Options

```typescript
interface MemcachedConfig {
  /** Memcached server(s) in 'host:port' format */
  servers?: string | string[];
  /** Key prefix for all cache keys */
  keyPrefix?: string;
  /** Memcached client options */
  options?: {
    /** Connection pool size (default: 10) */
    poolSize?: number;
    /** Maximum number of retries (default: 3) */
    retries?: number;
    /** Retry delay in milliseconds (default: 100) */
    retryDelay?: number;
    /** Connection timeout in milliseconds (default: 5000) */
    timeout?: number;
    /** Idle timeout in milliseconds (default: 10000) */
    idle?: number;
  };
}
```

#### Memcached Environment Variables

```bash
export MEMCACHED_SERVERS=localhost:11211
# Or multiple servers (comma-separated)
export MEMCACHED_SERVERS=cache1:11211,cache2:11211,cache3:11211
export MEMCACHED_KEY_PREFIX=myapp:
```

Then initialize without explicit config:

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED
  // Uses environment variables
});
```

### Valkey

Valkey is an open-source, Redis-compatible key-value store that was forked from Redis after the license change. It's fully compatible with the Redis adapter - simply use the Redis provider with your Valkey endpoint.

#### Basic Valkey Configuration

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'localhost',
    port: 6379 // Default Valkey port
  }
});
```

#### Valkey with Authentication

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'valkey.example.com',
    port: 6379,
    password: 'your-password'
  }
});
```

#### Valkey with TLS

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'valkey.example.com',
    port: 6380,
    tls: true,
    password: 'your-password'
  }
});
```

#### Valkey Environment Variables

```bash
export REDIS_HOST=valkey.example.com
export REDIS_PORT=6379
export REDIS_PASSWORD=your-password
export REDIS_TLS=false
```

Then initialize without explicit config:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS
  // Uses environment variables
});
```

#### Why Valkey?

- **100% Redis-compatible** - Drop-in replacement for Redis
- **Open-source license** - BSD 3-Clause license (vs Redis's proprietary license)
- **Community-driven** - Backed by Linux Foundation
- **Active development** - Regular updates and improvements
- **No vendor lock-in** - True open-source alternative

### Amazon ElastiCache

Amazon ElastiCache is AWS's managed caching service that provides fully managed Redis or Memcached. The existing Redis and Memcached adapters work seamlessly with ElastiCache endpoints.

#### ElastiCache for Redis

ElastiCache for Redis provides Redis-compatible endpoints. Simply use the Redis adapter with your ElastiCache endpoint:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'my-cluster.abc123.0001.use1.cache.amazonaws.com',
    port: 6379
  }
});
```

#### ElastiCache for Redis with Cluster Mode

For cluster mode enabled:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'my-cluster.abc123.clustercfg.use1.cache.amazonaws.com',
    port: 6379
  }
});
```

#### ElastiCache for Redis with TLS (In-Transit Encryption)

If your ElastiCache cluster has encryption in-transit enabled:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'my-secure-cluster.abc123.0001.use1.cache.amazonaws.com',
    port: 6380, // TLS port
    tls: true
  }
});
```

#### ElastiCache for Redis with Auth Token

If your ElastiCache cluster has Redis AUTH enabled:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'my-cluster.abc123.0001.use1.cache.amazonaws.com',
    port: 6379,
    password: 'your-auth-token', // From ElastiCache AUTH token
    tls: true // If encryption in-transit is enabled
  }
});
```

#### ElastiCache for Memcached

ElastiCache for Memcached provides Memcached-compatible endpoints:

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    servers: ['my-cluster.abc123.cfg.use1.cache.amazonaws.com:11211']
  }
});
```

#### ElastiCache for Memcached with Multiple Nodes

For multi-node Memcached clusters, specify each node endpoint:

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    servers: [
      'my-cluster.abc123.0001.use1.cache.amazonaws.com:11211',
      'my-cluster.abc123.0002.use1.cache.amazonaws.com:11211',
      'my-cluster.abc123.0003.use1.cache.amazonaws.com:11211'
    ]
  }
});
```

#### ElastiCache with Environment Variables

For production deployments, use environment variables:

```bash
# For ElastiCache Redis
export REDIS_HOST=my-cluster.abc123.0001.use1.cache.amazonaws.com
export REDIS_PORT=6379
export REDIS_PASSWORD=your-auth-token
export REDIS_TLS=true

# For ElastiCache Memcached
export MEMCACHED_SERVERS=my-cluster.abc123.0001.use1.cache.amazonaws.com:11211,my-cluster.abc123.0002.use1.cache.amazonaws.com:11211
```

Then initialize without explicit config:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS // or CacheProvider.MEMCACHED
  // Uses environment variables
});
```

#### ElastiCache Discovery

For ElastiCache Memcached Auto Discovery:

```typescript
const cache = new CacheService({
  provider: CacheProvider.MEMCACHED,
  config: {
    // Use the configuration endpoint for auto-discovery
    servers: ['my-cluster.abc123.cfg.use1.cache.amazonaws.com:11211']
  }
});
```

#### Important Notes for ElastiCache

**Security Groups & VPC:**
- Ensure your application has network access to ElastiCache endpoints
- ElastiCache instances are VPC-only and not publicly accessible
- Configure security groups to allow traffic from your application

**Redis vs Memcached:**
- Use **ElastiCache for Redis** when you need: persistence, replication, pub/sub, data structures, snapshots
- Use **ElastiCache for Memcached** when you need: simple key-value caching, horizontal scaling, multi-threading

**Connection String Format:**
- Redis: `my-cluster.abc123.0001.use1.cache.amazonaws.com:6379`
- Redis Cluster: `my-cluster.abc123.clustercfg.use1.cache.amazonaws.com:6379`
- Memcached: `my-cluster.abc123.cfg.use1.cache.amazonaws.com:11211`

## Usage Examples

### Setting Values

#### Set with TTL

```typescript
await cache.set({
  key: 'user:123',
  value: { name: 'John', email: 'john@example.com' },
  ttl: 3600 // 1 hour in seconds
});
```

#### Set without TTL

```typescript
// Value never expires (Redis default)
// Note: Memcached will use server default TTL
await cache.set({
  key: 'config:app',
  value: { theme: 'dark', language: 'en' }
});
```

#### Set Primitive Values

```typescript
await cache.set({ key: 'counter', value: 42, ttl: 60 });
await cache.set({ key: 'message', value: 'hello world', ttl: 120 });
await cache.set({ key: 'is_active', value: true, ttl: 300 });
```

#### Set Complex Objects

```typescript
await cache.set({
  key: 'order:456',
  value: {
    orderId: '456',
    items: [
      { productId: 'p1', quantity: 2, price: 29.99 },
      { productId: 'p2', quantity: 1, price: 49.99 }
    ],
    total: 109.97,
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  ttl: 7200 // 2 hours
});
```

### Getting Values

#### Basic Get

```typescript
const result = await cache.get({ key: 'user:123' });

if (result.success && result.found) {
  console.log('User:', result.value);
} else if (!result.found) {
  console.log('User not found in cache');
} else {
  console.error('Cache error:', result.error);
}
```

#### Get with Type Safety

```typescript
interface User {
  name: string;
  email: string;
  age?: number;
}

const result = await cache.get<User>({ key: 'user:123' });

if (result.found && result.value) {
  // TypeScript knows the type
  console.log(`Name: ${result.value.name}`);
  console.log(`Email: ${result.value.email}`);
}
```

#### Get Multiple Keys

```typescript
const users = await Promise.all([
  cache.get({ key: 'user:123' }),
  cache.get({ key: 'user:456' }),
  cache.get({ key: 'user:789' })
]);

users.forEach((result, index) => {
  if (result.found) {
    console.log(`User ${index + 1}:`, result.value);
  }
});
```

### Deleting Values

```typescript
const result = await cache.delete({ key: 'user:123' });

if (result.success) {
  console.log('User deleted from cache');
} else {
  console.error('Delete failed:', result.error);
}
```

### Checking Existence

```typescript
const result = await cache.has({ key: 'user:123' });

if (result.success) {
  if (result.exists) {
    console.log('Key exists in cache');
  } else {
    console.log('Key not found');
  }
}
```

### Clearing Cache

```typescript
const result = await cache.clear();

if (result.success) {
  console.log('Cache cleared successfully');
}
```

**Important Notes:**
- For Redis with a key prefix, only keys with that prefix are cleared
- For Redis without a prefix, the entire database is flushed
- For Memcached, the entire server is flushed (no selective clearing)

### Health Checks

```typescript
const health = await cache.health();

if (health.status === 'healthy') {
  console.log(`Cache is healthy (${health.responseTime}ms)`);
  console.log('Details:', health.details);
} else {
  console.error(`Cache is unhealthy: ${health.error}`);
}
```

### Closing Connections

```typescript
// On application shutdown
await cache.close();
console.log('Cache connection closed');
```

## Common Patterns

### Cache-Aside Pattern

```typescript
async function getUser(userId: string) {
  const cacheKey = `user:${userId}`;
  
  // Try to get from cache
  const cached = await cache.get({ key: cacheKey });
  if (cached.found) {
    console.log('Cache hit');
    return cached.value;
  }
  
  // Cache miss - fetch from database
  console.log('Cache miss - fetching from DB');
  const user = await database.users.findById(userId);
  
  // Store in cache for next time
  await cache.set({
    key: cacheKey,
    value: user,
    ttl: 3600 // 1 hour
  });
  
  return user;
}
```

### Write-Through Pattern

```typescript
async function updateUser(userId: string, userData: any) {
  // Update database
  const user = await database.users.update(userId, userData);
  
  // Update cache
  await cache.set({
    key: `user:${userId}`,
    value: user,
    ttl: 3600
  });
  
  return user;
}
```

### Cache Invalidation

```typescript
async function deleteUser(userId: string) {
  // Delete from database
  await database.users.delete(userId);
  
  // Invalidate cache
  await cache.delete({ key: `user:${userId}` });
}
```

### Rate Limiting

```typescript
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const result = await cache.get<number>({ key });
  
  if (!result.found) {
    // First request - set counter with 60s TTL
    await cache.set({ key, value: 1, ttl: 60 });
    return true;
  }
  
  const count = result.value || 0;
  if (count >= 100) {
    // Rate limit exceeded
    return false;
  }
  
  // Increment counter
  await cache.set({ key, value: count + 1, ttl: 60 });
  return true;
}
```

### Session Management

```typescript
interface Session {
  userId: string;
  email: string;
  loginTime: number;
}

async function createSession(sessionId: string, userId: string, email: string) {
  const session: Session = {
    userId,
    email,
    loginTime: Date.now()
  };
  
  await cache.set({
    key: `session:${sessionId}`,
    value: session,
    ttl: 3600 // 1 hour session
  });
}

async function getSession(sessionId: string): Promise<Session | null> {
  const result = await cache.get<Session>({ key: `session:${sessionId}` });
  return result.found ? result.value! : null;
}

async function extendSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (session) {
    // Refresh TTL
    await cache.set({
      key: `session:${sessionId}`,
      value: session,
      ttl: 3600
    });
  }
}

async function destroySession(sessionId: string) {
  await cache.delete({ key: `session:${sessionId}` });
}
```

### Distributed Locking (Redis only)

```typescript
// Note: This is a simplified example. For production use, consider using Redlock
async function acquireLock(resource: string, ttl: number = 10): Promise<boolean> {
  const lockKey = `lock:${resource}`;
  const result = await cache.get({ key: lockKey });
  
  if (result.found) {
    return false; // Lock already held
  }
  
  await cache.set({
    key: lockKey,
    value: Date.now(),
    ttl
  });
  
  return true;
}

async function releaseLock(resource: string) {
  await cache.delete({ key: `lock:${resource}` });
}

// Usage
async function performCriticalOperation() {
  const locked = await acquireLock('critical-resource', 30);
  
  if (!locked) {
    throw new Error('Could not acquire lock');
  }
  
  try {
    // Perform operation
    await someOperation();
  } finally {
    await releaseLock('critical-resource');
  }
}
```

### Caching API Responses

```typescript
async function fetchUserPosts(userId: string) {
  const cacheKey = `posts:${userId}`;
  
  // Check cache
  const cached = await cache.get({ key: cacheKey });
  if (cached.found) {
    return cached.value;
  }
  
  // Fetch from API
  const response = await fetch(`https://api.example.com/users/${userId}/posts`);
  const posts = await response.json();
  
  // Cache for 5 minutes
  await cache.set({
    key: cacheKey,
    value: posts,
    ttl: 300
  });
  
  return posts;
}
```

## Error Handling

The cache service uses structured error types for comprehensive error handling:

```typescript
import { 
  CacheError, 
  CacheValidationError, 
  CacheProviderError,
  CacheConnectionError,
  CacheTimeoutError,
  isCacheError,
  isCacheValidationError 
} from 'basepack';

try {
  await cache.set({
    key: '', // Invalid key
    value: 'test'
  });
} catch (error) {
  if (isCacheValidationError(error)) {
    console.error(`Validation error: ${error.field} - ${error.message}`);
  } else if (isCacheError(error)) {
    console.error(`Cache error from ${error.provider}: ${error.message}`);
    if (error.isRetryable) {
      // Retry logic
    }
  }
}
```

### Error Types

- **CacheError**: Base error for cache operations
- **CacheValidationError**: Thrown when input validation fails
- **CacheProviderError**: Thrown when provider is not available or misconfigured
- **CacheConnectionError**: Thrown when connection to cache provider fails
- **CacheTimeoutError**: Thrown when cache operation times out

### Graceful Error Handling

Most operations return structured results instead of throwing:

```typescript
const result = await cache.get({ key: 'user:123' });

if (!result.success) {
  console.error('Cache operation failed:', result.error);
  // Continue with fallback logic
  const user = await database.users.findById('123');
  return user;
}

if (result.found) {
  return result.value;
}

// Cache miss - fetch from source
const user = await database.users.findById('123');
await cache.set({ key: 'user:123', value: user, ttl: 3600 });
return user;
```

## Best Practices

### 1. Use Key Prefixes

Organize your cache keys with prefixes to avoid collisions and enable selective clearing:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    host: 'localhost',
    keyPrefix: 'myapp:'
  }
});
```

### 2. Set Appropriate TTLs

Always set TTLs to prevent stale data:

```typescript
// Short-lived data (user sessions)
await cache.set({ key: 'session:xyz', value: session, ttl: 3600 });

// Medium-lived data (user profiles)
await cache.set({ key: 'user:123', value: user, ttl: 86400 });

// Long-lived data (configuration)
await cache.set({ key: 'config:app', value: config, ttl: 604800 });
```

### 3. Handle Cache Misses Gracefully

```typescript
async function getData(key: string) {
  const cached = await cache.get({ key });
  
  if (cached.found) {
    return cached.value;
  }
  
  // Always have a fallback
  const data = await fetchFromSource(key);
  await cache.set({ key, value: data, ttl: 3600 });
  return data;
}
```

### 4. Use Type Safety

Define interfaces for your cached data:

```typescript
interface CachedUser {
  id: string;
  name: string;
  email: string;
  cachedAt: number;
}

const result = await cache.get<CachedUser>({ key: 'user:123' });
if (result.found && result.value) {
  console.log(result.value.name); // TypeScript knows the type
}
```

### 5. Monitor Cache Health

Implement health checks in your application:

```typescript
async function checkHealth() {
  const health = await cache.health();
  
  if (health.status === 'unhealthy') {
    // Alert or fallback to database-only mode
    logger.error('Cache unhealthy', health);
  }
}

// Check every minute
setInterval(checkHealth, 60000);
```

### 6. Close Connections Properly

Always close connections on application shutdown:

```typescript
process.on('SIGTERM', async () => {
  await cache.close();
  process.exit(0);
});
```

### 7. Avoid Caching Large Objects

Keep cached values reasonably sized (< 1MB recommended):

```typescript
// ❌ Bad - caching large arrays
await cache.set({ key: 'all-users', value: allUsers, ttl: 3600 });

// ✅ Good - cache individual items
for (const user of users) {
  await cache.set({ key: `user:${user.id}`, value: user, ttl: 3600 });
}
```

### 8. Use Structured Keys

Follow consistent key naming conventions:

```typescript
// Good key patterns
'user:{userId}'
'session:{sessionId}'
'posts:{userId}:{page}'
'config:{env}:{version}'

// Examples
await cache.set({ key: 'user:123', value: user });
await cache.set({ key: 'posts:123:1', value: posts });
```

## API Reference

See the main [README](../../README.md) for logging configuration and common patterns.

### CacheService

```typescript
class CacheService {
  constructor(config: CacheServiceConfig);
  get<T>(config: CacheGetConfig): Promise<CacheGetResult<T>>;
  set(config: CacheSetConfig): Promise<CacheSetResult>;
  delete(config: CacheDeleteConfig): Promise<CacheDeleteResult>;
  has(config: CacheHasConfig): Promise<CacheHasResult>;
  clear(): Promise<CacheClearResult>;
  health(): Promise<CacheHealthInfo>;
  close(): Promise<void>;
  getProviderName(): string;
}
```

## Troubleshooting

### Connection Failures

If you're experiencing connection issues:

```typescript
// Check cache health
const health = await cache.health();
console.log('Status:', health.status);
console.log('Response time:', health.responseTime);
console.log('Error:', health.error);

// Verify configuration
console.log('Provider:', cache.getProviderName());
```

### Redis Connection Refused

```bash
# Verify Redis is running
redis-cli ping
# Should return "PONG"

# Check Redis logs
# On macOS with Homebrew:
tail -f /usr/local/var/log/redis.log

# On Linux:
journalctl -u redis -f
```

### Memcached Connection Refused

```bash
# Verify Memcached is running
echo "stats" | nc localhost 11211

# Check if service is running
# On macOS:
brew services list | grep memcached

# On Linux:
systemctl status memcached
```

### TTL Not Working

Verify your TTL is in seconds and is a positive integer:

```typescript
// ❌ Wrong - milliseconds
await cache.set({ key: 'test', value: 'data', ttl: 3600000 });

// ✅ Correct - seconds
await cache.set({ key: 'test', value: 'data', ttl: 3600 });
```

### Keys Not Found After Setting

Check your key prefix configuration:

```typescript
const cache = new CacheService({
  provider: CacheProvider.REDIS,
  config: {
    keyPrefix: 'myapp:'
  }
});

// Keys are stored as "myapp:user:123"
await cache.set({ key: 'user:123', value: user });
const result = await cache.get({ key: 'user:123' }); // Automatically prefixed
```

## License

MIT


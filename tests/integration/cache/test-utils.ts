/**
 * Test utilities for cache integration tests
 */

/**
 * Get Redis configuration from environment or use defaults
 */
export function getRedisTestConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_TEST_DB || '15', 10), // Use DB 15 for testing
    keyPrefix: 'basepack:test:',
  };
}

/**
 * Get Memcached configuration from environment or use defaults
 */
export function getMemcachedTestConfig() {
  const servers = process.env.MEMCACHED_SERVERS || 'localhost:11211';
  return {
    servers: servers.includes(',') ? servers.split(',').map(s => s.trim()) : servers,
    keyPrefix: 'basepack:test:',
  };
}

/**
 * Check if Redis is available for testing
 */
export function isRedisAvailable(): boolean {
  return process.env.REDIS_ENABLED === 'true' || process.env.CI !== 'true';
}

/**
 * Check if Memcached is available for testing
 */
export function isMemcachedAvailable(): boolean {
  return process.env.MEMCACHED_ENABLED === 'true' || process.env.CI !== 'true';
}

/**
 * Skip test if provider is not available
 */
export function skipIfNotAvailable(provider: 'redis' | 'memcached') {
  const available = provider === 'redis' ? isRedisAvailable() : isMemcachedAvailable();
  
  if (!available) {
    console.log(`Skipping ${provider} tests - provider not available`);
  }
  
  return available;
}


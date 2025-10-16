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


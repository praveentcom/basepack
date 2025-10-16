import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', 'test.env') });

/**
 * Get test bucket name from environment
 * 
 * @param provider - Storage provider ('S3' or 'GCS')
 * @returns Bucket name
 */
export const getTestBucket = (provider: 'S3' | 'GCS' = 'S3'): string => {
  const envVar = provider === 'S3' ? 'AWS_S3_BUCKET' : 'GCS_BUCKET';
  const bucket = process.env[envVar];
  if (!bucket) {
    throw new Error(`${envVar} is not set in test.env`);
  }
  return bucket;
};

/**
 * Generate a unique test key with timestamp and random suffix
 */
export const generateTestKey = (prefix: string = 'test'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Create test file buffer
 */
export const createTestBuffer = (content: string = 'Test file content'): Buffer => {
  return Buffer.from(content, 'utf-8');
};

/**
 * Common test file data
 */
export const TEST_FILE_CONTENT = 'This is a test file from Basepack integration tests.';


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

/**
 * Check if required credentials are configured
 * 
 * @param provider - Storage provider name
 * @param requiredEnvVars - Array of required environment variable names
 * @returns True if credentials are configured, false otherwise
 */
export const hasCredentials = (provider: string, requiredEnvVars: string[]): boolean => {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Skipping ${provider} integration tests - missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
};

/**
 * Provider-specific credential checkers
 */
export const credentialCheckers = {
  s3: () => hasCredentials('S3', ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET']),
  gcs: () => hasCredentials('GCS', ['GCS_PROJECT_ID', 'GCS_KEY_FILE', 'GCS_BUCKET']),
  azure: () => hasCredentials('Azure', ['AZURE_STORAGE_ACCOUNT', 'AZURE_STORAGE_KEY']),
  b2: () => hasCredentials('B2', ['B2_APPLICATION_KEY_ID', 'B2_APPLICATION_KEY', 'B2_BUCKET_NAME']),
  oss: () => hasCredentials('OSS', ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_BUCKET', 'OSS_REGION']),
  r2: () => hasCredentials('R2', ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCESS_KEY', 'CLOUDFLARE_R2_SECRET_KEY', 'CLOUDFLARE_R2_BUCKET']),
};


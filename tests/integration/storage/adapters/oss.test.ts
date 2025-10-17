import { StorageService } from '../../../../src/storage/service';
import { StorageProvider } from '../../../../src/storage/types';
import {
  generateTestKey,
  createTestBuffer,
  TEST_FILE_CONTENT,
  credentialCheckers,
} from '../test-utils';

const hasCredentials = credentialCheckers.oss();

describe(hasCredentials ? 'Alibaba Cloud OSS Provider' : 'Alibaba Cloud OSS Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping OSS integration tests - missing credentials', () => {});
    return;
  }

  let service: StorageService;
  let uploadedKey: string;

  beforeAll(async () => {
    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION;
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;

    if (!bucket || !region || !accessKeyId || !accessKeySecret) {
      throw new Error(
        'OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY_ID, and OSS_ACCESS_KEY_SECRET must be set in test.env'
      );
    }

    service = new StorageService({
      provider: StorageProvider.OSS,
      config: {
        bucket,
        region,
        credentials: {
          accessKeyId,
          accessKeySecret,
          stsToken: process.env.OSS_STS_TOKEN, // Optional STS token
        },
        internal: process.env.OSS_INTERNAL === 'true', // Optional internal network
        secure: process.env.OSS_SECURE !== 'false', // Default to true
        endpoint: process.env.OSS_ENDPOINT, // Optional custom endpoint
      }
    });

    // Upload a test file once for all tests
    uploadedKey = generateTestKey('test');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);
    await service.upload({
      key: uploadedKey,
      data: buffer,
      contentType: 'text/plain',
    });
  });

  it('should upload a file to OSS', async () => {
    const key = generateTestKey('upload');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
    expect(result.key).toBe(key);
    expect(result.etag).toBeDefined();
    expect(result.url).toBeDefined(); // OSS returns public URL
  });

  it('should upload a file with metadata', async () => {
    const key = generateTestKey('upload-metadata');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
      metadata: {
        userId: '12345',
        environment: 'test',
      },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
  });

  it('should download a file from OSS', async () => {
    const result = await service.download({
      key: uploadedKey,
    });

    expect(result.success).toBe(true);
    expect(result.data?.toString('utf-8')).toBe(TEST_FILE_CONTENT);
    expect(result.contentType).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
    expect(result.etag).toBeDefined();
    expect(result.lastModified).toBeInstanceOf(Date);
  });

  it('should delete a file from OSS', async () => {
    const key = generateTestKey('delete');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    // Upload first
    await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    // Then delete
    const result = await service.delete({
      key,
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
  });

  it('should generate a signed URL for download', async () => {
    const result = await service.getSignedUrl({
      key: uploadedKey,
      expiresIn: 3600,
      operation: 'getObject',
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.url).toContain('Expires=');
    expect(result.expiresAt).toBeDefined();
  });

  it('should generate a signed URL for upload', async () => {
    const key = generateTestKey('presigned-upload');

    const result = await service.getSignedUrl({
      key,
      expiresIn: 900,
      operation: 'putObject',
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  it('should check OSS health', async () => {
    const health = await service.health();

    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(StorageProvider.OSS);
    expect(health.responseTime).toBeGreaterThan(0);
  });

  it('should upload from URL', async () => {
    const key = generateTestKey('url-upload');
    const testUrl = 'https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore';

    const result = await service.uploadFromUrl({
      key,
      url: testUrl,
      metadata: {
        source: 'github',
      },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
    expect(result.key).toBe(key);
  });

  it('should handle download of non-existent file', async () => {
    const result = await service.download({
      key: 'non-existent-file.txt',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle delete of non-existent file', async () => {
    const result = await service.delete({
      key: 'non-existent-file.txt',
    });

    // OSS doesn't throw error for deleting non-existent files
    expect(result.success).toBe(true);
  });

  it('should upload with cache control', async () => {
    const key = generateTestKey('cache-control');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
      cacheControl: 'max-age=3600',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
  });

  it('should upload with content encoding', async () => {
    const key = generateTestKey('content-encoding');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
      contentEncoding: 'gzip',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
  });

  it('should upload string data', async () => {
    const key = generateTestKey('string-upload');
    const stringData = 'This is a string upload test';

    const result = await service.upload({
      key,
      data: stringData,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.OSS);
  });
});


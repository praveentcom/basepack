import { StorageService } from '../../../../src/storage/service';
import { StorageProvider } from '../../../../src/storage/types';
import {
  generateTestKey,
  createTestBuffer,
  TEST_FILE_CONTENT,
  credentialCheckers,
} from '../test-utils';

const hasCredentials = credentialCheckers.b2();

describe(hasCredentials ? 'Backblaze B2 Provider' : 'Backblaze B2 Provider (skipped - missing credentials)', () => {
  if (!hasCredentials) {
    // Skip all tests in this suite
    test.skip('Skipping B2 integration tests - missing credentials', () => {});
    return;
  }

  let service: StorageService;
  let uploadedKey: string;

  beforeAll(async () => {
    const bucket = process.env.B2_BUCKET;
    const accessKeyId = process.env.B2_KEY_ID;
    const secretAccessKey = process.env.B2_APPLICATION_KEY;
    const region = process.env.B2_REGION || 'us-west-004';

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'B2_BUCKET, B2_KEY_ID, and B2_APPLICATION_KEY must be set in test.env'
      );
    }

    service = new StorageService({
      provider: StorageProvider.B2,
      config: {
        bucket,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: process.env.B2_ENDPOINT, // Optional custom endpoint
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

  it('should upload a file to B2', async () => {
    const key = generateTestKey('upload');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.B2);
    expect(result.key).toBe(key);
    expect(result.etag).toBeDefined();
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
    expect(result.provider).toBe(StorageProvider.B2);
  });

  it('should download a file from B2', async () => {
    const result = await service.download({
      key: uploadedKey,
    });

    expect(result.success).toBe(true);
    expect(result.data?.toString('utf-8')).toBe(TEST_FILE_CONTENT);
    expect(result.contentType).toBe('text/plain');
    expect(result.size).toBeGreaterThan(0);
    expect(result.etag).toBeDefined();
  });

  it('should delete a file from B2', async () => {
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
    expect(result.provider).toBe(StorageProvider.B2);
  });

  it('should generate a signed URL for download', async () => {
    const result = await service.getSignedUrl({
      key: uploadedKey,
      expiresIn: 3600,
      operation: 'getObject',
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.url).toContain('X-Amz-Signature');
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

  it('should check B2 health', async () => {
    const health = await service.health();

    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(StorageProvider.B2);
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
    expect(result.provider).toBe(StorageProvider.B2);
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
    // B2 (like S3) returns success even for non-existent files
    const result = await service.delete({
      key: 'non-existent-file.txt',
    });

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
    expect(result.provider).toBe(StorageProvider.B2);
  });
});


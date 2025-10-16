import { StorageService } from '../../../../src/storage/service';
import { StorageProvider } from '../../../../src/storage/types';
import {
  generateTestKey,
  createTestBuffer,
  TEST_FILE_CONTENT,
} from '../test-utils';

describe('Cloudflare R2 Provider', () => {
  let service: StorageService;
  let uploadedKey: string;

  beforeAll(async () => {
    const bucket = process.env.R2_BUCKET;
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY must be set in test.env'
      );
    }

    service = new StorageService({
      provider: StorageProvider.R2,
      config: {
        bucket,
        accountId,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        endpoint: process.env.R2_ENDPOINT, // Optional custom endpoint
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

  it('should upload a file to R2', async () => {
    const key = generateTestKey('upload');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.R2);
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
    expect(result.provider).toBe(StorageProvider.R2);
  });

  it('should download a file from R2', async () => {
    const result = await service.download({
      key: uploadedKey,
    });

    expect(result.success).toBe(true);
    expect(result.data?.toString('utf-8')).toBe(TEST_FILE_CONTENT);
    expect(result.contentType).toBe('text/plain');
    expect(result.size).toBeGreaterThan(0);
    expect(result.etag).toBeDefined();
  });

  it('should delete a file from R2', async () => {
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
    expect(result.provider).toBe(StorageProvider.R2);
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

  it('should check R2 health', async () => {
    const health = await service.health();

    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(StorageProvider.R2);
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
    expect(result.provider).toBe(StorageProvider.R2);
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
    // R2 (like S3) returns success even for non-existent files
    const result = await service.delete({
      key: 'non-existent-file.txt',
    });

    expect(result.success).toBe(true);
  });
});


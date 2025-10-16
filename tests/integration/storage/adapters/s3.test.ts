import { StorageService } from '../../../../src/storage/service';
import { StorageProvider } from '../../../../src/storage/types';
import {
  getTestBucket,
  generateTestKey,
  createTestBuffer,
  TEST_FILE_CONTENT,
} from '../test-utils';

describe('S3 Provider', () => {
  let service: StorageService;
  const testBucket = getTestBucket();
  let uploadedKey: string;

  beforeAll(async () => {
    service = new StorageService({
      provider: StorageProvider.S3,
      config: {
        bucket: testBucket,
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
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

  it('should upload a file to S3', async () => {
    const key = generateTestKey('upload');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.S3);
  });

  it('should download a file from S3', async () => {
    const result = await service.download({
      key: uploadedKey,
    });

    expect(result.success).toBe(true);
    expect(result.data?.toString('utf-8')).toBe(TEST_FILE_CONTENT);
  });

  it('should delete a file from S3', async () => {
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
    expect(result.provider).toBe(StorageProvider.S3);
  });

  it('should generate a signed URL', async () => {
    const result = await service.getSignedUrl({
      key: uploadedKey,
      expiresIn: 3600,
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
  });

  it('should check S3 health', async () => {
    const health = await service.health();

    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(StorageProvider.S3);
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
    expect(result.provider).toBe(StorageProvider.S3);
  });
});


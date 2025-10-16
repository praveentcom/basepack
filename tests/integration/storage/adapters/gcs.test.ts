import { StorageService } from '../../../../src/storage/service';
import { StorageProvider } from '../../../../src/storage/types';
import { coloredConsoleLogger } from '../../../../src/logger';
import {
  getTestBucket,
  generateTestKey,
  createTestBuffer,
  TEST_FILE_CONTENT,
} from '../test-utils';

describe('GCS Provider', () => {
  let service: StorageService;
  const testBucket = getTestBucket('GCS');
  let uploadedKey: string;

  beforeAll(async () => {
    const config: any = {
      bucket: testBucket,
    };

    if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      config.projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
    }

    // Use service account key file if provided
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }

    // Alternative: Use credentials object if provided (less common)
    if (process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
      config.credentials = {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }

    service = new StorageService({
      provider: StorageProvider.GCS,
      config,
      logger: coloredConsoleLogger(),
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

  it('should upload a file to GCS', async () => {
    const key = generateTestKey('upload');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.GCS);
  });

  it('should upload a file with metadata', async () => {
    const key = generateTestKey('upload-metadata');
    const buffer = createTestBuffer(TEST_FILE_CONTENT);

    const result = await service.upload({
      key,
      data: buffer,
      contentType: 'text/plain',
      metadata: {
        userId: '123',
        testType: 'integration',
      },
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe(StorageProvider.GCS);
  });

  it('should download a file from GCS', async () => {
    const result = await service.download({
      key: uploadedKey,
    });

    expect(result.success).toBe(true);
    expect(result.data?.toString('utf-8')).toBe(TEST_FILE_CONTENT);
    expect(result.contentType).toBe('text/plain');
  });

  it('should delete a file from GCS', async () => {
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
    expect(result.provider).toBe(StorageProvider.GCS);
  });

  it('should generate a signed URL for reading', async () => {
    const result = await service.getSignedUrl({
      key: uploadedKey,
      expiresIn: 3600,
      operation: 'getObject',
    });

    expect(result.success).toBe(true);
    expect(result.url).toBeDefined();
    expect(result.expiresAt).toBeDefined();
  });

  it('should generate a signed URL for writing', async () => {
    const key = generateTestKey('signed-url-upload');

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

  it('should check GCS health', async () => {
    const health = await service.health();

    expect(health.status).toBe('healthy');
    expect(health.provider).toBe(StorageProvider.GCS);
    expect(health.responseTime).toBeDefined();
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
    expect(result.provider).toBe(StorageProvider.GCS);
  });
});


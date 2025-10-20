/**
 * Unit tests for storage service
 */

import { StorageService } from '../../../src/storage/service';
import { StorageProvider, type StorageServiceConfig, type FileUploadConfig, type FileDownloadConfig } from '../../../src/storage/types';
import type { Logger } from '../../../src/logger/types';
import { StorageError } from '../../../src/storage/errors';

// Mock the adapters
jest.mock('../../../src/storage/adapters/s3');
jest.mock('../../../src/storage/adapters/gcs');
jest.mock('../../../src/storage/adapters/azure');
jest.mock('../../../src/storage/adapters/r2');
jest.mock('../../../src/storage/adapters/b2');
jest.mock('../../../src/storage/adapters/oss');

// Mock the logger
jest.mock('../../../src/logger', () => ({
  consoleLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }),
}));

import { S3Provider } from '../../../src/storage/adapters/s3';
import { GCSProvider } from '../../../src/storage/adapters/gcs';
import { AzureProvider } from '../../../src/storage/adapters/azure';
import { R2Provider } from '../../../src/storage/adapters/r2';
import { B2Provider } from '../../../src/storage/adapters/b2';
import { OSSProvider } from '../../../src/storage/adapters/oss';
import { consoleLogger } from '../../../src/logger';

describe('StorageService', () => {
  let mockLogger: Logger;
  let s3Config: StorageServiceConfig;
  let testUploadConfig: FileUploadConfig;
  let testDownloadConfig: FileDownloadConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    s3Config = {
      provider: StorageProvider.S3,
      config: {
        bucket: 'test-bucket',
        region: 'us-east-1',
      },
      logger: mockLogger,
    };

    testUploadConfig = {
      key: 'test-file.txt',
      data: Buffer.from('test content'),
      contentType: 'text/plain',
    };

    testDownloadConfig = {
      key: 'test-file.txt',
    };

    // Mock provider implementation
    const mockProvider = {
      name: StorageProvider.S3,
      upload: jest.fn(),
      uploadFromUrl: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      getSignedUrl: jest.fn(),
      health: jest.fn(),
    };

    (S3Provider as jest.Mock).mockImplementation(() => mockProvider);
    (GCSProvider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: StorageProvider.GCS }));
    (AzureProvider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: StorageProvider.AZURE }));
    (R2Provider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: StorageProvider.R2 }));
    (B2Provider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: StorageProvider.B2 }));
    (OSSProvider as jest.Mock).mockImplementation(() => ({ ...mockProvider, name: StorageProvider.OSS }));
  });

  describe('constructor', () => {
    it('should create a service with S3 provider', () => {
      const service = new StorageService(s3Config);
      
      expect(S3Provider).toHaveBeenCalledWith(s3Config.config, mockLogger);
    });

    it('should use console logger if none provided', () => {
      const configWithoutLogger = {
        provider: StorageProvider.S3,
        config: {
          bucket: 'test-bucket',
          region: 'us-east-1',
        },
      };
      
      new StorageService(configWithoutLogger);
      
      expect(consoleLogger).toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    it('should upload file successfully', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockResult = {
        success: true,
        key: 'test-file.txt',
        url: 'https://test-bucket.s3.amazonaws.com/test-file.txt',
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.upload.mockResolvedValue(mockResult);
      
      const result = await service.upload(testUploadConfig);
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Storage: Uploading file', { 
        key: 'test-file.txt',
        contentType: 'text/plain'
      });
    });

    it('should handle upload errors', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const error = new Error('Upload failed');
      mockProvider.upload.mockRejectedValue(error);
      
      await expect(service.upload(testUploadConfig)).rejects.toThrow('Upload failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Storage: Upload exception', { 
        key: 'test-file.txt',
        error
      });
    });
  });

  describe('uploadFromUrl', () => {
    it('should upload file from URL successfully', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockResult = {
        success: true,
        key: 'downloaded-file.txt',
        url: 'https://test-bucket.s3.amazonaws.com/downloaded-file.txt',
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.uploadFromUrl.mockResolvedValue(mockResult);
      
      const config = {
        key: 'downloaded-file.txt',
        url: 'https://example.com/file.txt',
      };
      
      const result = await service.uploadFromUrl(config);
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Storage: Uploading file from URL', { 
        key: 'downloaded-file.txt',
        url: 'https://example.com/file.txt'
      });
    });

    it('should handle upload from URL errors', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const error = new Error('Download failed');
      mockProvider.uploadFromUrl.mockRejectedValue(error);
      
      const config = {
        key: 'downloaded-file.txt',
        url: 'https://example.com/file.txt',
      };
      
      await expect(service.uploadFromUrl(config)).rejects.toThrow('Download failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Storage: URL upload exception', { 
        key: 'downloaded-file.txt',
        error
      });
    });
  });

  describe('download', () => {
    it('should download file successfully', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockResult = {
        success: true,
        key: 'test-file.txt',
        data: Buffer.from('test content'),
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.download.mockResolvedValue(mockResult);
      
      const result = await service.download(testDownloadConfig);
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Storage: Downloading file', { 
        key: 'test-file.txt'
      });
    });

    it('should handle download errors', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const error = new Error('Download failed');
      mockProvider.download.mockRejectedValue(error);
      
      await expect(service.download(testDownloadConfig)).rejects.toThrow('Download failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Storage: Download exception', { 
        key: 'test-file.txt',
        error
      });
    });
  });

  describe('delete', () => {
    it('should delete file successfully', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockResult = {
        success: true,
        key: 'test-file.txt',
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.delete.mockResolvedValue(mockResult);
      
      const result = await service.delete({ key: 'test-file.txt' });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.info).toHaveBeenCalledWith('Basepack Storage: Deleting file', { 
        key: 'test-file.txt'
      });
    });

    it('should handle delete errors', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const error = new Error('Delete failed');
      mockProvider.delete.mockRejectedValue(error);
      
      await expect(service.delete({ key: 'test-file.txt' })).rejects.toThrow('Delete failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Storage: Delete exception', { 
        key: 'test-file.txt',
        error
      });
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockResult = {
        success: true,
        key: 'test-file.txt',
        url: 'https://test-bucket.s3.amazonaws.com/test-file.txt?signature=abc123',
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.getSignedUrl.mockResolvedValue(mockResult);
      
      const result = await service.getSignedUrl({ 
        key: 'test-file.txt',
        expiresIn: 3600
      });
      
      expect(result).toEqual(mockResult);
      expect(mockLogger.debug).toHaveBeenCalledWith('Basepack Storage: Generating signed URL', { 
        key: 'test-file.txt',
        operation: 'read',
        expiresInSec: 3600
      });
    });

    it('should handle signed URL errors', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const error = new Error('URL generation failed');
      mockProvider.getSignedUrl.mockRejectedValue(error);
      
      await expect(service.getSignedUrl({ 
        key: 'test-file.txt',
        expiresIn: 3600
      })).rejects.toThrow('URL generation failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Basepack Storage: Signed URL exception', { 
        key: 'test-file.txt',
        error
      });
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      const mockHealth = {
        ok: true,
        message: 'Healthy',
        provider: StorageProvider.S3,
        timestamp: new Date(),
      };
      
      mockProvider.health.mockResolvedValue(mockHealth);
      
      const result = await service.health();
      
      expect(result).toEqual(mockHealth);
    });

    it('should handle providers without health method', async () => {
      const service = new StorageService(s3Config);
      const mockProvider = (S3Provider as jest.Mock).mock.results[0].value;
      
      // Remove health method
      delete mockProvider.health;
      
      const result = await service.health();
      
      expect(result).toEqual({
        ok: true,
        provider: 's3',
        timestamp: expect.any(Date),
        message: 'Provider does not support health checks'
      });
    });
  });
});

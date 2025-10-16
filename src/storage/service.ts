/**
 * Storage service implementation
 * @module storage/service
 */

import type {
  IStorageProvider,
  StorageServiceConfig,
  S3Config,
  GCSConfig,
  FileUploadConfig,
  UrlUploadConfig,
  FileDownloadConfig,
  FileDeleteConfig,
  SignedUrlConfig,
  FileUploadResult,
  FileDownloadResult,
  FileDeleteResult,
  SignedUrlResult,
  StorageHealthInfo,
} from './types';
import { StorageProvider } from './types';
import type { Logger } from '../logger';
import { consoleLogger } from '../logger';
import { StorageProviderError } from './errors';
import { S3Provider, GCSProvider } from './adapters';

/**
 * Storage service for file operations
 * 
 * Provides a unified interface for file storage operations across different providers.
 * Currently supports AWS S3 and S3-compatible services.
 * 
 * @example AWS S3
 * ```typescript
 * const storage = new StorageService({
 *   provider: StorageProvider.S3,
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1',
 *     credentials: {
 *       accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
 *     }
 *   }
 * });
 * 
 * // Upload file
 * const uploadResult = await storage.upload({
 *   key: 'documents/report.pdf',
 *   data: buffer,
 *   contentType: 'application/pdf'
 * });
 * 
 * // Download file
 * const downloadResult = await storage.download({
 *   key: 'documents/report.pdf'
 * });
 * 
 * // Generate signed URL
 * const urlResult = await storage.getSignedUrl({
 *   key: 'documents/report.pdf',
 *   expiresIn: 3600
 * });
 * ```
 * 
 * @example S3-compatible service (MinIO, DigitalOcean Spaces)
 * ```typescript
 * const storage = new StorageService({
 *   provider: StorageProvider.S3,
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1',
 *     endpoint: 'https://nyc3.digitaloceanspaces.com',
 *     forcePathStyle: true
 *   }
 * });
 * ```
 * 
 * @example Upload from URL
 * ```typescript
 * const result = await storage.uploadFromUrl({
 *   key: 'images/downloaded.jpg',
 *   url: 'https://example.com/image.jpg',
 *   metadata: {
 *     source: 'external'
 *   }
 * });
 * ```
 */
export class StorageService {
  private readonly provider: IStorageProvider;
  private readonly logger: Logger;

  /**
   * Creates a new StorageService instance
   * 
   * @param config - Storage service configuration
   * @throws {StorageProviderError} If provider is not supported or configuration is invalid
   * 
   * @example
   * ```typescript
   * const storage = new StorageService({
   *   provider: StorageProvider.S3,
   *   config: {
   *     bucket: 'my-bucket',
   *     region: 'us-east-1'
   *   }
   * });
   * ```
   */
  constructor(config: StorageServiceConfig) {
    this.logger = config.logger || consoleLogger();
    this.logger.debug('Basepack Storage: Initializing service', { provider: config.provider });
    this.provider = this.createProvider(config);
  }

  /**
   * Upload a file to storage
   * 
   * @param config - Upload configuration
   * @returns Upload result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example Basic upload
   * ```typescript
   * const result = await storage.upload({
   *   key: 'documents/report.pdf',
   *   data: buffer,
   *   contentType: 'application/pdf'
   * });
   * 
   * if (result.success) {
   *   console.log(`File uploaded: ${result.key}`);
   * }
   * ```
   * 
   * @example Upload with metadata
   * ```typescript
   * const result = await storage.upload({
   *   key: 'images/photo.jpg',
   *   data: buffer,
   *   contentType: 'image/jpeg',
   *   metadata: {
   *     userId: '123',
   *     uploadedAt: new Date().toISOString()
   *   },
   *   cacheControl: 'max-age=31536000'
   * });
   * ```
   */
  async upload(config: FileUploadConfig): Promise<FileUploadResult> {
    this.logger.info('Basepack Storage: Uploading file', { key: config.key, contentType: config.contentType });
    try {
      const result = await this.provider.upload(config);
      if (result.success) {
        this.logger.info('Basepack Storage: File uploaded successfully', { key: config.key, provider: result.provider });
      } else {
        this.logger.error('Basepack Storage: Upload failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Storage: Upload exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Upload a file from a URL to storage
   * 
   * Downloads the file from the specified URL and uploads it to storage.
   * 
   * @param config - URL upload configuration
   * @returns Upload result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await storage.uploadFromUrl({
   *   key: 'images/downloaded.jpg',
   *   url: 'https://example.com/image.jpg',
   *   metadata: {
   *     source: 'external',
   *     originalUrl: 'https://example.com/image.jpg'
   *   }
   * });
   * 
   * if (result.success) {
   *   console.log(`File uploaded from URL: ${result.key}`);
   * }
   * ```
   */
  async uploadFromUrl(config: UrlUploadConfig): Promise<FileUploadResult> {
    this.logger.info('Basepack Storage: Uploading file from URL', { key: config.key, url: config.url });
    try {
      const result = await this.provider.uploadFromUrl(config);
      if (result.success) {
        this.logger.info('Basepack Storage: File uploaded from URL', { key: config.key, provider: result.provider });
      } else {
        this.logger.error('Basepack Storage: URL upload failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Storage: URL upload exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Download a file from storage
   * 
   * @param config - Download configuration
   * @returns Download result with file data
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await storage.download({
   *   key: 'documents/report.pdf'
   * });
   * 
   * if (result.success && result.data) {
   *   console.log(`Downloaded ${result.size} bytes`);
   *   console.log(`Content type: ${result.contentType}`);
   *   console.log(`Last modified: ${result.lastModified}`);
   *   
   *   // Save to file
   *   await fs.writeFile('report.pdf', result.data);
   * }
   * ```
   */
  async download(config: FileDownloadConfig): Promise<FileDownloadResult> {
    this.logger.info('Basepack Storage: Downloading file', { key: config.key });
    try {
      const result = await this.provider.download(config);
      if (result.success) {
        this.logger.info('Basepack Storage: File downloaded successfully', { 
          key: config.key, 
          provider: result.provider,
          sizeBytes: result.size 
        });
      } else {
        this.logger.error('Basepack Storage: Download failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Storage: Download exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * 
   * Removes a file from the storage provider.
   * 
   * @param config - Delete configuration
   * @returns Delete result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await storage.delete({
   *   key: 'documents/old-report.pdf'
   * });
   * 
   * if (result.success) {
   *   console.log('File deleted successfully');
   * }
   * ```
   */
  async delete(config: FileDeleteConfig): Promise<FileDeleteResult> {
    this.logger.info('Basepack Storage: Deleting file', { key: config.key });
    try {
      const result = await this.provider.delete(config);
      if (result.success) {
        this.logger.info('Basepack Storage: File deleted successfully', { 
          key: config.key, 
          provider: result.provider
        });
      } else {
        this.logger.error('Basepack Storage: Delete failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Storage: Delete exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Generate a signed URL for file access
   * 
   * Creates a pre-signed URL that allows temporary access to a file without
   * requiring authentication. Useful for sharing files or allowing direct
   * uploads from client applications.
   * 
   * @param config - Signed URL configuration
   * @returns Signed URL result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example Get download URL
   * ```typescript
   * const result = await storage.getSignedUrl({
   *   key: 'documents/report.pdf',
   *   expiresIn: 3600, // 1 hour
   *   operation: 'getObject'
   * });
   * 
   * if (result.success && result.url) {
   *   console.log(`Download URL: ${result.url}`);
   *   console.log(`Expires at: ${result.expiresAt}`);
   *   
   *   // Share URL with user
   *   await sendEmail({ url: result.url });
   * }
   * ```
   * 
   * @example Get upload URL
   * ```typescript
   * const result = await storage.getSignedUrl({
   *   key: 'uploads/user-file.pdf',
   *   expiresIn: 900, // 15 minutes
   *   operation: 'putObject',
   *   contentType: 'application/pdf'
   * });
   * 
   * if (result.success && result.url) {
   *   // Return URL to client for direct upload
   *   res.json({ uploadUrl: result.url });
   * }
   * ```
   */
  async getSignedUrl(config: SignedUrlConfig): Promise<SignedUrlResult> {
    this.logger.debug('Basepack Storage: Generating signed URL', { 
      key: config.key, 
      operation: config.operation,
      expiresInSec: config.expiresIn 
    });
    try {
      const result = await this.provider.getSignedUrl(config);
      if (result.success) {
        this.logger.debug('Basepack Storage: Signed URL generated', { 
          key: config.key, 
          provider: result.provider,
          expiresAt: result.expiresAt
        });
      } else {
        this.logger.error('Basepack Storage: Signed URL failed', { key: config.key, error: result.error });
      }
      return result;
    } catch (error) {
      this.logger.error('Basepack Storage: Signed URL exception', { key: config.key, error });
      throw error;
    }
  }

  /**
   * Check storage provider health
   * 
   * Performs a lightweight operation to verify connectivity and access to the storage provider.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await storage.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`Storage is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`Storage is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Checking health');
    try {
      const health = await this.provider.health();
      this.logger.debug('Basepack Storage: Health check completed', { 
        provider: health.provider,
        status: health.status,
        responseTimeMs: health.responseTime
      });
      return health;
    } catch (error) {
      this.logger.error('Basepack Storage: Health check exception', { error });
      throw error;
    }
  }

  /**
   * Get the current provider name
   * 
   * @returns Provider name
   * 
   * @example
   * ```typescript
   * const providerName = storage.getProviderName();
   * console.log(`Using provider: ${providerName}`);
   * ```
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Create a storage provider instance
   * 
   * @param config - Provider configuration
   * @returns Provider instance
   * @throws {StorageProviderError} If provider is not supported
   */
  private createProvider(config: StorageServiceConfig): IStorageProvider {
    switch (config.provider) {
      case StorageProvider.S3:
        return new S3Provider((config.config || {}) as S3Config, this.logger);
      
      case StorageProvider.GCS:
        return new GCSProvider((config.config || {}) as GCSConfig, this.logger);
      
      default:
        throw new Error(
          `Unsupported storage provider: ${config.provider}`
        );
    }
  }
}


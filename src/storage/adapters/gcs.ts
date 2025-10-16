/**
 * Google Cloud Storage adapter
 * @module storage/adapters/gcs
 */

import {
  IStorageProvider,
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
  StorageProvider,
} from '../types';
import type { Logger } from '../../logger';
import { StorageError, StorageProviderError } from '../errors';
import {
  validateFileUpload,
  validateUrlUpload,
  validateFileDownload,
  validateFileDelete,
  validateSignedUrl,
} from '../validation';

/**
 * Google Cloud Storage provider
 * 
 * Provides file storage operations using Google Cloud Storage.
 * 
 * @example Basic usage with default credentials
 * ```typescript
 * const provider = new GCSProvider({
 *   bucket: 'my-bucket'
 * });
 * 
 * // Upload file
 * const result = await provider.upload({
 *   key: 'documents/report.pdf',
 *   data: buffer,
 *   contentType: 'application/pdf'
 * });
 * ```
 * 
 * @example Using service account key file
 * ```typescript
 * const provider = new GCSProvider({
 *   bucket: 'my-bucket',
 *   keyFilename: '/path/to/service-account-key.json'
 * });
 * ```
 * 
 * @example Using credentials object
 * ```typescript
 * const provider = new GCSProvider({
 *   bucket: 'my-bucket',
 *   credentials: {
 *     client_email: 'service-account@project.iam.gserviceaccount.com',
 *     private_key: '-----BEGIN PRIVATE KEY-----\n...'
 *   }
 * });
 * ```
 * 
 * @example With project ID
 * ```typescript
 * const provider = new GCSProvider({
 *   bucket: 'my-bucket',
 *   projectId: 'my-project-id',
 *   keyFilename: '/path/to/service-account-key.json'
 * });
 * ```
 */
export class GCSProvider implements IStorageProvider {
  readonly name = StorageProvider.GCS;
  private readonly storage: any;
  private readonly bucket: any;
  private readonly logger: Logger;

  /**
   * Creates a new GCSProvider instance
   * 
   * @param config - GCS configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {StorageProviderError} If Google Cloud Storage SDK is not installed
   * @throws {StorageError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new GCSProvider({
   *   bucket: 'my-bucket',
   *   keyFilename: '/path/to/service-account-key.json'
   * });
   * ```
   */
  constructor(config: GCSConfig, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Storage: Initializing provider', { 
      provider: this.name, 
      bucket: config.bucket, 
      projectId: config.projectId 
    });
    
    if (!config.bucket) {
      this.logger.error('Basepack Storage: Provider bucket missing', { provider: this.name });
      throw new StorageError('GCS bucket is required', this.name);
    }

    try {
      const { Storage } = require('@google-cloud/storage');
      
      const storageConfig: any = {};

      if (config.projectId) {
        storageConfig.projectId = config.projectId;
      }

      if (config.keyFilename) {
        storageConfig.keyFilename = config.keyFilename;
      }

      if (config.credentials) {
        storageConfig.credentials = config.credentials;
      }

      if (config.apiEndpoint) {
        storageConfig.apiEndpoint = config.apiEndpoint;
      }

      this.storage = new Storage(storageConfig);
      this.bucket = this.storage.bucket(config.bucket);
    } catch (error) {
      this.logger.error('Basepack Storage: Provider initialization failed', { provider: this.name, error });
      throw new StorageProviderError(
        this.name,
        '@google-cloud/storage is not installed. Install it with: npm install @google-cloud/storage'
      );
    }
  }

  /**
   * Upload a file to GCS
   * 
   * @param config - Upload configuration
   * @returns Upload result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await provider.upload({
   *   key: 'documents/report.pdf',
   *   data: buffer,
   *   contentType: 'application/pdf',
   *   metadata: {
   *     userId: '123'
   *   }
   * });
   * ```
   */
  async upload(config: FileUploadConfig): Promise<FileUploadResult> {
    validateFileUpload(config);
    this.logger.debug('Basepack Storage: Provider uploading file', { 
      provider: this.name, 
      bucket: this.bucket.name, 
      key: config.key 
    });

    try {
      const file = this.bucket.file(config.key);
      const options: any = {};

      if (config.contentType) {
        options.metadata = {
          contentType: config.contentType,
        };
      }

      if (config.metadata) {
        options.metadata = {
          ...options.metadata,
          metadata: config.metadata,
        };
      }

      if (config.cacheControl) {
        options.metadata = {
          ...options.metadata,
          cacheControl: config.cacheControl,
        };
      }

      if (config.contentEncoding) {
        options.metadata = {
          ...options.metadata,
          contentEncoding: config.contentEncoding,
        };
      }

      await file.save(config.data, options);

      // Get metadata to extract etag
      const [metadata] = await file.getMetadata();

      this.logger.debug('Basepack Storage: Provider file uploaded', { 
        provider: this.name, 
        key: config.key, 
        etag: metadata.etag 
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        etag: metadata.etag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider upload failed', { 
        provider: this.name, 
        key: config.key, 
        error 
      });
      const storageError = StorageError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        error: storageError.message,
      };
    }
  }

  /**
   * Upload a file from a URL to GCS
   * 
   * Downloads the file from the URL and uploads it to GCS.
   * 
   * @param config - URL upload configuration
   * @returns Upload result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await provider.uploadFromUrl({
   *   key: 'images/downloaded.jpg',
   *   url: 'https://example.com/image.jpg',
   *   metadata: {
   *     source: 'external'
   *   }
   * });
   * ```
   */
  async uploadFromUrl(config: UrlUploadConfig): Promise<FileUploadResult> {
    validateUrlUpload(config);
    this.logger.debug('Basepack Storage: Provider uploading from URL', { 
      provider: this.name, 
      key: config.key, 
      url: config.url 
    });

    try {
      // Fetch the file from URL
      const response = await fetch(config.url);
      
      if (!response.ok) {
        throw new StorageError(
          `Failed to download file from URL: ${response.statusText}`,
          this.name
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Detect content type if not provided
      const contentType = config.contentType || response.headers.get('content-type') || undefined;

      // Upload to GCS
      return await this.upload({
        key: config.key,
        data: buffer,
        contentType,
        metadata: config.metadata,
        cacheControl: config.cacheControl,
      });
    } catch (error) {
      this.logger.error('Basepack Storage: Provider URL upload failed', { 
        provider: this.name, 
        key: config.key, 
        url: config.url, 
        error 
      });
      
      if (error instanceof StorageError) {
        return {
          success: false,
          key: config.key,
          provider: this.name,
          timestamp: new Date(),
          error: error.message,
        };
      }

      const storageError = StorageError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        error: storageError.message,
      };
    }
  }

  /**
   * Download a file from GCS
   * 
   * @param config - Download configuration
   * @returns Download result with file data
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await provider.download({
   *   key: 'documents/report.pdf'
   * });
   * 
   * if (result.success && result.data) {
   *   console.log(`Downloaded ${result.size} bytes`);
   *   console.log(`Content type: ${result.contentType}`);
   * }
   * ```
   */
  async download(config: FileDownloadConfig): Promise<FileDownloadResult> {
    validateFileDownload(config);
    this.logger.debug('Basepack Storage: Provider downloading file', { 
      provider: this.name, 
      bucket: this.bucket.name, 
      key: config.key 
    });

    try {
      const file = this.bucket.file(config.key);

      // Download file
      const [buffer] = await file.download();

      // Get metadata
      const [metadata] = await file.getMetadata();

      this.logger.debug('Basepack Storage: Provider file downloaded', { 
        provider: this.name,
        key: config.key, 
        sizeBytes: metadata.size,
        contentType: metadata.contentType
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        data: buffer,
        contentType: metadata.contentType,
        metadata: metadata.metadata,
        size: parseInt(metadata.size, 10),
        lastModified: new Date(metadata.updated),
        etag: metadata.etag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider download failed', { 
        provider: this.name, 
        key: config.key, 
        error 
      });
      const storageError = StorageError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        error: storageError.message,
      };
    }
  }

  /**
   * Delete a file from GCS
   * 
   * @param config - Delete configuration
   * @returns Delete result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const result = await provider.delete({
   *   key: 'documents/report.pdf'
   * });
   * ```
   */
  async delete(config: FileDeleteConfig): Promise<FileDeleteResult> {
    validateFileDelete(config);
    this.logger.debug('Basepack Storage: Provider deleting file', { 
      provider: this.name, 
      bucket: this.bucket.name, 
      key: config.key 
    });

    try {
      const file = this.bucket.file(config.key);
      await file.delete();

      this.logger.debug('Basepack Storage: Provider file deleted', { 
        provider: this.name, 
        key: config.key 
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider delete failed', { 
        provider: this.name, 
        key: config.key, 
        error 
      });
      const storageError = StorageError.from(error, this.name, this.isRetryableError(error));
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        error: storageError.message,
      };
    }
  }

  /**
   * Generate a signed URL for GCS object access
   * 
   * Creates a pre-signed URL that allows temporary access to a GCS object.
   * 
   * @param config - Signed URL configuration
   * @returns Signed URL result
   * @throws {StorageValidationError} If configuration is invalid
   * 
   * @example Get object URL
   * ```typescript
   * const result = await provider.getSignedUrl({
   *   key: 'documents/report.pdf',
   *   expiresIn: 3600, // 1 hour
   *   operation: 'getObject'
   * });
   * 
   * if (result.success && result.url) {
   *   console.log(`Download URL: ${result.url}`);
   *   console.log(`Expires at: ${result.expiresAt}`);
   * }
   * ```
   * 
   * @example Put object URL
   * ```typescript
   * const result = await provider.getSignedUrl({
   *   key: 'uploads/new-file.pdf',
   *   expiresIn: 900, // 15 minutes
   *   operation: 'putObject',
   *   contentType: 'application/pdf'
   * });
   * 
   * // Use the URL to upload directly from client
   * ```
   */
  async getSignedUrl(config: SignedUrlConfig): Promise<SignedUrlResult> {
    validateSignedUrl(config);
    this.logger.debug('Basepack Storage: Provider generating signed URL', { 
      provider: this.name,
      key: config.key, 
      operation: config.operation || 'getObject',
      expiresInSec: config.expiresIn || 3600
    });

    try {
      const file = this.bucket.file(config.key);
      const expiresIn = config.expiresIn || 3600; // Default 1 hour
      const operation = config.operation || 'getObject';

      const options: any = {
        version: 'v4',
        action: operation === 'getObject' ? 'read' : 'write',
        expires: Date.now() + expiresIn * 1000,
      };

      if (operation === 'putObject' && config.contentType) {
        options.contentType = config.contentType;
      }

      const [url] = await file.getSignedUrl(options);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.debug('Basepack Storage: Provider signed URL generated', { 
        provider: this.name, 
        key: config.key, 
        expiresAt 
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        url,
        expiresAt,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider signed URL failed', { 
        provider: this.name, 
        key: config.key, 
        error 
      });
      const storageError = StorageError.from(error, this.name, false);
      
      return {
        success: false,
        key: config.key,
        provider: this.name,
        error: storageError.message,
      };
    }
  }

  /**
   * Check GCS provider health
   * 
   * Performs a lightweight operation to verify connectivity to GCS.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`GCS is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`GCS is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Provider health check', { 
      provider: this.name, 
      bucket: this.bucket.name 
    });
    const startTime = Date.now();

    try {
      // Check if bucket exists and is accessible
      const [exists] = await this.bucket.exists();

      if (!exists) {
        throw new StorageError('Bucket does not exist or is not accessible', this.name);
      }

      const responseTime = Date.now() - startTime;

      this.logger.debug('Basepack Storage: Provider health check passed', { 
        provider: this.name, 
        responseTimeMs: responseTime 
      });

      return {
        provider: this.name,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider health check failed', { 
        provider: this.name, 
        error 
      });
      const storageError = StorageError.from(error, this.name);

      return {
        provider: this.name,
        status: 'unhealthy',
        error: storageError.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Determines if an error is retryable
   * 
   * @param error - Error to check
   * @returns True if the error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    const statusCode = 
      (error as any)?.code || 
      (error as any)?.statusCode || 
      (error as any)?.status;
    
    if (statusCode) {
      // Retry on rate limiting, server errors, and network issues
      return [429, 500, 502, 503, 504].includes(statusCode);
    }

    // Retry on network errors
    const errorName = (error as any)?.name;
    return errorName === 'NetworkError' || errorName === 'TimeoutError';
  }
}


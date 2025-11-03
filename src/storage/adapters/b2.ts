/**
 * Backblaze B2 storage adapter
 * @module storage/adapters/b2
 */

import {
  IStorageProvider,
  B2Config,
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
import { toSafeErrorDetails } from '../../logger';
import { StorageError, StorageProviderError } from '../errors';
import {
  validateFileUpload,
  validateUrlUpload,
  validateFileDownload,
  validateFileDelete,
  validateSignedUrl,
} from '../validation';

/**
 * Backblaze B2 storage provider
 * 
 * Provides file storage operations using Backblaze B2 (S3-compatible API).
 * 
 * @example Basic usage
 * ```typescript
 * const provider = new B2Provider({
 *   bucket: 'my-bucket',
 *   credentials: {
 *     accessKeyId: 'your-key-id',
 *     secretAccessKey: 'your-application-key'
 *   },
 *   region: 'us-west-004'
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
 * @example Custom endpoint
 * ```typescript
 * const provider = new B2Provider({
 *   bucket: 'my-bucket',
 *   credentials: {
 *     accessKeyId: 'your-key-id',
 *     secretAccessKey: 'your-application-key'
 *   },
 *   endpoint: 'https://s3.us-west-004.backblazeb2.com'
 * });
 * ```
 */
export class B2Provider implements IStorageProvider {
  readonly name = StorageProvider.B2;
  private readonly client: any;
  private readonly bucket: string;
  private readonly logger: Logger;

  /**
   * Creates a new B2Provider instance
   * 
   * @param config - B2 configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {StorageProviderError} If AWS SDK is not installed
   * @throws {StorageError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new B2Provider({
   *   bucket: 'my-bucket',
   *   credentials: {
   *     accessKeyId: 'your-key-id',
   *     secretAccessKey: 'your-application-key'
   *   },
   *   region: 'us-west-004'
   * });
   * ```
   */
  constructor(config: B2Config, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Storage: Initializing provider', { 
      provider: this.name, 
      bucket: config.bucket, 
      region: config.region 
    });
    
    if (!config.bucket) {
      this.logger.error('Basepack Storage: Provider bucket missing', { provider: this.name });
      throw new StorageError('B2 bucket is required', this.name);
    }

    if (!config.credentials) {
      this.logger.error('Basepack Storage: Provider credentials missing', { provider: this.name });
      throw new StorageError('B2 credentials are required', this.name);
    }

    this.bucket = config.bucket;

    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      
      const region = config.region || 'us-west-004';
      const endpoint = config.endpoint || `https://s3.${region}.backblazeb2.com`;

      this.client = new S3Client({
        region,
        endpoint,
        credentials: config.credentials,
        forcePathStyle: false,
      });
    } catch (error) {
      this.logger.error('Basepack Storage: Provider initialization failed', { provider: this.name, error: toSafeErrorDetails(error) });
      throw new StorageProviderError(
        this.name,
        '@aws-sdk/client-s3 is not installed. Install it with: npm install @aws-sdk/client-s3'
      );
    }
  }

  /**
   * Upload a file to B2
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
    this.logger.debug('Basepack Storage: Provider uploading file', { provider: this.name, bucket: this.bucket, key: config.key });

    const startTime = Date.now();

    try {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');

      const params: any = {
        Bucket: this.bucket,
        Key: config.key,
        Body: config.data,
      };

      if (config.contentType) {
        params.ContentType = config.contentType;
      }

      if (config.metadata) {
        params.Metadata = config.metadata;
      }

      if (config.cacheControl) {
        params.CacheControl = config.cacheControl;
      }

      if (config.contentEncoding) {
        params.ContentEncoding = config.contentEncoding;
      }

      const command = new PutObjectCommand(params);
      const response = await this.client.send(command);

      this.logger.debug('Basepack Storage: Provider file uploaded', { provider: this.name, key: config.key, etag: response.ETag });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider upload failed', { provider: this.name, key: config.key, error: toSafeErrorDetails(error) });
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
   * Upload a file from a URL to B2
   * 
   * Downloads the file from the URL and uploads it to B2.
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
    this.logger.debug('Basepack Storage: Provider uploading from URL', { provider: this.name, key: config.key, url: config.url });

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

      // Upload to B2
      return await this.upload({
        key: config.key,
        data: buffer,
        contentType,
        metadata: config.metadata,
        cacheControl: config.cacheControl,
      });
    } catch (error) {
      this.logger.error('Basepack Storage: Provider URL upload failed', { provider: this.name, key: config.key, url: config.url, error: toSafeErrorDetails(error) });
      
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
   * Download a file from B2
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
    this.logger.debug('Basepack Storage: Provider downloading file', { provider: this.name, bucket: this.bucket, key: config.key });

    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: config.key,
      });

      const response = await this.client.send(command);

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      this.logger.debug('Basepack Storage: Provider file downloaded', { 
        provider: this.name,
        key: config.key, 
        sizeBytes: response.ContentLength,
        contentType: response.ContentType
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        data: buffer,
        contentType: response.ContentType,
        metadata: response.Metadata,
        size: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider download failed', { provider: this.name, key: config.key, error: toSafeErrorDetails(error) });
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
   * Delete a file from B2
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
    this.logger.debug('Basepack Storage: Provider deleting file', { provider: this.name, bucket: this.bucket, key: config.key });

    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: config.key,
      });

      await this.client.send(command);

      this.logger.debug('Basepack Storage: Provider file deleted', { provider: this.name, key: config.key });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider delete failed', { provider: this.name, key: config.key, error: toSafeErrorDetails(error) });
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
   * Generate a signed URL for B2 object access
   * 
   * Creates a pre-signed URL that allows temporary access to a B2 object.
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
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

      const expiresIn = config.expiresIn || 3600; // Default 1 hour
      const operation = config.operation || 'getObject';

      let command: any;
      if (operation === 'getObject') {
        command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: config.key,
        });
      } else {
        const params: any = {
          Bucket: this.bucket,
          Key: config.key,
        };

        if (config.contentType) {
          params.ContentType = config.contentType;
        }

        command = new PutObjectCommand(params);
      }

      const url = await getSignedUrl(this.client, command, { expiresIn });
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.debug('Basepack Storage: Provider signed URL generated', { provider: this.name, key: config.key, expiresAt });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        url,
        expiresAt,
      };
    } catch (error) {
      // Check if the error is due to missing presigner package
      if (error instanceof Error && error.message.includes('@aws-sdk/s3-request-presigner')) {
        this.logger.error('Basepack Storage: Provider package missing', { provider: this.name, package: '@aws-sdk/s3-request-presigner', error: toSafeErrorDetails(error) });
        throw new StorageProviderError(
          this.name,
          '@aws-sdk/s3-request-presigner is not installed. Install it with: npm install @aws-sdk/s3-request-presigner'
        );
      }

      this.logger.error('Basepack Storage: Provider signed URL failed', { provider: this.name, key: config.key, error: toSafeErrorDetails(error) });
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
   * Check B2 provider health
   * 
   * Performs a lightweight operation to verify connectivity to B2.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`B2 is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`B2 is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Provider health check', { provider: this.name, bucket: this.bucket });
    const startTime = Date.now();

    try {
      const { HeadBucketCommand } = require('@aws-sdk/client-s3');

      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });

      await this.client.send(command);

      const responseTime = Date.now() - startTime;

      this.logger.debug('Basepack Storage: Provider health check passed', { provider: this.name, responseTimeMs: responseTime });

      return {
        provider: this.name,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider health check failed', { provider: this.name, error: toSafeErrorDetails(error) });
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
      (error as any)?.statusCode || 
      (error as any)?.status || 
      (error as any)?.$metadata?.httpStatusCode;
    
    if (statusCode) {
      // Retry on rate limiting, server errors, and network issues
      return [429, 500, 502, 503, 504].includes(statusCode);
    }

    // Retry on network errors
    const errorName = (error as any)?.name;
    return errorName === 'NetworkError' || errorName === 'TimeoutError';
  }
}


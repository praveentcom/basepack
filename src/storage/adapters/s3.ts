/**
 * AWS S3 storage adapter
 * @module storage/adapters/s3
 */

import type {
  IStorageProvider,
  S3Config,
  FileUploadConfig,
  UrlUploadConfig,
  FileDownloadConfig,
  SignedUrlConfig,
  FileUploadResult,
  FileDownloadResult,
  SignedUrlResult,
  StorageHealthInfo,
} from '../types';
import type { Logger } from '../../logger';
import { StorageError, StorageProviderError } from '../errors';
import {
  validateFileUpload,
  validateUrlUpload,
  validateFileDownload,
  validateSignedUrl,
} from '../validation';

/**
 * AWS S3 storage provider
 * 
 * Provides file storage operations using AWS S3 or S3-compatible services.
 * 
 * @example Basic usage
 * ```typescript
 * const provider = new S3Provider({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   credentials: {
 *     accessKeyId: 'AKIA...',
 *     secretAccessKey: 'secret...'
 *   }
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
 * @example S3-compatible service (MinIO, DigitalOcean Spaces, etc.)
 * ```typescript
 * const provider = new S3Provider({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   endpoint: 'https://nyc3.digitaloceanspaces.com',
 *   forcePathStyle: true
 * });
 * ```
 * 
 * @example Using default credentials
 * ```typescript
 * // Uses credentials from environment or AWS config
 * const provider = new S3Provider({
 *   bucket: 'my-bucket',
 *   region: 'us-east-1'
 * });
 * ```
 */
export class S3Provider implements IStorageProvider {
  readonly name = 's3';
  private readonly client: any;
  private readonly bucket: string;
  private readonly logger: Logger;

  /**
   * Creates a new S3Provider instance
   * 
   * @param config - S3 configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {StorageProviderError} If AWS SDK is not installed
   * @throws {StorageError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new S3Provider({
   *   bucket: 'my-bucket',
   *   region: 'us-east-1'
   * });
   * ```
   */
  constructor(config: S3Config, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Storage: Initializing provider', { provider: 's3', bucket: config.bucket, region: config.region });
    
    if (!config.bucket) {
      this.logger.error('Basepack Storage: Provider bucket missing', { provider: 's3' });
      throw new StorageError('S3 bucket is required', this.name);
    }

    this.bucket = config.bucket;

    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      
      const clientConfig: any = {
        region: config.region || 'us-east-1',
      };

      if (config.credentials) {
        clientConfig.credentials = config.credentials;
      }

      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint;
      }

      if (config.forcePathStyle !== undefined) {
        clientConfig.forcePathStyle = config.forcePathStyle;
      }

      this.client = new S3Client(clientConfig);
    } catch (error) {
      this.logger.error('Basepack Storage: Provider initialization failed', { provider: 's3', error });
      throw new StorageProviderError(
        this.name,
        '@aws-sdk/client-s3 is not installed. Install it with: npm install @aws-sdk/client-s3'
      );
    }
  }

  /**
   * Upload a file to S3
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
    this.logger.debug('Basepack Storage: Provider uploading file', { provider: 's3', bucket: this.bucket, key: config.key });

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

      this.logger.debug('Basepack Storage: Provider file uploaded', { provider: 's3', key: config.key, etag: response.ETag });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        etag: response.ETag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider upload failed', { provider: 's3', key: config.key, error });
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
   * Upload a file from a URL to S3
   * 
   * Downloads the file from the URL and uploads it to S3.
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
    this.logger.debug('Basepack Storage: Provider uploading from URL', { provider: 's3', key: config.key, url: config.url });

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

      // Upload to S3
      return await this.upload({
        key: config.key,
        data: buffer,
        contentType,
        metadata: config.metadata,
        cacheControl: config.cacheControl,
      });
    } catch (error) {
      this.logger.error('Basepack Storage: Provider URL upload failed', { provider: 's3', key: config.key, url: config.url, error });
      
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
   * Download a file from S3
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
    this.logger.debug('Basepack Storage: Provider downloading file', { provider: 's3', bucket: this.bucket, key: config.key });

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
        provider: 's3',
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
      this.logger.error('Basepack Storage: Provider download failed', { provider: 's3', key: config.key, error });
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
   * Generate a signed URL for S3 object access
   * 
   * Creates a pre-signed URL that allows temporary access to an S3 object.
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
      provider: 's3',
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

      this.logger.debug('Basepack Storage: Provider signed URL generated', { provider: 's3', key: config.key, expiresAt });

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
        this.logger.error('Basepack Storage: Provider package missing', { provider: 's3', package: '@aws-sdk/s3-request-presigner', error });
        throw new StorageProviderError(
          this.name,
          '@aws-sdk/s3-request-presigner is not installed. Install it with: npm install @aws-sdk/s3-request-presigner'
        );
      }

      this.logger.error('Basepack Storage: Provider signed URL failed', { provider: 's3', key: config.key, error });
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
   * Check S3 provider health
   * 
   * Performs a lightweight operation to verify connectivity to S3.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`S3 is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`S3 is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Provider health check', { provider: 's3', bucket: this.bucket });
    const startTime = Date.now();

    try {
      const { HeadBucketCommand } = require('@aws-sdk/client-s3');

      const command = new HeadBucketCommand({
        Bucket: this.bucket,
      });

      await this.client.send(command);

      const responseTime = Date.now() - startTime;

      this.logger.debug('Basepack Storage: Provider health check passed', { provider: 's3', responseTimeMs: responseTime });

      return {
        provider: this.name,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider health check failed', { provider: 's3', error });
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


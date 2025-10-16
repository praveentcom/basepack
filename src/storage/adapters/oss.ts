/**
 * Alibaba Cloud OSS storage adapter
 * @module storage/adapters/oss
 */

import {
  IStorageProvider,
  OSSConfig,
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
 * Alibaba Cloud OSS storage provider
 * 
 * Provides file storage operations using Alibaba Cloud Object Storage Service (OSS).
 * 
 * @example Basic usage
 * ```typescript
 * const provider = new OSSProvider({
 *   bucket: 'my-bucket',
 *   region: 'oss-us-west-1',
 *   credentials: {
 *     accessKeyId: 'your-access-key-id',
 *     accessKeySecret: 'your-access-key-secret'
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
 * @example With STS token
 * ```typescript
 * const provider = new OSSProvider({
 *   bucket: 'my-bucket',
 *   region: 'oss-us-west-1',
 *   credentials: {
 *     accessKeyId: 'your-access-key-id',
 *     accessKeySecret: 'your-access-key-secret',
 *     stsToken: 'your-sts-token'
 *   }
 * });
 * ```
 * 
 * @example Internal network
 * ```typescript
 * const provider = new OSSProvider({
 *   bucket: 'my-bucket',
 *   region: 'oss-cn-hangzhou',
 *   credentials: {
 *     accessKeyId: 'your-access-key-id',
 *     accessKeySecret: 'your-access-key-secret'
 *   },
 *   internal: true
 * });
 * ```
 */
export class OSSProvider implements IStorageProvider {
  readonly name = StorageProvider.OSS;
  private readonly client: any;
  private readonly bucket: string;
  private readonly logger: Logger;

  /**
   * Creates a new OSSProvider instance
   * 
   * @param config - OSS configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {StorageProviderError} If ali-oss SDK is not installed
   * @throws {StorageError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new OSSProvider({
   *   bucket: 'my-bucket',
   *   region: 'oss-us-west-1',
   *   credentials: {
   *     accessKeyId: 'your-access-key-id',
   *     accessKeySecret: 'your-access-key-secret'
   *   }
   * });
   * ```
   */
  constructor(config: OSSConfig, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Storage: Initializing provider', { 
      provider: this.name, 
      bucket: config.bucket, 
      region: config.region 
    });
    
    if (!config.bucket) {
      this.logger.error('Basepack Storage: Provider bucket missing', { provider: this.name });
      throw new StorageError('OSS bucket is required', this.name);
    }

    if (!config.region) {
      this.logger.error('Basepack Storage: Provider region missing', { provider: this.name });
      throw new StorageError('OSS region is required', this.name);
    }

    if (!config.credentials) {
      this.logger.error('Basepack Storage: Provider credentials missing', { provider: this.name });
      throw new StorageError('OSS credentials are required', this.name);
    }

    this.bucket = config.bucket;

    try {
      const OSS = require('ali-oss');
      
      const clientConfig: any = {
        bucket: config.bucket,
        region: config.region,
        accessKeyId: config.credentials.accessKeyId,
        accessKeySecret: config.credentials.accessKeySecret,
      };

      if (config.credentials.stsToken) {
        clientConfig.stsToken = config.credentials.stsToken;
      }

      if (config.internal !== undefined) {
        clientConfig.internal = config.internal;
      }

      if (config.secure !== undefined) {
        clientConfig.secure = config.secure;
      } else {
        clientConfig.secure = true; // Default to HTTPS
      }

      if (config.endpoint) {
        clientConfig.endpoint = config.endpoint;
      }

      this.client = new OSS(clientConfig);
    } catch (error) {
      this.logger.error('Basepack Storage: Provider initialization failed', { provider: this.name, error });
      throw new StorageProviderError(
        this.name,
        'ali-oss is not installed. Install it with: npm install ali-oss'
      );
    }
  }

  /**
   * Upload a file to OSS
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
      const options: any = {};

      if (config.contentType) {
        options.mime = config.contentType;
      }

      if (config.metadata) {
        options.meta = config.metadata;
      }

      if (config.cacheControl) {
        options.headers = options.headers || {};
        options.headers['Cache-Control'] = config.cacheControl;
      }

      if (config.contentEncoding) {
        options.headers = options.headers || {};
        options.headers['Content-Encoding'] = config.contentEncoding;
      }

      const response = await this.client.put(config.key, config.data, options);

      this.logger.debug('Basepack Storage: Provider file uploaded', { 
        provider: this.name, 
        key: config.key, 
        etag: response.etag,
        url: response.url 
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        etag: response.etag,
        url: response.url,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider upload failed', { provider: this.name, key: config.key, error });
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
   * Upload a file from a URL to OSS
   * 
   * Downloads the file from the URL and uploads it to OSS.
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

      // Upload to OSS
      return await this.upload({
        key: config.key,
        data: buffer,
        contentType,
        metadata: config.metadata,
        cacheControl: config.cacheControl,
      });
    } catch (error) {
      this.logger.error('Basepack Storage: Provider URL upload failed', { provider: this.name, key: config.key, url: config.url, error });
      
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
   * Download a file from OSS
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
      const response = await this.client.get(config.key);

      // Get object metadata
      const head = await this.client.head(config.key);

      this.logger.debug('Basepack Storage: Provider file downloaded', { 
        provider: this.name,
        key: config.key, 
        sizeBytes: head.res.size,
        contentType: head.res.headers['content-type']
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        data: response.content,
        contentType: head.res.headers['content-type'],
        metadata: head.meta,
        size: parseInt(head.res.size || '0', 10),
        lastModified: new Date(head.res.headers['last-modified']),
        etag: head.etag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider download failed', { provider: this.name, key: config.key, error });
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
   * Delete a file from OSS
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
      await this.client.delete(config.key);

      this.logger.debug('Basepack Storage: Provider file deleted', { provider: this.name, key: config.key });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider delete failed', { provider: this.name, key: config.key, error });
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
   * Generate a signed URL for OSS object access
   * 
   * Creates a pre-signed URL that allows temporary access to an OSS object.
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
      const expiresIn = config.expiresIn || 3600; // Default 1 hour
      const operation = config.operation || 'getObject';

      let url: string;
      if (operation === 'getObject') {
        url = this.client.signatureUrl(config.key, {
          expires: expiresIn,
        });
      } else {
        const options: any = {
          expires: expiresIn,
          method: 'PUT',
        };

        if (config.contentType) {
          options['Content-Type'] = config.contentType;
        }

        url = this.client.signatureUrl(config.key, options);
      }

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
      this.logger.error('Basepack Storage: Provider signed URL failed', { provider: this.name, key: config.key, error });
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
   * Check OSS provider health
   * 
   * Performs a lightweight operation to verify connectivity to OSS.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`OSS is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`OSS is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Provider health check', { provider: this.name, bucket: this.bucket });
    const startTime = Date.now();

    try {
      await this.client.getBucketInfo(this.bucket);

      const responseTime = Date.now() - startTime;

      this.logger.debug('Basepack Storage: Provider health check passed', { provider: this.name, responseTimeMs: responseTime });

      return {
        provider: this.name,
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider health check failed', { provider: this.name, error });
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
      (error as any)?.code;
    
    if (statusCode) {
      // Retry on rate limiting, server errors, and network issues
      if (typeof statusCode === 'number') {
        return [429, 500, 502, 503, 504].includes(statusCode);
      }
      // OSS error codes
      if (typeof statusCode === 'string') {
        return ['RequestTimeout', 'ServiceUnavailable', 'InternalError'].includes(statusCode);
      }
    }

    // Retry on network errors
    const errorName = (error as any)?.name;
    return errorName === 'ConnectionTimeoutError' || errorName === 'RequestError';
  }
}


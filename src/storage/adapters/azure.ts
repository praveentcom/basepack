/**
 * Azure Blob Storage adapter
 * @module storage/adapters/azure
 */

import {
  IStorageProvider,
  AzureConfig,
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
 * Azure Blob Storage provider
 * 
 * Provides file storage operations using Azure Blob Storage.
 * 
 * @example Using connection string
 * ```typescript
 * const provider = new AzureProvider({
 *   container: 'my-container',
 *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!
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
 * @example Using account name and key
 * ```typescript
 * const provider = new AzureProvider({
 *   container: 'my-container',
 *   accountName: 'mystorageaccount',
 *   accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY!
 * });
 * ```
 * 
 * @example Using SAS token
 * ```typescript
 * const provider = new AzureProvider({
 *   container: 'my-container',
 *   accountName: 'mystorageaccount',
 *   sasToken: process.env.AZURE_STORAGE_SAS_TOKEN!
 * });
 * ```
 */
export class AzureProvider implements IStorageProvider {
  readonly name = StorageProvider.AZURE;
  private readonly containerClient: any;
  private readonly containerName: string;
  private readonly logger: Logger;

  /**
   * Creates a new AzureProvider instance
   * 
   * @param config - Azure configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {StorageProviderError} If Azure SDK is not installed
   * @throws {StorageError} If configuration is invalid
   * 
   * @example
   * ```typescript
   * const provider = new AzureProvider({
   *   container: 'my-container',
   *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!
   * });
   * ```
   */
  constructor(config: AzureConfig, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Storage: Initializing provider', { 
      provider: this.name, 
      container: config.container 
    });
    
    if (!config.container) {
      this.logger.error('Basepack Storage: Provider container missing', { provider: this.name });
      throw new StorageError('Azure container is required', this.name);
    }

    this.containerName = config.container;

    try {
      const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
      
      let blobServiceClient: any;

      // Authenticate using connection string
      if (config.connectionString) {
        blobServiceClient = BlobServiceClient.fromConnectionString(config.connectionString);
      }
      // Authenticate using account name and key
      else if (config.accountName && config.accountKey) {
        const credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
        const accountUrl = config.endpoint || `https://${config.accountName}.blob.core.windows.net`;
        blobServiceClient = new BlobServiceClient(accountUrl, credential);
      }
      // Authenticate using account name and SAS token
      else if (config.accountName && config.sasToken) {
        const accountUrl = config.endpoint || `https://${config.accountName}.blob.core.windows.net`;
        const sasUrl = `${accountUrl}?${config.sasToken}`;
        blobServiceClient = new BlobServiceClient(sasUrl);
      }
      // Default to anonymous access or managed identity
      else if (config.accountName) {
        const accountUrl = config.endpoint || `https://${config.accountName}.blob.core.windows.net`;
        blobServiceClient = new BlobServiceClient(accountUrl);
      }
      else {
        this.logger.error('Basepack Storage: Provider credentials missing', { provider: this.name });
        throw new StorageError(
          'Azure authentication credentials required. Provide either: connectionString, or accountName with accountKey/sasToken',
          this.name
        );
      }

      this.containerClient = blobServiceClient.getContainerClient(config.container);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      this.logger.error('Basepack Storage: Provider initialization failed', { provider: this.name, error: toSafeErrorDetails(error) });
      throw new StorageProviderError(
        this.name,
        '@azure/storage-blob is not installed. Install it with: npm install @azure/storage-blob'
      );
    }
  }

  /**
   * Upload a file to Azure Blob Storage
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
      container: this.containerName, 
      key: config.key 
    });

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(config.key);

      const options: any = {};

      if (config.contentType) {
        options.blobHTTPHeaders = {
          blobContentType: config.contentType,
        };
      }

      if (config.cacheControl) {
        options.blobHTTPHeaders = {
          ...options.blobHTTPHeaders,
          blobCacheControl: config.cacheControl,
        };
      }

      if (config.contentEncoding) {
        options.blobHTTPHeaders = {
          ...options.blobHTTPHeaders,
          blobContentEncoding: config.contentEncoding,
        };
      }

      if (config.metadata) {
        options.metadata = config.metadata;
      }

      const data = typeof config.data === 'string' ? Buffer.from(config.data) : config.data;
      const uploadResponse = await blockBlobClient.upload(data, data.length, options);

      this.logger.debug('Basepack Storage: Provider file uploaded', { 
        provider: this.name, 
        key: config.key, 
        etag: uploadResponse.etag 
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        timestamp: new Date(),
        etag: uploadResponse.etag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider upload failed', { 
        provider: this.name, 
        key: config.key, 
        error: toSafeErrorDetails(error) 
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
   * Upload a file from a URL to Azure Blob Storage
   * 
   * Downloads the file from the URL and uploads it to Azure.
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

      // Upload to Azure
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
        error: toSafeErrorDetails(error) 
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
   * Download a file from Azure Blob Storage
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
      container: this.containerName, 
      key: config.key 
    });

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(config.key);

      const downloadResponse = await blockBlobClient.download(0);
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      // Get properties for metadata
      const properties = await blockBlobClient.getProperties();

      this.logger.debug('Basepack Storage: Provider file downloaded', { 
        provider: this.name,
        key: config.key, 
        sizeBytes: properties.contentLength,
        contentType: properties.contentType
      });

      return {
        success: true,
        key: config.key,
        provider: this.name,
        data: buffer,
        contentType: properties.contentType,
        metadata: properties.metadata,
        size: properties.contentLength,
        lastModified: properties.lastModified,
        etag: properties.etag,
      };
    } catch (error) {
      this.logger.error('Basepack Storage: Provider download failed', { 
        provider: this.name, 
        key: config.key, 
        error: toSafeErrorDetails(error) 
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
   * Delete a file from Azure Blob Storage
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
      container: this.containerName, 
      key: config.key 
    });

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(config.key);
      await blockBlobClient.delete();

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
        error: toSafeErrorDetails(error) 
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
   * Generate a signed URL for Azure Blob Storage access
   * 
   * Creates a pre-signed URL that allows temporary access to a blob.
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
      const { 
        BlobSASPermissions, 
        generateBlobSASQueryParameters,
        StorageSharedKeyCredential 
      } = require('@azure/storage-blob');

      const blockBlobClient = this.containerClient.getBlockBlobClient(config.key);
      const expiresIn = config.expiresIn || 3600; // Default 1 hour
      const operation = config.operation || 'getObject';

      // Set permissions based on operation
      const permissions = operation === 'getObject' ? 'r' : 'w';

      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Generate SAS token
      const sasOptions = {
        containerName: this.containerName,
        blobName: config.key,
        permissions: BlobSASPermissions.parse(permissions),
        startsOn: new Date(),
        expiresOn: expiresAt,
      };

      // Add content type for PUT operations
      if (operation === 'putObject' && config.contentType) {
        (sasOptions as any).contentType = config.contentType;
      }

      // Note: This requires the account key to be available
      // For connection string or key-based auth, we need to extract credentials
      const credential = (blockBlobClient as any).credential;
      
      if (credential instanceof StorageSharedKeyCredential) {
        const sasToken = generateBlobSASQueryParameters(
          sasOptions,
          credential
        ).toString();

        const url = `${blockBlobClient.url}?${sasToken}`;

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
      } else {
        throw new StorageError(
          'Signed URL generation requires authentication with account key or connection string',
          this.name
        );
      }
    } catch (error) {
      // Check if the error is due to missing package
      if (error instanceof Error && error.message.includes('@azure/storage-blob')) {
        this.logger.error('Basepack Storage: Provider package missing', { 
          provider: this.name, 
          package: '@azure/storage-blob', 
          error: toSafeErrorDetails(error) 
        });
        throw new StorageProviderError(
          this.name,
          '@azure/storage-blob is not installed. Install it with: npm install @azure/storage-blob'
        );
      }

      this.logger.error('Basepack Storage: Provider signed URL failed', { 
        provider: this.name, 
        key: config.key, 
        error: toSafeErrorDetails(error) 
      });

      if (error instanceof StorageError) {
        return {
          success: false,
          key: config.key,
          provider: this.name,
          error: error.message,
        };
      }

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
   * Check Azure Blob Storage provider health
   * 
   * Performs a lightweight operation to verify connectivity to Azure.
   * 
   * @returns Health information
   * 
   * @example
   * ```typescript
   * const health = await provider.health();
   * 
   * if (health.status === 'healthy') {
   *   console.log(`Azure is healthy (${health.responseTime}ms)`);
   * } else {
   *   console.error(`Azure is unhealthy: ${health.error}`);
   * }
   * ```
   */
  async health(): Promise<StorageHealthInfo> {
    this.logger.debug('Basepack Storage: Provider health check', { 
      provider: this.name, 
      container: this.containerName 
    });
    const startTime = Date.now();

    try {
      // Check if container exists
      const exists = await this.containerClient.exists();

      if (!exists) {
        throw new StorageError('Container does not exist or is not accessible', this.name);
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
        error: toSafeErrorDetails(error) 
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
      (error as any)?.statusCode || 
      (error as any)?.status || 
      (error as any)?.code;
    
    if (statusCode) {
      // Retry on rate limiting, server errors, and network issues
      return [429, 500, 502, 503, 504].includes(statusCode);
    }

    // Retry on network errors
    const errorName = (error as any)?.name;
    return errorName === 'NetworkError' || errorName === 'TimeoutError';
  }
}


/**
 * Storage service types and interfaces
 * @module storage/types
 */

import type { Logger } from '../logger/types';

/**
 * Storage provider enum
 * 
 * @example
 * ```typescript
 * import { StorageProvider } from 'basepack';
 * 
 * const storage = new StorageService({
 *   provider: StorageProvider.S3,
 *   config: { bucket: 'my-bucket' }
 * });
 * ```
 */
export enum StorageProvider {
  S3 = 's3',
  GCS = 'gcs',
  AZURE = 'azure'
}

/**
 * AWS S3 storage configuration
 * 
 * @example
 * ```typescript
 * const config: S3Config = {
 *   region: 'us-east-1',
 *   bucket: 'my-bucket',
 *   credentials: {
 *     accessKeyId: 'AKIA...',
 *     secretAccessKey: 'secret...'
 *   }
 * };
 * ```
 */
export interface S3Config {
  /** AWS region (e.g., 'us-east-1') */
  region?: string;
  /** S3 bucket name */
  bucket: string;
  /** AWS credentials */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  /** Custom endpoint URL (for S3-compatible services) */
  endpoint?: string;
  /** Force path style URLs (required for some S3-compatible services) */
  forcePathStyle?: boolean;
}

/**
 * Google Cloud Storage configuration
 * 
 * @example Using default credentials
 * ```typescript
 * const config: GCSConfig = {
 *   bucket: 'my-bucket'
 * };
 * ```
 * 
 * @example Using service account key file
 * ```typescript
 * const config: GCSConfig = {
 *   bucket: 'my-bucket',
 *   keyFilename: '/path/to/service-account-key.json'
 * };
 * ```
 * 
 * @example Using credentials object
 * ```typescript
 * const config: GCSConfig = {
 *   bucket: 'my-bucket',
 *   credentials: {
 *     client_email: 'service-account@project.iam.gserviceaccount.com',
 *     private_key: '-----BEGIN PRIVATE KEY-----\n...'
 *   }
 * };
 * ```
 */
export interface GCSConfig {
  /** GCS bucket name */
  bucket: string;
  /** GCS project ID (optional, can be inferred from credentials) */
  projectId?: string;
  /** Path to service account key file */
  keyFilename?: string;
  /** Service account credentials object */
  credentials?: {
    client_email: string;
    private_key: string;
  };
  /** Custom API endpoint (for testing) */
  apiEndpoint?: string;
}

/**
 * Azure Blob Storage configuration
 * 
 * @example Using connection string
 * ```typescript
 * const config: AzureConfig = {
 *   container: 'my-container',
 *   connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!
 * };
 * ```
 * 
 * @example Using account name and key
 * ```typescript
 * const config: AzureConfig = {
 *   container: 'my-container',
 *   accountName: 'mystorageaccount',
 *   accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY!
 * };
 * ```
 * 
 * @example Using SAS token
 * ```typescript
 * const config: AzureConfig = {
 *   container: 'my-container',
 *   accountName: 'mystorageaccount',
 *   sasToken: process.env.AZURE_STORAGE_SAS_TOKEN!
 * };
 * ```
 */
export interface AzureConfig {
  /** Azure container name */
  container: string;
  /** Azure Storage connection string */
  connectionString?: string;
  /** Storage account name */
  accountName?: string;
  /** Storage account key */
  accountKey?: string;
  /** SAS token for authentication */
  sasToken?: string;
  /** Custom endpoint URL (for Azure Stack or emulator) */
  endpoint?: string;
}

/**
 * Base storage provider configuration
 */
export type StorageProviderConfig = 
  | { provider: StorageProvider.S3; config?: S3Config }
  | { provider: StorageProvider.GCS; config?: GCSConfig }
  | { provider: StorageProvider.AZURE; config?: AzureConfig }
  | { provider: StorageProvider; config?: Record<string, unknown> };

/**
 * Storage service configuration with single provider
 * 
 * @example AWS S3
 * ```typescript
 * const config: StorageServiceConfig = {
 *   provider: StorageProvider.S3,
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1'
 *   }
 * };
 * ```
 * 
 * @example Google Cloud Storage
 * ```typescript
 * const config: StorageServiceConfig = {
 *   provider: StorageProvider.GCS,
 *   config: {
 *     bucket: 'my-bucket',
 *     keyFilename: '/path/to/service-account-key.json'
 *   }
 * };
 * ```
 * 
 * @example With logging
 * ```typescript
 * const config: StorageServiceConfig = {
 *   provider: StorageProvider.S3,
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1'
 *   },
 *   logger: console
 * };
 * ```
 */
export type StorageServiceConfig = {
  provider: StorageProvider;
  config?: S3Config | GCSConfig | AzureConfig | Record<string, unknown>;
  logger?: Logger;
}

/**
 * File upload configuration
 * 
 * @example Upload from buffer
 * ```typescript
 * const upload: FileUploadConfig = {
 *   key: 'documents/report.pdf',
 *   data: buffer,
 *   contentType: 'application/pdf'
 * };
 * ```
 * 
 * @example Upload with metadata
 * ```typescript
 * const upload: FileUploadConfig = {
 *   key: 'images/photo.jpg',
 *   data: buffer,
 *   contentType: 'image/jpeg',
 *   metadata: {
 *     userId: '123',
 *     uploadedAt: '2025-01-01'
 *   }
 * };
 * ```
 */
export interface FileUploadConfig {
  /** File key/path in storage */
  key: string;
  /** File data as Buffer or string */
  data: Buffer | string;
  /** Content type (MIME type) */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Cache control header */
  cacheControl?: string;
  /** Content encoding (e.g., 'gzip') */
  contentEncoding?: string;
}

/**
 * URL upload configuration
 * 
 * @example Upload from URL
 * ```typescript
 * const upload: UrlUploadConfig = {
 *   key: 'images/downloaded.jpg',
 *   url: 'https://example.com/image.jpg'
 * };
 * ```
 */
export interface UrlUploadConfig {
  /** File key/path in storage */
  key: string;
  /** Source URL to download from */
  url: string;
  /** Content type (MIME type) - will be auto-detected if not provided */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Cache control header */
  cacheControl?: string;
}

/**
 * File download configuration
 * 
 * @example Download file
 * ```typescript
 * const download: FileDownloadConfig = {
 *   key: 'documents/report.pdf'
 * };
 * ```
 */
export interface FileDownloadConfig {
  /** File key/path in storage */
  key: string;
}

/**
 * File delete configuration
 * 
 * @example Delete file
 * ```typescript
 * const deleteConfig: FileDeleteConfig = {
 *   key: 'documents/report.pdf'
 * };
 * ```
 */
export interface FileDeleteConfig {
  /** File key/path in storage */
  key: string;
}

/**
 * Signed URL generation configuration
 * 
 * @example Generate signed URL
 * ```typescript
 * const signedUrl: SignedUrlConfig = {
 *   key: 'documents/report.pdf',
 *   expiresIn: 3600, // 1 hour
 *   operation: 'getObject'
 * };
 * ```
 * 
 * @example Generate upload URL
 * ```typescript
 * const uploadUrl: SignedUrlConfig = {
 *   key: 'uploads/new-file.pdf',
 *   expiresIn: 900, // 15 minutes
 *   operation: 'putObject',
 *   contentType: 'application/pdf'
 * };
 * ```
 */
export interface SignedUrlConfig {
  /** File key/path in storage */
  key: string;
  /** Expiration time in seconds */
  expiresIn?: number;
  /** Operation type */
  operation?: 'getObject' | 'putObject';
  /** Content type for putObject operations */
  contentType?: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  /** Whether upload was successful */
  success: boolean;
  /** File key/path in storage */
  key: string;
  /** Storage provider used */
  provider: StorageProvider;
  /** Upload timestamp */
  timestamp: Date;
  /** Public URL if available */
  url?: string;
  /** Error message if upload failed */
  error?: string;
  /** ETag or version identifier */
  etag?: string;
}

/**
 * File download result
 */
export interface FileDownloadResult {
  /** Whether download was successful */
  success: boolean;
  /** File key/path in storage */
  key: string;
  /** Storage provider used */
  provider: StorageProvider;
  /** File data as Buffer */
  data?: Buffer;
  /** Content type */
  contentType?: string;
  /** File metadata */
  metadata?: Record<string, string>;
  /** Error message if download failed */
  error?: string;
  /** File size in bytes */
  size?: number;
  /** Last modified date */
  lastModified?: Date;
  /** ETag or version identifier */
  etag?: string;
}

/**
 * File delete result
 */
export interface FileDeleteResult {
  /** Whether deletion was successful */
  success: boolean;
  /** File key/path in storage */
  key: string;
  /** Storage provider used */
  provider: StorageProvider;
  /** Deletion timestamp */
  timestamp: Date;
  /** Error message if deletion failed */
  error?: string;
}

/**
 * Signed URL result
 */
export interface SignedUrlResult {
  /** Whether generation was successful */
  success: boolean;
  /** File key/path in storage */
  key: string;
  /** Storage provider used */
  provider: StorageProvider;
  /** Signed URL */
  url?: string;
  /** URL expiration time */
  expiresAt?: Date;
  /** Error message if generation failed */
  error?: string;
}

/**
 * Storage provider health information
 */
export interface StorageHealthInfo {
  /** Provider name */
  provider: StorageProvider;
  /** Health status */
  status: 'healthy' | 'unhealthy';
  /** Response time in milliseconds */
  responseTime?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Timestamp of health check */
  timestamp: Date;
}

/**
 * Storage provider interface
 * 
 * All storage providers must implement this interface
 */
export interface IStorageProvider {
  /** Provider name */
  readonly name: StorageProvider;

  /**
   * Upload a file to storage
   * 
   * @param config - Upload configuration
   * @returns Upload result
   */
  upload(config: FileUploadConfig): Promise<FileUploadResult>;

  /**
   * Upload a file from a URL to storage
   * 
   * @param config - URL upload configuration
   * @returns Upload result
   */
  uploadFromUrl(config: UrlUploadConfig): Promise<FileUploadResult>;

  /**
   * Download a file from storage
   * 
   * @param config - Download configuration
   * @returns Download result with file data
   */
  download(config: FileDownloadConfig): Promise<FileDownloadResult>;

  /**
   * Delete a file from storage
   * 
   * @param config - Delete configuration
   * @returns Delete result
   */
  delete(config: FileDeleteConfig): Promise<FileDeleteResult>;

  /**
   * Generate a signed URL for file access
   * 
   * @param config - Signed URL configuration
   * @returns Signed URL result
   */
  getSignedUrl(config: SignedUrlConfig): Promise<SignedUrlResult>;

  /**
   * Check provider health status
   * 
   * @returns Health information
   */
  health(): Promise<StorageHealthInfo>;
}


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
  S3 = 's3'
}

/**
 * Supported storage providers
 */
export const STORAGE_PROVIDERS = ['s3'] as const;

/**
 * Storage provider type
 */
export type StorageProviderType = typeof STORAGE_PROVIDERS[number];

/**
 * Type guard for storage provider type
 * 
 * @param value - Value to check
 * @returns True if value is a valid storage provider type
 */
export function isStorageProviderType(value: unknown): value is StorageProviderType {
  return typeof value === 'string' && STORAGE_PROVIDERS.includes(value as StorageProviderType);
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
 * Base storage provider configuration
 */
export type StorageProviderConfig = 
  | { provider: 's3'; config?: S3Config }
  | { provider: StorageProviderType; config?: Record<string, unknown> };

/**
 * Storage service configuration with single provider
 * 
 * @example Single provider
 * ```typescript
 * const config: StorageServiceConfig = {
 *   provider: 's3',
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1'
 *   }
 * };
 * ```
 * 
 * @example With logging
 * ```typescript
 * const config: StorageServiceConfig = {
 *   provider: 's3',
 *   config: {
 *     bucket: 'my-bucket',
 *     region: 'us-east-1'
 *   },
 *   logger: console
 * };
 * ```
 */
export type StorageServiceConfig = {
  provider: StorageProviderType;
  config?: S3Config | Record<string, unknown>;
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
  provider: string;
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
  provider: string;
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
 * Signed URL result
 */
export interface SignedUrlResult {
  /** Whether generation was successful */
  success: boolean;
  /** File key/path in storage */
  key: string;
  /** Storage provider used */
  provider: string;
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
  provider: string;
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
  readonly name: string;

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


/**
 * Storage service validation utilities
 * @module storage/validation
 */

import type {
  FileUploadConfig,
  UrlUploadConfig,
  FileDownloadConfig,
  FileDeleteConfig,
  SignedUrlConfig,
} from './types';
import { StorageValidationError } from './errors';

/**
 * Validates a file key
 * 
 * @param key - File key to validate
 * @param fieldName - Field name for error messages
 * @throws {StorageValidationError} If key is invalid
 */
export function validateKey(key: string, fieldName: string = 'key'): void {
  if (!key || typeof key !== 'string') {
    throw new StorageValidationError(`${fieldName} must be a non-empty string`, fieldName);
  }

  if (key.trim().length === 0) {
    throw new StorageValidationError(`${fieldName} cannot be empty or whitespace only`, fieldName);
  }

  // Check for invalid characters that might cause issues
  if (key.includes('..')) {
    throw new StorageValidationError(`${fieldName} cannot contain '..' path segments`, fieldName);
  }
}

/**
 * Validates a URL
 * 
 * @param url - URL to validate
 * @param fieldName - Field name for error messages
 * @throws {StorageValidationError} If URL is invalid
 */
export function validateUrl(url: string, fieldName: string = 'url'): void {
  if (!url || typeof url !== 'string') {
    throw new StorageValidationError(`${fieldName} must be a non-empty string`, fieldName);
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol || !['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new StorageValidationError(`${fieldName} must use http or https protocol`, fieldName);
    }
  } catch (error) {
    if (error instanceof StorageValidationError) {
      throw error;
    }
    throw new StorageValidationError(`${fieldName} is not a valid URL`, fieldName);
  }
}

/**
 * Validates file upload configuration
 * 
 * @param config - Upload configuration to validate
 * @throws {StorageValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateFileUpload({
 *   key: 'documents/report.pdf',
 *   data: buffer,
 *   contentType: 'application/pdf'
 * });
 * ```
 */
export function validateFileUpload(config: FileUploadConfig): void {
  if (!config) {
    throw new StorageValidationError('Upload configuration is required', 'config');
  }

  validateKey(config.key);

  if (!config.data) {
    throw new StorageValidationError('File data is required', 'data');
  }

  if (!Buffer.isBuffer(config.data) && typeof config.data !== 'string') {
    throw new StorageValidationError('File data must be a Buffer or string', 'data');
  }

  if (config.contentType !== undefined && typeof config.contentType !== 'string') {
    throw new StorageValidationError('Content type must be a string', 'contentType');
  }

  if (config.metadata !== undefined) {
    if (typeof config.metadata !== 'object' || config.metadata === null) {
      throw new StorageValidationError('Metadata must be an object', 'metadata');
    }

    // Validate metadata values are strings
    for (const [key, value] of Object.entries(config.metadata)) {
      if (typeof value !== 'string') {
        throw new StorageValidationError(
          `Metadata value for key '${key}' must be a string`,
          'metadata'
        );
      }
    }
  }
}

/**
 * Validates URL upload configuration
 * 
 * @param config - URL upload configuration to validate
 * @throws {StorageValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateUrlUpload({
 *   key: 'images/photo.jpg',
 *   url: 'https://example.com/photo.jpg'
 * });
 * ```
 */
export function validateUrlUpload(config: UrlUploadConfig): void {
  if (!config) {
    throw new StorageValidationError('Upload configuration is required', 'config');
  }

  validateKey(config.key);
  validateUrl(config.url);

  if (config.contentType !== undefined && typeof config.contentType !== 'string') {
    throw new StorageValidationError('Content type must be a string', 'contentType');
  }

  if (config.metadata !== undefined) {
    if (typeof config.metadata !== 'object' || config.metadata === null) {
      throw new StorageValidationError('Metadata must be an object', 'metadata');
    }

    // Validate metadata values are strings
    for (const [key, value] of Object.entries(config.metadata)) {
      if (typeof value !== 'string') {
        throw new StorageValidationError(
          `Metadata value for key '${key}' must be a string`,
          'metadata'
        );
      }
    }
  }
}

/**
 * Validates file download configuration
 * 
 * @param config - Download configuration to validate
 * @throws {StorageValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateFileDownload({
 *   key: 'documents/report.pdf'
 * });
 * ```
 */
export function validateFileDownload(config: FileDownloadConfig): void {
  if (!config) {
    throw new StorageValidationError('Download configuration is required', 'config');
  }

  validateKey(config.key);
}

/**
 * Validates file delete configuration
 * 
 * @param config - Delete configuration to validate
 * @throws {StorageValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateFileDelete({
 *   key: 'documents/report.pdf'
 * });
 * ```
 */
export function validateFileDelete(config: FileDeleteConfig): void {
  if (!config) {
    throw new StorageValidationError('Delete configuration is required', 'config');
  }

  validateKey(config.key);
}

/**
 * Validates signed URL configuration
 * 
 * @param config - Signed URL configuration to validate
 * @throws {StorageValidationError} If configuration is invalid
 * 
 * @example
 * ```typescript
 * validateSignedUrl({
 *   key: 'documents/report.pdf',
 *   expiresIn: 3600,
 *   operation: 'getObject'
 * });
 * ```
 */
export function validateSignedUrl(config: SignedUrlConfig): void {
  if (!config) {
    throw new StorageValidationError('Signed URL configuration is required', 'config');
  }

  validateKey(config.key);

  if (config.expiresIn !== undefined) {
    if (typeof config.expiresIn !== 'number' || config.expiresIn <= 0) {
      throw new StorageValidationError('expiresIn must be a positive number', 'expiresIn');
    }

    // AWS S3 max expiration is 7 days
    const maxExpiration = 7 * 24 * 60 * 60; // 7 days in seconds
    if (config.expiresIn > maxExpiration) {
      throw new StorageValidationError(
        `expiresIn cannot exceed ${maxExpiration} seconds (7 days)`,
        'expiresIn'
      );
    }
  }

  if (config.operation !== undefined) {
    if (!['getObject', 'putObject'].includes(config.operation)) {
      throw new StorageValidationError(
        "operation must be either 'getObject' or 'putObject'",
        'operation'
      );
    }
  }

  if (config.contentType !== undefined && typeof config.contentType !== 'string') {
    throw new StorageValidationError('Content type must be a string', 'contentType');
  }
}


/**
 * Unit tests for storage index
 */

import * as storageModule from '../../../src/storage/index';

describe('Storage Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(storageModule.StorageService).toBeDefined();
    expect(storageModule.StorageProvider).toBeDefined();
    expect(storageModule.S3Provider).toBeDefined();
    expect(storageModule.GCSProvider).toBeDefined();
    expect(storageModule.AzureProvider).toBeDefined();
    expect(storageModule.R2Provider).toBeDefined();
    expect(storageModule.B2Provider).toBeDefined();
    expect(storageModule.OSSProvider).toBeDefined();
    expect(storageModule.StorageError).toBeDefined();
    expect(storageModule.StorageValidationError).toBeDefined();
    expect(storageModule.isStorageError).toBeDefined();
    expect(storageModule.isStorageValidationError).toBeDefined();
    expect(storageModule.validateFileUpload).toBeDefined();
    expect(storageModule.validateUrlUpload).toBeDefined();
    expect(storageModule.validateFileDownload).toBeDefined();
    expect(storageModule.validateFileDelete).toBeDefined();
    expect(storageModule.validateSignedUrl).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(storageModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'StorageService',
      'StorageProvider',
      'S3Provider',
      'GCSProvider',
      'AzureProvider',
      'R2Provider',
      'B2Provider',
      'OSSProvider',
      'StorageError',
      'StorageValidationError',
      'isStorageError',
      'isStorageValidationError',
      'validateFileUpload',
      'validateUrlUpload',
      'validateFileDownload',
      'validateFileDelete',
      'validateSignedUrl',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});

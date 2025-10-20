/**
 * Unit tests for storage types
 */

import { StorageProvider } from '../../../src/storage/types';

describe('Storage Types', () => {
  describe('StorageProvider', () => {
    it('should have correct enum values', () => {
      expect(StorageProvider.S3).toBe('s3');
      expect(StorageProvider.GCS).toBe('gcs');
      expect(StorageProvider.AZURE).toBe('azure');
      expect(StorageProvider.R2).toBe('r2');
      expect(StorageProvider.B2).toBe('b2');
      expect(StorageProvider.OSS).toBe('oss');
    });

    it('should have six providers', () => {
      const providers = Object.values(StorageProvider);
      expect(providers).toHaveLength(6);
      expect(providers).toContain('s3');
      expect(providers).toContain('gcs');
      expect(providers).toContain('azure');
      expect(providers).toContain('r2');
      expect(providers).toContain('b2');
      expect(providers).toContain('oss');
    });
  });
});

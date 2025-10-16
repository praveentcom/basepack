/**
 * Storage Service Usage Examples
 * 
 * This file demonstrates how to use the storage service with various operations.
 * Note: You need to install the required AWS SDK packages:
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import { StorageService, StorageProvider } from '../src/storage';

// Example 1: Basic S3 Configuration (using enum)
const storage = new StorageService({
  provider: StorageProvider.S3, // or 's3' as string
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'your-access-key',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'your-secret-key'
    }
  }
});

// Example 2: Upload a file
async function uploadFile() {
  const buffer = Buffer.from('Hello, World!');
  
  const result = await storage.upload({
    key: 'documents/hello.txt',
    data: buffer,
    contentType: 'text/plain',
    metadata: {
      author: 'John Doe',
      createdAt: new Date().toISOString()
    }
  });

  if (result.success) {
    console.log('✓ File uploaded successfully');
    console.log('  Key:', result.key);
    console.log('  ETag:', result.etag);
  } else {
    console.error('✗ Upload failed:', result.error);
  }
}

// Example 3: Upload from URL
async function uploadFromUrl() {
  const result = await storage.uploadFromUrl({
    key: 'images/example.jpg',
    url: 'https://picsum.photos/200/300',
    metadata: {
      source: 'external',
      uploadedAt: new Date().toISOString()
    }
  });

  if (result.success) {
    console.log('✓ File uploaded from URL successfully');
    console.log('  Key:', result.key);
  } else {
    console.error('✗ Upload from URL failed:', result.error);
  }
}

// Example 4: Download a file
async function downloadFile() {
  const result = await storage.download({
    key: 'documents/hello.txt'
  });

  if (result.success && result.data) {
    console.log('✓ File downloaded successfully');
    console.log('  Content:', result.data.toString());
    console.log('  Size:', result.size, 'bytes');
    console.log('  Content Type:', result.contentType);
    console.log('  Metadata:', result.metadata);
  } else {
    console.error('✗ Download failed:', result.error);
  }
}

// Example 5: Generate signed URL for download
async function generateDownloadUrl() {
  const result = await storage.getSignedUrl({
    key: 'documents/hello.txt',
    expiresIn: 3600, // 1 hour
    operation: 'getObject'
  });

  if (result.success && result.url) {
    console.log('✓ Signed URL generated successfully');
    console.log('  URL:', result.url);
    console.log('  Expires at:', result.expiresAt);
  } else {
    console.error('✗ URL generation failed:', result.error);
  }
}

// Example 6: Generate signed URL for upload
async function generateUploadUrl() {
  const result = await storage.getSignedUrl({
    key: 'uploads/client-file.pdf',
    expiresIn: 900, // 15 minutes
    operation: 'putObject',
    contentType: 'application/pdf'
  });

  if (result.success && result.url) {
    console.log('✓ Upload URL generated successfully');
    console.log('  URL:', result.url);
    console.log('  Expires at:', result.expiresAt);
  } else {
    console.error('✗ URL generation failed:', result.error);
  }
}

// Example 7: Health check
async function checkHealth() {
  const health = await storage.health();
  
  console.log('Storage Health Check:');
  console.log('  Status:', health.status);
  console.log('  Provider:', health.provider);
  
  if (health.status === 'healthy') {
    console.log('  Response Time:', health.responseTime, 'ms');
  } else {
    console.log('  Error:', health.error);
  }
}

// Example 8: S3-compatible service (DigitalOcean Spaces)
function createDigitalOceanStorage() {
  return new StorageService({
    provider: StorageProvider.S3,
    config: {
      bucket: 'my-space',
      region: 'nyc3',
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY || 'your-key',
        secretAccessKey: process.env.DO_SPACES_SECRET || 'your-secret'
      }
    }
  });
}

// Example 9: Error handling
async function uploadWithErrorHandling() {
  try {
    const result = await storage.upload({
      key: 'documents/test.txt',
      data: Buffer.from('Test content'),
      contentType: 'text/plain'
    });

    if (!result.success) {
      throw new Error(`Upload failed: ${result.error}`);
    }

    console.log('Upload successful:', result.key);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  }
}

// Run examples
async function runExamples() {
  console.log('\n=== Storage Service Examples ===\n');

  console.log('1. Uploading file...');
  await uploadFile();
  console.log();

  console.log('2. Downloading file...');
  await downloadFile();
  console.log();

  console.log('3. Generating download URL...');
  await generateDownloadUrl();
  console.log();

  console.log('4. Generating upload URL...');
  await generateUploadUrl();
  console.log();

  console.log('5. Checking storage health...');
  await checkHealth();
  console.log();
}

// Uncomment to run examples
// runExamples().catch(console.error);


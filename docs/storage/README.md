# Storage Service

The Storage service provides a unified interface for file storage operations across different cloud storage providers. It currently supports:
- **AWS S3** and S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
- **Google Cloud Storage (GCS)**
- **Azure Blob Storage**

## Features

- **Multi-Provider Support**: Start with S3, easily extend to other providers
- **File Upload**: Upload files from buffers or strings
- **URL Upload**: Download and upload files from external URLs
- **File Download**: Retrieve files with metadata
- **Signed URLs**: Generate temporary access URLs for secure file sharing
- **Type Safety**: Full TypeScript support with strict typing
- **Health Checks**: Monitor storage provider connectivity
- **Error Handling**: Comprehensive error types and validation

## Installation

```bash
npm install basepack
```

### Peer Dependencies

For AWS S3 support, install the AWS SDK:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

For Google Cloud Storage support, install the GCS SDK:

```bash
npm install @google-cloud/storage
```

For Azure Blob Storage support, install the Azure SDK:

```bash
npm install @azure/storage-blob
```

## Quick Start

### Basic S3 Usage

```typescript
import { StorageService, StorageProvider } from 'basepack';

const storage = new StorageService({
  provider: StorageProvider.S3,
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  }
});

// Upload a file
const uploadResult = await storage.upload({
  key: 'documents/report.pdf',
  data: buffer,
  contentType: 'application/pdf'
});

console.log(`File uploaded: ${uploadResult.key}`);
```

## Configuration

### AWS S3

```typescript
const storage = new StorageService({
  provider: StorageProvider.S3,
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'AKIA...',
      secretAccessKey: 'secret...'
    }
  }
});
```

### S3-Compatible Services (MinIO, DigitalOcean Spaces, etc.)

```typescript
const storage = new StorageService({
  provider: StorageProvider.S3,
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    endpoint: 'https://nyc3.digitaloceanspaces.com',
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'your-key',
      secretAccessKey: 'your-secret'
    }
  }
});
```

### Using Default AWS Credentials

If you don't provide credentials, the SDK will use the default credential provider chain (environment variables, IAM roles, etc.):

```typescript
const storage = new StorageService({
  provider: StorageProvider.S3,
  config: {
    bucket: 'my-bucket',
    region: 'us-east-1'
  }
});
```

### Google Cloud Storage

#### Using Default Credentials (Application Default Credentials)

```typescript
const storage = new StorageService({
  provider: StorageProvider.GCS,
  config: {
    bucket: 'my-bucket'
    // Uses Application Default Credentials (ADC):
    // - GOOGLE_APPLICATION_CREDENTIALS environment variable
    // - gcloud CLI credentials
    // - Service account (when running on GCP)
  }
});
```

#### Using Standard GCP Environment Variables (Recommended)

Set the standard GCP environment variables:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_CLOUD_PROJECT="my-project-id"
```

Then initialize the service:
```typescript
const storage = new StorageService({
  provider: StorageProvider.GCS,
  config: {
    bucket: 'my-bucket'
    // Automatically uses GOOGLE_APPLICATION_CREDENTIALS and GOOGLE_CLOUD_PROJECT
  }
});
```

#### Using Service Account Key File (Explicit)

```typescript
const storage = new StorageService({
  provider: StorageProvider.GCS,
  config: {
    bucket: 'my-bucket',
    projectId: 'my-project-id',
    keyFilename: '/path/to/service-account-key.json'
  }
});
```

#### Using Credentials Object

```typescript
const storage = new StorageService({
  provider: StorageProvider.GCS,
  config: {
    bucket: 'my-bucket',
    projectId: 'my-project-id',
    credentials: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, '\n')
    }
  }
});
```

### Azure Blob Storage

#### Using Connection String (Recommended)

The simplest way to authenticate with Azure:

```typescript
const storage = new StorageService({
  provider: StorageProvider.AZURE,
  config: {
    container: 'my-container',
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!
    // Connection string format:
    // DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xxx;EndpointSuffix=core.windows.net
  }
});
```

#### Using Standard Azure Environment Variable

Set the standard Azure environment variable:
```bash
export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xxx;EndpointSuffix=core.windows.net"
```

Then initialize the service:
```typescript
const storage = new StorageService({
  provider: StorageProvider.AZURE,
  config: {
    container: 'my-container',
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!
  }
});
```

#### Using Account Name and Key

```typescript
const storage = new StorageService({
  provider: StorageProvider.AZURE,
  config: {
    container: 'my-container',
    accountName: 'mystorageaccount',
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY!
  }
});
```

#### Using SAS Token

For temporary access or limited permissions:

```typescript
const storage = new StorageService({
  provider: StorageProvider.AZURE,
  config: {
    container: 'my-container',
    accountName: 'mystorageaccount',
    sasToken: process.env.AZURE_STORAGE_SAS_TOKEN!
    // SAS token format: sv=2021-06-08&ss=b&srt=sco&sp=rwdlac&se=2024-12-31T23:59:59Z&st=2024-01-01T00:00:00Z&spr=https&sig=xxx
  }
});
```

#### Using Custom Endpoint (Azure Stack or Emulator)

For local development with Azurite or Azure Stack:

```typescript
const storage = new StorageService({
  provider: StorageProvider.AZURE,
  config: {
    container: 'my-container',
    connectionString: 'UseDevelopmentStorage=true', // For Azurite emulator
    endpoint: 'http://127.0.0.1:10000/devstoreaccount1'
  }
});
```

## Usage Examples

### Upload File with Metadata

```typescript
const result = await storage.upload({
  key: 'images/photo.jpg',
  data: buffer,
  contentType: 'image/jpeg',
  metadata: {
    userId: '123',
    uploadedAt: new Date().toISOString(),
    source: 'mobile-app'
  },
  cacheControl: 'max-age=31536000, public'
});

if (result.success) {
  console.log(`File uploaded: ${result.key}`);
  console.log(`ETag: ${result.etag}`);
}
```

### Upload from URL

Download a file from an external URL and upload it to storage:

```typescript
const result = await storage.uploadFromUrl({
  key: 'images/downloaded.jpg',
  url: 'https://example.com/image.jpg',
  metadata: {
    source: 'external',
    originalUrl: 'https://example.com/image.jpg'
  }
});

if (result.success) {
  console.log(`File uploaded from URL: ${result.key}`);
}
```

### Download File

```typescript
const result = await storage.download({
  key: 'documents/report.pdf'
});

if (result.success && result.data) {
  console.log(`Downloaded ${result.size} bytes`);
  console.log(`Content type: ${result.contentType}`);
  console.log(`Last modified: ${result.lastModified}`);
  
  // Save to file
  await fs.writeFile('report.pdf', result.data);
  
  // Access metadata
  console.log('Metadata:', result.metadata);
}
```

### Generate Signed URL for Download

Create a temporary URL for downloading a file:

```typescript
const result = await storage.getSignedUrl({
  key: 'documents/report.pdf',
  expiresIn: 3600, // 1 hour
  operation: 'getObject'
});

if (result.success && result.url) {
  console.log(`Download URL: ${result.url}`);
  console.log(`Expires at: ${result.expiresAt}`);
  
  // Share the URL with users
  await sendEmail({
    to: 'user@example.com',
    subject: 'Your report is ready',
    html: `<a href="${result.url}">Download your report</a>`
  });
}
```

### Generate Signed URL for Upload

Create a temporary URL for direct uploads from client applications:

```typescript
const result = await storage.getSignedUrl({
  key: 'uploads/user-file.pdf',
  expiresIn: 900, // 15 minutes
  operation: 'putObject',
  contentType: 'application/pdf'
});

if (result.success && result.url) {
  // Return URL to client for direct upload
  res.json({ uploadUrl: result.url });
}

// Client can now upload directly to this URL
// using fetch or XMLHttpRequest
```

### Health Check

Monitor storage provider connectivity:

```typescript
const health = await storage.health();

if (health.status === 'healthy') {
  console.log(`Storage is healthy (${health.responseTime}ms)`);
} else {
  console.error(`Storage is unhealthy: ${health.error}`);
}
```

## API Reference

### StorageService

#### Constructor

```typescript
new StorageService(config: StorageServiceConfig)
```

Creates a new storage service instance.

#### Methods

##### `upload(config: FileUploadConfig): Promise<FileUploadResult>`

Upload a file to storage.

**Parameters:**
- `key` - File path/key in storage
- `data` - File data as Buffer or string
- `contentType` - Optional MIME type
- `metadata` - Optional key-value metadata
- `cacheControl` - Optional cache control header
- `contentEncoding` - Optional content encoding (e.g., 'gzip')

##### `uploadFromUrl(config: UrlUploadConfig): Promise<FileUploadResult>`

Download a file from a URL and upload it to storage.

**Parameters:**
- `key` - File path/key in storage
- `url` - Source URL to download from
- `contentType` - Optional MIME type (auto-detected if not provided)
- `metadata` - Optional key-value metadata
- `cacheControl` - Optional cache control header

##### `download(config: FileDownloadConfig): Promise<FileDownloadResult>`

Download a file from storage.

**Parameters:**
- `key` - File path/key in storage

**Returns:**
- `data` - File data as Buffer
- `contentType` - MIME type
- `metadata` - File metadata
- `size` - File size in bytes
- `lastModified` - Last modification date
- `etag` - ETag/version identifier

##### `getSignedUrl(config: SignedUrlConfig): Promise<SignedUrlResult>`

Generate a pre-signed URL for temporary file access.

**Parameters:**
- `key` - File path/key in storage
- `expiresIn` - Optional expiration time in seconds (default: 3600)
- `operation` - Optional operation type: 'getObject' or 'putObject' (default: 'getObject')
- `contentType` - Optional content type for putObject operations

**Returns:**
- `url` - Pre-signed URL
- `expiresAt` - URL expiration timestamp

##### `health(): Promise<StorageHealthInfo>`

Check storage provider health and connectivity.

**Returns:**
- `status` - 'healthy' or 'unhealthy'
- `responseTime` - Response time in milliseconds
- `error` - Error message if unhealthy

##### `getProviderName(): string`

Get the current storage provider name.

## Error Handling

### Error Types

```typescript
import { 
  StorageError, 
  StorageValidationError,
  StorageProviderError,
  isStorageError 
} from 'basepack';
```

### Error Handling Example

```typescript
try {
  const result = await storage.upload({
    key: 'documents/report.pdf',
    data: buffer,
    contentType: 'application/pdf'
  });

  if (!result.success) {
    console.error(`Upload failed: ${result.error}`);
  }
} catch (error) {
  if (isStorageError(error)) {
    console.error(`Storage error: ${error.message}`);
    console.error(`Provider: ${error.provider}`);
    console.error(`Retryable: ${error.isRetryable}`);
  } else if (error instanceof StorageValidationError) {
    console.error(`Validation error in field '${error.field}': ${error.message}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

### 1. Use Descriptive Keys

```typescript
// Good - organized and descriptive
key: 'users/123/avatars/profile.jpg'
key: 'documents/2025/invoices/INV-001.pdf'

// Bad - unclear structure
key: 'file1.jpg'
key: 'doc.pdf'
```

### 2. Set Appropriate Cache Headers

```typescript
// For static assets
await storage.upload({
  key: 'assets/logo.png',
  data: buffer,
  contentType: 'image/png',
  cacheControl: 'max-age=31536000, public' // Cache for 1 year
});

// For dynamic content
await storage.upload({
  key: 'reports/latest.pdf',
  data: buffer,
  contentType: 'application/pdf',
  cacheControl: 'no-cache, must-revalidate'
});
```

### 3. Include Metadata for Tracking

```typescript
await storage.upload({
  key: 'uploads/document.pdf',
  data: buffer,
  contentType: 'application/pdf',
  metadata: {
    userId: '123',
    uploadedBy: 'john@example.com',
    uploadedAt: new Date().toISOString(),
    version: '1.0',
    department: 'finance'
  }
});
```

### 4. Use Short Expiration for Sensitive Files

```typescript
// For sensitive documents, use shorter expiration times
await storage.getSignedUrl({
  key: 'sensitive/document.pdf',
  expiresIn: 300, // 5 minutes
  operation: 'getObject'
});
```

### 5. Handle Upload Failures Gracefully

```typescript
const result = await storage.upload(config);

if (!result.success) {
  // Log the error
  logger.error('Upload failed', {
    key: result.key,
    error: result.error,
    provider: result.provider
  });
  
  // Notify user
  throw new Error(`Failed to upload file: ${result.error}`);
}
```

### 6. Validate File Sizes and Types

```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

if (buffer.length > MAX_FILE_SIZE) {
  throw new Error('File size exceeds maximum allowed size');
}

if (!ALLOWED_TYPES.includes(contentType)) {
  throw new Error('File type not allowed');
}

await storage.upload({
  key: 'uploads/file.pdf',
  data: buffer,
  contentType
});
```

## Common Use Cases

### User Avatar Upload

```typescript
async function uploadAvatar(userId: string, imageBuffer: Buffer) {
  const result = await storage.upload({
    key: `avatars/${userId}/profile.jpg`,
    data: imageBuffer,
    contentType: 'image/jpeg',
    metadata: {
      userId,
      uploadedAt: new Date().toISOString()
    },
    cacheControl: 'max-age=86400, public' // Cache for 1 day
  });

  if (result.success) {
    // Generate a signed URL for immediate access
    const urlResult = await storage.getSignedUrl({
      key: result.key,
      expiresIn: 86400 // 1 day
    });
    
    return urlResult.url;
  }
  
  throw new Error('Avatar upload failed');
}
```

### Document Management

```typescript
async function uploadDocument(file: Buffer, userId: string, filename: string) {
  const key = `documents/${userId}/${Date.now()}-${filename}`;
  
  const result = await storage.upload({
    key,
    data: file,
    contentType: 'application/pdf',
    metadata: {
      userId,
      originalFilename: filename,
      uploadedAt: new Date().toISOString()
    }
  });

  if (!result.success) {
    throw new Error(`Document upload failed: ${result.error}`);
  }

  // Store key in database for later retrieval
  await db.documents.create({
    userId,
    storageKey: key,
    filename,
    uploadedAt: new Date()
  });

  return key;
}

async function downloadDocument(storageKey: string) {
  const result = await storage.download({ key: storageKey });
  
  if (!result.success || !result.data) {
    throw new Error(`Document download failed: ${result.error}`);
  }
  
  return result.data;
}
```

### Direct Client Uploads

```typescript
// Server-side: Generate upload URL
app.post('/api/upload-url', async (req, res) => {
  const { filename, contentType } = req.body;
  const userId = req.user.id;
  
  const key = `uploads/${userId}/${Date.now()}-${filename}`;
  
  const result = await storage.getSignedUrl({
    key,
    expiresIn: 900, // 15 minutes
    operation: 'putObject',
    contentType
  });

  if (result.success && result.url) {
    res.json({
      uploadUrl: result.url,
      key,
      expiresAt: result.expiresAt
    });
  } else {
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Client-side: Upload directly to storage
async function uploadFile(file: File) {
  // Get upload URL from server
  const response = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type
    })
  });
  
  const { uploadUrl, key } = await response.json();
  
  // Upload directly to storage
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
  
  return key;
}
```

## Troubleshooting

### "Package is not installed" Error

If you see an error about missing packages, install the required peer dependency:

**For AWS S3:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**For Google Cloud Storage:**
```bash
npm install @google-cloud/storage
```

**For Azure Blob Storage:**
```bash
npm install @azure/storage-blob
```

### Credentials Not Found

**For AWS S3**, ensure credentials are provided in one of these ways:
1. Explicitly in config
2. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
3. AWS credentials file (`~/.aws/credentials`)
4. IAM role (when running on AWS)

**For Google Cloud Storage**, ensure credentials are provided in one of these ways:
1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable (recommended)
2. Service account key file in config
3. Credentials object in config
4. Application Default Credentials from gcloud CLI
5. Service account (when running on GCP)

**For Azure Blob Storage**, ensure credentials are provided in one of these ways:
1. Connection string (recommended): `AZURE_STORAGE_CONNECTION_STRING` environment variable or in config
2. Account name and key: `accountName` + `accountKey` in config
3. SAS token: `accountName` + `sasToken` in config
4. Managed identity (when running on Azure)

### Bucket Access Denied

**For AWS S3**, ensure your credentials have the necessary permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket/*",
        "arn:aws:s3:::your-bucket"
      ]
    }
  ]
}
```

**For Google Cloud Storage**, ensure your service account has the necessary roles:
- `Storage Object Admin` - Full control of objects
- `Storage Object Creator` - Create objects only
- `Storage Object Viewer` - Read objects only

Or grant specific permissions:
- `storage.objects.create` - Upload files
- `storage.objects.get` - Download files
- `storage.objects.delete` - Delete files
- `storage.buckets.get` - Health checks

**For Azure Blob Storage**, ensure your storage account or SAS token has the necessary permissions:

Using Azure RBAC (Role-Based Access Control):
- `Storage Blob Data Owner` - Full control of blobs
- `Storage Blob Data Contributor` - Read, write, and delete blobs
- `Storage Blob Data Reader` - Read blobs only

Using SAS token, ensure it has the appropriate permissions:
- `r` (Read) - Download files
- `w` (Write) - Upload files
- `d` (Delete) - Delete files
- `l` (List) - List files in container

Generate a SAS token with required permissions:
```bash
# Using Azure CLI
az storage container generate-sas \
  --account-name mystorageaccount \
  --name my-container \
  --permissions rwdl \
  --expiry 2024-12-31T23:59:59Z \
  --auth-mode key \
  --account-key "your-account-key"
```

### CORS Issues with Signed URLs

**For AWS S3**, ensure your bucket has CORS configured:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**For Google Cloud Storage**, use the `gsutil` CLI or Console:

```bash
# Create cors.json
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration
gsutil cors set cors.json gs://your-bucket
```

**For Azure Blob Storage**, configure CORS using Azure Portal, Azure CLI, or PowerShell:

Using Azure CLI:
```bash
az storage cors add \
  --account-name mystorageaccount \
  --services b \
  --methods GET PUT POST DELETE \
  --origins https://your-domain.com \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600
```

Using Azure Portal:
1. Go to your Storage Account
2. Navigate to **Settings** > **Resource sharing (CORS)**
3. Add a CORS rule for Blob service:
   - **Allowed origins**: `https://your-domain.com`
   - **Allowed methods**: GET, PUT, POST, DELETE
   - **Allowed headers**: `*`
   - **Exposed headers**: `*`
   - **Max age**: 3600

## Performance Tips

1. **Use Appropriate Content Encoding**: Compress files before uploading for faster transfers
2. **Set Cache Headers**: Leverage CDN and browser caching for frequently accessed files
3. **Use Parallel Uploads**: Upload multiple files concurrently
4. **Stream Large Files**: For very large files, consider using multipart uploads (coming soon)

## License

MIT


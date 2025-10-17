# Messaging Service

The Messaging service provides a unified interface for sending SMS, WhatsApp, and RCS messages across multiple providers with automatic failover, retry logic, and delivery tracking.

## Features

- 📱 **Multiple Channels**: SMS, WhatsApp, and RCS messaging
- 🔄 **Multi-Provider Support**: Twilio, AWS SNS, and Meta Business with automatic failover
- 📎 **Rich Media**: Send images, videos, and documents (provider-dependent)
- ✅ **Validation**: E.164 phone number format validation
- 🔁 **Auto-Retry**: Exponential backoff for transient failures
- 📊 **Status Tracking**: Check message delivery status (Twilio)
- 💬 **WhatsApp Templates**: Support for approved message templates
- 🎯 **Type-Safe**: Full TypeScript support with discriminated unions

## Installation

```bash
npm install basepack
```

### Provider-Specific Dependencies

Install only the providers you need:

```bash
# For Twilio (no additional packages needed - uses fetch)
# No installation required

# For AWS SNS
npm install @aws-sdk/client-sns
```

## Quick Start

### SMS with Twilio

```typescript
import { MessagingService, MessagingProvider } from 'basepack';

const service = new MessagingService({
  provider: MessagingProvider.TWILIO,
  config: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN
  }
});

const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Hello from Basepack!'
  }
});

console.log(result.messageId); // Twilio message SID
console.log(result.status); // e.g., 'queued', 'sent', 'delivered'
```

### SMS with AWS SNS

```typescript
import { MessagingService, MessagingProvider } from 'basepack';

const service = new MessagingService({
  provider: MessagingProvider.SNS,
  config: {
    region: 'us-east-1',
    // accessKeyId and secretAccessKey optional if using IAM roles
  }
});

const result = await service.sendSMS({
  message: {
    from: '+14155552671', // Note: SNS ignores the 'from' field for SMS
    to: '+14155552672',
    body: 'Hello from AWS SNS!'
  }
});
```

### WhatsApp with Twilio

```typescript
const result = await service.sendWhatsApp({
  message: {
    from: 'whatsapp:+14155552671',
    to: 'whatsapp:+14155552672',
    body: 'Hello via WhatsApp!'
  }
});
```

### WhatsApp with Meta Business

```typescript
import { MessagingService, MessagingProvider } from 'basepack';

const service = new MessagingService({
  provider: MessagingProvider.META,
  config: {
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    accessToken: process.env.META_ACCESS_TOKEN
  }
});

const result = await service.sendWhatsApp({
  message: {
    from: process.env.META_PHONE_NUMBER_ID!, // Phone Number ID
    to: '+14155552672',
    body: 'Hello from Meta Business!'
  }
});
```

## Phone Number Format

All phone numbers **must** be in [E.164 format](https://en.wikipedia.org/wiki/E.164):

- Start with `+`
- Country code (1-3 digits)
- Subscriber number (up to 12 digits)
- No spaces, hyphens, or parentheses

**Valid Examples:**
- `+14155552671` (US)
- `+442071838750` (UK)
- `+81312345678` (Japan)
- `+919876543210` (India)

**Invalid Examples:**
- `14155552671` (missing +)
- `+1 415 555 2671` (contains spaces)
- `+1-415-555-2671` (contains hyphens)
- `(415) 555-2671` (not E.164)

WhatsApp numbers can optionally have the `whatsapp:` prefix:
- `whatsapp:+14155552671` ✅
- `+14155552671` ✅ (prefix added automatically)

## Provider Setup

### Twilio

1. **Sign up**: Create a [Twilio account](https://www.twilio.com/try-twilio)
2. **Get credentials**: Find your Account SID and Auth Token in the [Twilio Console](https://console.twilio.com/)
3. **Get a phone number**: Purchase a phone number for SMS/WhatsApp
4. **WhatsApp setup**: For WhatsApp, enable the [WhatsApp API](https://www.twilio.com/docs/whatsapp/quickstart)

**Configuration:**

```typescript
const service = new MessagingService({
  provider: MessagingProvider.TWILIO,
  config: {
    accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    authToken: 'your_auth_token_here',
    endpoint: 'https://api.twilio.com' // optional, default
  }
});
```

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

### AWS SNS

1. **AWS Account**: Create an [AWS account](https://aws.amazon.com/)
2. **IAM User**: Create an IAM user with SNS publish permissions
3. **SMS Settings**: Configure [SMS settings](https://console.aws.amazon.com/sns/v3/home#/mobile/text-messaging) in SNS console
4. **Spending Limits**: Set appropriate [spending limits](https://docs.aws.amazon.com/sns/latest/dg/channels-sms-originating-identities.html)

**Configuration:**

```typescript
const service = new MessagingService({
  provider: MessagingProvider.SNS,
  config: {
    region: 'us-east-1',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    // Optional: sessionToken for temporary credentials
    // Optional: endpoint for LocalStack or custom endpoints
  }
});
```

**Environment Variables:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**IAM Policy Example:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetSMSAttributes"
      ],
      "Resource": "*"
    }
  ]
}
```

### Meta Business

Meta Business provides direct WhatsApp API access through the Graph API.

**Prerequisites:**
1. **Meta Business Account**: Create a [Meta Business Account](https://business.facebook.com/)
2. **WhatsApp Business Account**: Set up a [WhatsApp Business Account](https://business.facebook.com/overview/whatsapp)
3. **Phone Number**: Get a WhatsApp Business phone number
4. **Access Token**: Generate a System User Access Token with `whatsapp_business_messaging` permission
5. **App Setup**: Create a Meta App with WhatsApp product enabled

**Configuration:**
```typescript
import { MessagingService, MessagingProvider } from 'basepack';

const service = new MessagingService({
  provider: MessagingProvider.META,
  config: {
    phoneNumberId: '123456789', // From WhatsApp Business Account
    accessToken: 'EAAD...', // System User Access Token
    version: 'v18.0', // Graph API version
    endpoint: 'https://graph.facebook.com', // optional, default
    wabaId: '987654321' // optional: WhatsApp Business Account ID
  }
});
```

**Environment Variables:**
```bash
META_PHONE_NUMBER_ID=123456789
META_ACCESS_TOKEN=EAAD...
META_WABA_ID=987654321 # optional
```

**Example Usage:**
```typescript
// Send text message
const result = await service.sendWhatsApp({
  message: {
    from: '123456789', // Phone Number ID
    to: '+14155552672',
    body: 'Hello from Meta Business!'
  }
});

// Send template message
await service.sendWhatsApp({
  message: {
    from: '123456789',
    to: '+14155552672',
    body: '', // Empty for templates
    templateName: 'welcome_message',
    templateVariables: {
      '1': 'John',
      '2': '12345'
    }
  }
});
```

## Multi-Provider Failover

Configure automatic failover to backup providers:

```typescript
const service = new MessagingService({
  primary: {
    provider: MessagingProvider.TWILIO,
    config: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN
    }
  },
  backups: [
    {
      provider: MessagingProvider.SNS,
      config: {
        region: 'us-east-1'
      }
    }
  ]
});

// If Twilio fails, automatically tries SNS
const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Resilient messaging!'
  }
});
```

## Media Attachments

Send images, videos, and documents with your messages (Twilio only):

### SMS with Media

```typescript
const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Check out this image!',
    mediaUrls: [
      'https://example.com/image.jpg',
      'https://example.com/document.pdf'
    ]
  }
});
```

**Supported Media Types (Twilio):**
- Images: JPEG, PNG, GIF (max 5MB)
- Videos: MP4, MOV (max 5MB)
- Documents: PDF (max 5MB)

### WhatsApp with Media

```typescript
const result = await service.sendWhatsApp({
  message: {
    from: 'whatsapp:+14155552671',
    to: 'whatsapp:+14155552672',
    body: 'Check out this video!',
    mediaUrls: ['https://example.com/video.mp4']
  }
});
```

**Supported Media Types (WhatsApp):**
- Images: JPEG, PNG
- Videos: MP4, 3GPP
- Audio: AAC, MP3, AMR, OGG
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX

**Note**: AWS SNS does not support media attachments for SMS.

## WhatsApp Templates

Use approved WhatsApp message templates:

```typescript
const result = await service.sendWhatsApp({
  message: {
    from: 'whatsapp:+14155552671',
    to: 'whatsapp:+14155552672',
    body: '', // Not used with templates
    templateName: 'welcome_message', // Your approved template SID/name
    templateVariables: {
      '1': 'John',
      '2': 'Acme Inc'
    }
  }
});
```

**Template Setup:**
1. Create template in [Twilio Console](https://console.twilio.com/us1/develop/sms/content-editor)
2. Submit for WhatsApp approval
3. Use approved template SID or name

## RCS Messaging

Send Rich Communication Services (RCS) messages with interactive elements:

```typescript
const result = await service.sendRCS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Would you like to proceed?',
    suggestions: [
      { type: 'reply', text: 'Yes' },
      { type: 'reply', text: 'No' },
      { type: 'url', text: 'Learn More', data: 'https://example.com' }
    ]
  }
});
```

**Note**: RCS support is limited and requires specific Twilio account configuration. Contact Twilio support for RCS enablement.

## Delivery Status Tracking

Check message delivery status (Twilio only):

```typescript
// Send a message
const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Track this message'
  }
});

// Check status later
const status = await service.getMessageStatus(result.messageId!);

if (status) {
  console.log(status.status); // 'queued', 'sent', 'delivered', 'failed', etc.
  console.log(status.details?.errorCode); // Error code if failed
  console.log(status.details?.errorMessage); // Error message if failed
}
```

**Possible Status Values:**
- `queued`: Message is queued for sending
- `sending`: Message is being sent
- `sent`: Message sent to carrier
- `delivered`: Message delivered to recipient
- `undelivered`: Message failed to deliver
- `failed`: Message send failed

**Note**: AWS SNS does not support status tracking and will return `null`.

## Error Handling

The service provides structured error classes:

```typescript
import {
  MessagingError,
  MessagingValidationError,
  MessagingProviderError,
  isMessagingError,
  isMessagingValidationError,
  isMessagingProviderError
} from 'basepack';

try {
  await service.sendSMS({
    message: {
      from: 'invalid', // Not E.164 format
      to: '+14155552672',
      body: 'Test'
    }
  });
} catch (error) {
  if (isMessagingValidationError(error)) {
    console.error('Validation failed:', error.message);
    console.error('Field:', error.field);
  } else if (isMessagingProviderError(error)) {
    console.error('All providers failed:', error.message);
    console.error('Provider errors:', error.errors);
  } else if (isMessagingError(error)) {
    console.error('Provider error:', error.message);
    console.error('Provider:', error.provider);
    console.error('Status code:', error.statusCode);
    console.error('Retryable:', error.isRetryable);
  }
}
```

## Retry Configuration

Customize retry behavior for transient failures:

```typescript
const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Retry if fails'
  },
  opts: {
    retries: 3, // Number of retry attempts (default: 2)
    retryMinTimeout: 1000, // Min delay between retries (default: 1000ms)
    retryMaxTimeout: 10000, // Max delay between retries (default: 10000ms)
    retryFactor: 2, // Exponential backoff factor (default: 2)
    validateBeforeSend: true, // Validate before sending (default: true)
    metadata: { userId: '12345' } // Custom metadata for logging
  }
});
```

**Retry Logic:**
- Automatically retries on network errors, rate limits (429), and server errors (5xx)
- Uses exponential backoff with jitter to prevent thundering herd
- Only retries errors marked as retryable

## Validation Control

Disable validation for advanced use cases:

```typescript
const result = await service.sendSMS({
  message: {
    from: '+14155552671',
    to: '+14155552672',
    body: 'Skip validation'
  },
  opts: {
    validateBeforeSend: false // Skip E.164 validation
  }
});
```

**Warning**: Disabling validation may cause provider errors if phone numbers are invalid.

## Health Checks

Monitor provider health:

```typescript
const health = await service.health();

console.log(health.ok); // true if primary is healthy
console.log(health.provider); // MessagingProvider.TWILIO
console.log(health.primary); // { ok: true, message: '...', details: {...} }
console.log(health.backups); // [{ name: 'sns', health: {...} }]

// Twilio health details
if (health.primary.ok) {
  console.log(health.primary.details?.accountSid);
  console.log(health.primary.details?.status); // 'active'
}

// SNS health details
if (health.backups[0]?.health.ok) {
  console.log(health.backups[0].health.details?.region);
  console.log(health.backups[0].health.details?.attributes);
}
```

## Provider Comparison

| Feature | Twilio | AWS SNS | Meta Business |
|---------|--------|---------|---------------|
| SMS | ✅ | ✅ | ❌ |
| WhatsApp | ✅ | ❌ | ✅ |
| RCS | ✅ (limited) | ❌ | ❌ |
| Media Attachments | ✅ | ❌ | ✅ |
| Status Tracking | ✅ | ❌ | ✅ |
| Templates | ✅ | ❌ | ✅ |
| International SMS | ✅ | ✅ | ❌ |
| Pricing | Pay per message | Pay per message | Pay per message |
| Setup Complexity | Medium | Low (if using AWS) | High |

## API Reference

### MessagingService

#### Constructor

```typescript
new MessagingService(config: MessagingServiceConfig)
```

#### Methods

##### `sendSMS(config: SMSSendConfig): Promise<MessageSendResult>`

Sends an SMS message.

**Parameters:**
- `config.message.from` - Sender phone (E.164)
- `config.message.to` - Recipient phone (E.164)
- `config.message.body` - Message text (max 1600 chars)
- `config.message.mediaUrls?` - Array of media URLs (optional)
- `config.opts?` - Optional configuration (retries, validation, etc.)

**Returns:** `MessageSendResult` with `messageId`, `status`, and `timestamp`

##### `sendWhatsApp(config: WhatsAppSendConfig): Promise<MessageSendResult>`

Sends a WhatsApp message.

**Parameters:**
- `config.message.from` - Sender WhatsApp number (E.164, optional `whatsapp:` prefix)
- `config.message.to` - Recipient WhatsApp number (E.164, optional `whatsapp:` prefix)
- `config.message.body` - Message text (max 4096 chars) or empty if using template
- `config.message.mediaUrls?` - Array of media URLs (optional)
- `config.message.templateName?` - Template SID/name (optional)
- `config.message.templateVariables?` - Template variables (optional)
- `config.opts?` - Optional configuration

**Returns:** `MessageSendResult`

##### `sendRCS(config: RCSSendConfig): Promise<MessageSendResult>`

Sends an RCS message.

**Parameters:**
- `config.message.from` - Sender phone (E.164)
- `config.message.to` - Recipient phone (E.164)
- `config.message.body` - Message text (max 3072 chars)
- `config.message.mediaUrls?` - Array of media URLs (optional)
- `config.message.suggestions?` - Array of interactive suggestions (optional)
- `config.opts?` - Optional configuration

**Returns:** `MessageSendResult`

##### `getMessageStatus(messageId: string, provider?: MessagingProvider): Promise<MessageStatus | null>`

Gets message delivery status.

**Parameters:**
- `messageId` - Message ID to check
- `provider?` - Optional provider to check (defaults to primary)

**Returns:** `MessageStatus` or `null` if not supported/not found

##### `health(): Promise<MessagingHealthInfo>`

Checks provider health status.

**Returns:** Health information for primary and backup providers

## Examples

### Complete Example with Error Handling

```typescript
import {
  MessagingService,
  MessagingProvider,
  isMessagingValidationError,
  isMessagingProviderError
} from 'basepack';

async function sendMessage() {
  const service = new MessagingService({
    primary: {
      provider: MessagingProvider.TWILIO,
      config: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN
      }
    },
    backups: [
      {
        provider: MessagingProvider.SNS,
        config: { region: 'us-east-1' }
      }
    ],
    logger: console // Optional: use your logger
  });

  try {
    const result = await service.sendSMS({
      message: {
        from: '+14155552671',
        to: '+14155552672',
        body: 'Hello from Basepack!'
      },
      opts: {
        retries: 3,
        metadata: { campaignId: 'welcome-2024' }
      }
    });

    console.log('✅ Message sent!');
    console.log('Message ID:', result.messageId);
    console.log('Provider:', result.provider);
    console.log('Status:', result.status);

    // Check status after 30 seconds
    setTimeout(async () => {
      const status = await service.getMessageStatus(result.messageId!);
      if (status) {
        console.log('Delivery status:', status.status);
      }
    }, 30000);

  } catch (error) {
    if (isMessagingValidationError(error)) {
      console.error('❌ Validation error:', error.message);
      console.error('Field:', error.field);
    } else if (isMessagingProviderError(error)) {
      console.error('❌ All providers failed!');
      error.errors.forEach(e => {
        console.error(`  ${e.provider}: ${e.error}`);
      });
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

sendMessage();
```

### Bulk SMS with Rate Limiting

```typescript
async function sendBulkSMS(recipients: string[]) {
  const service = new MessagingService({
    provider: MessagingProvider.TWILIO,
    config: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN
    }
  });

  const results = [];
  
  // Send with rate limiting (adjust based on your plan)
  for (const recipient of recipients) {
    try {
      const result = await service.sendSMS({
        message: {
          from: '+14155552671',
          to: recipient,
          body: 'Bulk message via Basepack!'
        }
      });
      
      results.push({ phone: recipient, success: true, messageId: result.messageId });
      
      // Rate limit: 1 message per second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      results.push({ phone: recipient, success: false, error: String(error) });
    }
  }

  return results;
}
```

## Best Practices

1. **Use Environment Variables**: Never hardcode credentials
2. **Enable Validation**: Keep `validateBeforeSend: true` unless you have a specific reason
3. **Configure Failover**: Use backup providers for critical messages
4. **Monitor Health**: Regularly check provider health
5. **Handle Errors**: Always catch and handle errors appropriately
6. **Rate Limiting**: Respect provider rate limits in bulk operations
7. **Test Phone Numbers**: Use [Twilio test credentials](https://www.twilio.com/docs/iam/test-credentials) for development
8. **Track Delivery**: Use status tracking for important messages
9. **Media Optimization**: Compress media files to reduce costs and improve delivery
10. **Comply with Regulations**: Follow TCPA, GDPR, and other messaging regulations

## Troubleshooting

### "Invalid phone number" Error

**Problem**: Phone number validation fails

**Solution**: Ensure phone numbers are in E.164 format:
```typescript
// ❌ Wrong
from: '415-555-2671'
to: '4155552672'

// ✅ Correct
from: '+14155552671'
to: '+14155552672'
```

### WhatsApp "Not supported" Error

**Problem**: AWS SNS doesn't support WhatsApp

**Solution**: Use Twilio for WhatsApp:
```typescript
const service = new MessagingService({
  provider: MessagingProvider.TWILIO, // Use Twilio, not SNS
  config: { accountSid: '...', authToken: '...' }
});
```

### Media Attachments Not Delivered

**Problem**: Media URLs not accessible or wrong format

**Solution**:
- Ensure URLs are publicly accessible
- Use HTTPS for media URLs
- Check file size limits (5MB for Twilio)
- Verify supported media types

### Rate Limit Errors

**Problem**: "Too many requests" errors

**Solution**:
- Implement rate limiting in your application
- Use retry configuration with appropriate delays
- Upgrade your provider plan if needed

## License

MIT


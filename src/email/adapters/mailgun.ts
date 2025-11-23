import { IEmailProvider, EmailMessage, EmailSendResult, EmailHealthInfo, MailgunConfig, EmailSendConfig, EmailProvider } from '../types';
import { EmailError } from '../errors';
import { normalizeBufferEncoding } from '../validation';
import { toSafeErrorDetails } from '../../logger';
import type { Logger } from '../../logger';

/**
 * Mailgun email provider.
 * 
 * No additional packages required (uses built-in fetch).
 * 
 * Supports:
 * - HTML and text content
 * - CC and BCC recipients
 * - File attachments
 * - US and EU regions
 * - Custom API endpoints
 * 
 * @example
 * ```typescript
 * const provider = new MailgunProvider({
 *   apiKey: 'YOUR_MAILGUN_API_KEY',
 *   domain: 'your-domain.com',
 *   region: 'us'  // or 'eu'
 * });
 * 
 * await provider.send({
 *   message: {
 *     from: 'sender@your-domain.com',
 *     to: 'recipient@example.com',
 *     subject: 'Hello',
 *     html: '<p>Hello World</p>'
 *   }
 * });
 * ```
 * 
 * @see https://www.mailgun.com/
 */
export class MailgunProvider implements IEmailProvider {
  readonly name = EmailProvider.MAILGUN;
  private config: Required<MailgunConfig>;
  private logger: Logger;

  /**
   * Creates a new Mailgun provider instance.
   * 
   * @param config - Mailgun configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If API key or domain is not provided
   */
  constructor(config: MailgunConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Email: Initializing provider', { provider: this.name, region: config.region });
    
    const apiKey = config.apiKey ?? process.env.MAILGUN_API_KEY;
    const domain = config.domain ?? process.env.MAILGUN_DOMAIN;
    const region = (config.region ?? process.env.MAILGUN_REGION ?? 'us') as 'us' | 'eu';
    
    if (!apiKey) {
      this.logger.error('Basepack Email: Provider API key missing', { provider: this.name });
      throw new Error('Mailgun API key is required. Provide it via config or MAILGUN_API_KEY environment variable.');
    }
    
    if (!domain) {
      this.logger.error('Basepack Email: Provider domain missing', { provider: this.name });
      throw new Error('Mailgun domain is required. Provide it via config or MAILGUN_DOMAIN environment variable.');
    }

    this.config = {
      apiKey,
      domain,
      region,
      endpoint: config.endpoint ?? (region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3'),
    };
  }

  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    const messages = 'message' in config && config.message 
      ? [config.message] 
      : config.messages || [];
    const results: EmailSendResult[] = [];

    this.logger.debug('Basepack Email: Provider sending messages', { provider: this.name, count: messages.length });

    for (const message of messages) {
      try {
        const result = await this.sendSingleMessage(message);
        this.logger.debug('Basepack Email: Provider message sent', { provider: this.name, messageId: result.messageId });
        results.push(result);
      } catch (error) {
        this.logger.error('Basepack Email: Provider send failed', { provider: this.name, to: message.to, error: toSafeErrorDetails(error) });
        const emailError = EmailError.from(error, this.name, this.isRetryableError(error));
        results.push({
          success: false,
          error: emailError.message,
          provider: this.name,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  private isRetryableError(error: unknown): boolean {
    const statusCode = (error as any)?.statusCode || (error as any)?.status;
    return statusCode ? [429, 500, 502, 503, 504].includes(statusCode) : false;
  }

  private async sendSingleMessage(message: EmailMessage): Promise<EmailSendResult> {
    const url = `${this.config.endpoint}/${this.config.domain}/messages`;
    
    const formData = new FormData();
    formData.append('from', message.from);
    
    // Handle to addresses
    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    toAddresses.forEach(to => formData.append('to', to));
    
    // Handle cc addresses
    if (message.cc) {
      const ccAddresses = Array.isArray(message.cc) ? message.cc : [message.cc];
      ccAddresses.forEach(cc => formData.append('cc', cc));
    }
    
    // Handle bcc addresses
    if (message.bcc) {
      const bccAddresses = Array.isArray(message.bcc) ? message.bcc : [message.bcc];
      bccAddresses.forEach(bcc => formData.append('bcc', bcc));
    }
    
    formData.append('subject', message.subject);
    
    if (message.text) {
      formData.append('text', message.text);
    }
    
    if (message.html) {
      formData.append('html', message.html);
    }
    
    // Handle attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, normalizeBufferEncoding(attachment.encoding));
        
        const blob = new Blob([new Uint8Array(content)], { type: attachment.contentType || 'application/octet-stream' });
        formData.append('attachment', blob, attachment.filename);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as { id: string; message: string };

    return {
      success: true,
      messageId: data.id,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      // Use the domain info endpoint to check health
      const url = `${this.config.endpoint}/domains/${this.config.domain}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Mailgun health check failed: ${response.status}`);
      }

      const data = await response.json() as { domain: { state: string; name: string } };

      return {
        ok: true,
        message: 'Mailgun provider is healthy',
        details: {
          domain: this.config.domain,
          state: data.domain.state,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Mailgun health check failed',
      };
    }
  }
}


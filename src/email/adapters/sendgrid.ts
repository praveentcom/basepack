import { IEmailProvider, EmailMessage, EmailBaseOptions, EmailSendResult, EmailHealthInfo, SendGridConfig, EmailSendConfig, EmailProvider } from '../types';
import { EmailError } from '../errors';
import { toSafeErrorDetails } from '../../logger';
import type { Logger } from '../../logger';

/**
 * SendGrid email provider.
 * 
 * No additional packages required (uses built-in fetch).
 * 
 * Supports:
 * - HTML and text content
 * - CC and BCC recipients
 * - File attachments
 * - Custom API endpoints
 * 
 * @example
 * ```typescript
 * const provider = new SendGridProvider({
 *   apiKey: 'YOUR_SENDGRID_API_KEY'
 * });
 * 
 * await provider.send({
 *   message: {
 *     from: 'sender@example.com',
 *     to: 'recipient@example.com',
 *     subject: 'Hello',
 *     html: '<p>Hello World</p>'
 *   }
 * });
 * ```
 * 
 * @see https://sendgrid.com/
 */
export class SendGridProvider implements IEmailProvider {
  readonly name = EmailProvider.SENDGRID;
  private config: Required<SendGridConfig>;
  private logger: Logger;

  /**
   * Creates a new SendGrid provider instance.
   * 
   * @param config - SendGrid configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If API key is not provided
   */
  constructor(config: SendGridConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Email: Initializing provider', { provider: this.name });
    
    const apiKey = config.apiKey ?? process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      this.logger.error('Basepack Email: Provider API key missing', { provider: this.name });
      throw new Error('SendGrid API key is required. Provide it via config or SENDGRID_API_KEY environment variable.');
    }

    this.config = {
      apiKey,
      endpoint: config.endpoint ?? 'https://api.sendgrid.com/v3',
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
    const url = `${this.config.endpoint}/mail/send`;
    
    // Build personalizations
    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    const personalizations: any = {
      to: toAddresses.map(email => ({ email })),
    };
    
    if (message.cc) {
      const ccAddresses = Array.isArray(message.cc) ? message.cc : [message.cc];
      personalizations.cc = ccAddresses.map(email => ({ email }));
    }
    
    if (message.bcc) {
      const bccAddresses = Array.isArray(message.bcc) ? message.bcc : [message.bcc];
      personalizations.bcc = bccAddresses.map(email => ({ email }));
    }
    
    personalizations.subject = message.subject;
    
    // Build content
    const content: any[] = [];
    if (message.text) {
      content.push({
        type: 'text/plain',
        value: message.text,
      });
    }
    if (message.html) {
      content.push({
        type: 'text/html',
        value: message.html,
      });
    }
    
    // Build the request body
    const body: any = {
      personalizations: [personalizations],
      from: { email: message.from },
      subject: message.subject,
      content,
    };
    
    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      body.attachments = message.attachments.map(attachment => {
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, attachment.encoding as BufferEncoding || 'utf-8');
        
        return {
          content: content.toString('base64'),
          filename: attachment.filename,
          type: attachment.contentType || 'application/octet-stream',
          disposition: 'attachment',
        };
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    // SendGrid returns the message ID in the X-Message-Id header
    const messageId = response.headers.get('X-Message-Id') || undefined;

    return {
      success: true,
      messageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      // Use a simple API endpoint to check health
      const url = `${this.config.endpoint}/user/profile`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`SendGrid health check failed: ${response.status}`);
      }

      return {
        ok: true,
        message: 'SendGrid provider is healthy',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'SendGrid health check failed',
      };
    }
  }
}


import { IEmailProvider, EmailMessage, EmailSendResult, EmailHealthInfo, PostmarkConfig, EmailSendConfig, EmailProvider } from '../types';
import { EmailError } from '../errors';
import { toSafeErrorDetails } from '../../logger';
import type { Logger } from '../../logger';

/**
 * Postmark email provider.
 * 
 * No additional packages required (uses built-in fetch).
 * 
 * Supports:
 * - HTML and text content
 * - CC and BCC recipients
 * - File attachments
 * - Batch sending (automatic optimization)
 * - Custom API endpoints
 * 
 * @example
 * ```typescript
 * const provider = new PostmarkProvider({
 *   serverToken: 'YOUR_POSTMARK_SERVER_TOKEN'
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
 * @see https://postmarkapp.com/
 */
export class PostmarkProvider implements IEmailProvider {
  readonly name = EmailProvider.POSTMARK;
  private config: Required<PostmarkConfig>;
  private logger: Logger;

  /**
   * Creates a new Postmark provider instance.
   * 
   * @param config - Postmark configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If server token is not provided
   */
  constructor(config: PostmarkConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Email: Initializing provider', { provider: this.name });
    
    const serverToken = config.serverToken ?? process.env.POSTMARK_SERVER_TOKEN;
    
    if (!serverToken) {
      this.logger.error('Basepack Email: Provider token missing', { provider: this.name });
      throw new Error('Postmark server token is required. Provide it via config or POSTMARK_SERVER_TOKEN environment variable.');
    }

    this.config = {
      serverToken,
      endpoint: config.endpoint ?? 'https://api.postmarkapp.com',
    };
  }

  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    const messages = 'message' in config && config.message 
      ? [config.message] 
      : config.messages || [];
    
    this.logger.debug('Basepack Email: Provider sending messages', { provider: this.name, count: messages.length });
    
    // Postmark supports batch sending
    if (messages.length > 1) {
      this.logger.debug('Basepack Email: Using batch sending', { provider: this.name, count: messages.length });
      return this.sendBatch(messages);
    }
    
    const results: EmailSendResult[] = [];
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
    const url = `${this.config.endpoint}/email`;
    
    const body: any = {
      From: message.from,
      To: Array.isArray(message.to) ? message.to.join(',') : message.to,
      Subject: message.subject,
    };
    
    if (message.cc) {
      body.Cc = Array.isArray(message.cc) ? message.cc.join(',') : message.cc;
    }
    
    if (message.bcc) {
      body.Bcc = Array.isArray(message.bcc) ? message.bcc.join(',') : message.bcc;
    }
    
    if (message.text) {
      body.TextBody = message.text;
    }
    
    if (message.html) {
      body.HtmlBody = message.html;
    }
    
    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      body.Attachments = message.attachments.map(attachment => {
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, attachment.encoding as BufferEncoding || 'utf-8');
        
        return {
          Name: attachment.filename,
          Content: content.toString('base64'),
          ContentType: attachment.contentType || 'application/octet-stream',
        };
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': this.config.serverToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ Message: 'Unknown error' }));
      throw new Error(`Postmark API error: ${response.status} - ${errorData.Message || JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      messageId: responseData.MessageID,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  private async sendBatch(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    const url = `${this.config.endpoint}/email/batch`;
    
    const batch = messages.map(message => {
      const body: any = {
        From: message.from,
        To: Array.isArray(message.to) ? message.to.join(',') : message.to,
        Subject: message.subject,
      };
      
      if (message.cc) {
        body.Cc = Array.isArray(message.cc) ? message.cc.join(',') : message.cc;
      }
      
      if (message.bcc) {
        body.Bcc = Array.isArray(message.bcc) ? message.bcc.join(',') : message.bcc;
      }
      
      if (message.text) {
        body.TextBody = message.text;
      }
      
      if (message.html) {
        body.HtmlBody = message.html;
      }
      
      if (message.attachments && message.attachments.length > 0) {
        body.Attachments = message.attachments.map(attachment => {
          const content = Buffer.isBuffer(attachment.content) 
            ? attachment.content 
            : Buffer.from(attachment.content, attachment.encoding as BufferEncoding || 'utf-8');
          
          return {
            Name: attachment.filename,
            Content: content.toString('base64'),
            ContentType: attachment.contentType || 'application/octet-stream',
          };
        });
      }
      
      return body;
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': this.config.serverToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Postmark batch API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();

    return responseData.map((item: any) => ({
      success: item.ErrorCode === 0,
      messageId: item.MessageID,
      error: item.ErrorCode !== 0 ? item.Message : undefined,
      provider: this.name,
      timestamp: new Date(),
    }));
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      // Use the server info endpoint
      const url = `${this.config.endpoint}/server`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Postmark-Server-Token': this.config.serverToken,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Postmark health check failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        ok: true,
        message: 'Postmark provider is healthy',
        details: {
          serverName: data.Name,
          serverId: data.ID,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Postmark health check failed',
      };
    }
  }
}


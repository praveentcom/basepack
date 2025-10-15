import { IEmailProvider, EmailMessage, EmailSendResult, EmailHealthInfo, ResendConfig, EmailSendConfig } from '../types';
import { EmailError } from '../errors';

/**
 * Resend email provider.
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
 * const provider = new ResendProvider({
 *   apiKey: 'YOUR_RESEND_API_KEY'
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
 * @see https://resend.com/
 */
export class ResendProvider implements IEmailProvider {
  readonly name = 'resend';
  private config: Required<ResendConfig>;

  /**
   * Creates a new Resend provider instance.
   * 
   * @param config - Resend configuration
   * @throws {Error} If API key is not provided
   */
  constructor(config: ResendConfig = {}) {
    const apiKey = config.apiKey ?? process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('Resend API key is required. Provide it via config or RESEND_API_KEY environment variable.');
    }

    this.config = {
      apiKey,
      endpoint: config.endpoint ?? 'https://api.resend.com',
    };
  }

  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    const messages = 'message' in config && config.message 
      ? [config.message] 
      : config.messages || [];
    const results: EmailSendResult[] = [];

    for (const message of messages) {
      try {
        const result = await this.sendSingleMessage(message);
        results.push(result);
      } catch (error) {
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
    const url = `${this.config.endpoint}/emails`;
    
    // Build the request body
    const body: any = {
      from: message.from,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
    };
    
    if (message.cc) {
      body.cc = Array.isArray(message.cc) ? message.cc : [message.cc];
    }
    
    if (message.bcc) {
      body.bcc = Array.isArray(message.bcc) ? message.bcc : [message.bcc];
    }
    
    if (message.text) {
      body.text = message.text;
    }
    
    if (message.html) {
      body.html = message.html;
    }
    
    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      body.attachments = message.attachments.map(attachment => {
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, attachment.encoding as BufferEncoding || 'utf-8');
        
        return {
          content: content.toString('base64'),
          filename: attachment.filename,
          content_type: attachment.contentType || 'application/octet-stream',
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
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`Resend API error: ${response.status} - ${errorData.message || JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();

    return {
      success: true,
      messageId: responseData.id,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      // Resend doesn't have a dedicated health endpoint, so we'll use the API keys endpoint
      const url = `${this.config.endpoint}/api-keys`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Resend health check failed: ${response.status}`);
      }

      return {
        ok: true,
        message: 'Resend provider is healthy',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Resend health check failed',
      };
    }
  }
}


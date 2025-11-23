import { IEmailProvider, EmailMessage, EmailSendResult, EmailHealthInfo, SESConfig, EmailSendConfig, EmailProvider } from '../types';
import { EmailError } from '../errors';
import { normalizeBufferEncoding } from '../validation';
import { toSafeErrorDetails } from '../../logger';
import type { Logger } from '../../logger';

/**
 * AWS SES (Simple Email Service) email provider.
 * 
 * Requires: `@aws-sdk/client-ses` package
 * 
 * Supports:
 * - Simple email sending
 * - HTML and text content
 * - CC and BCC recipients
 * - File attachments
 * - Custom endpoints (for LocalStack, etc.)
 * 
 * @example
 * ```typescript
 * const provider = new SESProvider({
 *   region: 'us-east-1',
 *   accessKeyId: 'YOUR_KEY',
 *   secretAccessKey: 'YOUR_SECRET'
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
 * @see https://aws.amazon.com/ses/
 */
export class SESProvider implements IEmailProvider {
  readonly name = EmailProvider.SES;
  private options: SESConfig;
  private client: any;
  private logger: Logger;

  /**
   * Creates a new SES provider instance.
   * 
   * @param options - SES configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If @aws-sdk/client-ses package is not installed
   */
  constructor(options: SESConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Email: Initializing provider', { provider: this.name, region: options.region });
    
    try {
      const { SESClient } = require('@aws-sdk/client-ses');
      
      this.options = {
        region: options.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        accessKeyId: options.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: options.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: options.sessionToken ?? process.env.AWS_SESSION_TOKEN,
        endpoint: options.endpoint ?? process.env.AWS_ENDPOINT_URL,
      };
      
      this.client = new SESClient({
        region: this.options.region,
        credentials: this.options.accessKeyId && this.options.secretAccessKey ? {
          accessKeyId: this.options.accessKeyId,
          secretAccessKey: this.options.secretAccessKey,
          sessionToken: this.options.sessionToken,
        } : undefined,
        endpoint: this.options.endpoint,
      });
    } catch (error) {
      this.logger.error('Failed to initialize SES provider', { error: toSafeErrorDetails(error) });
      throw new Error(
        'AWS SDK for SES is not installed. Install it with: npm install @aws-sdk/client-ses'
      );
    }
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
    const errorCode = (error as any)?.code || (error as any)?.Code;
    const retryableCodes = [
      'Throttling',
      'RequestTimeout',
      'ServiceUnavailable',
      'InternalFailure',
    ];
    return retryableCodes.includes(errorCode);
  }

  private async sendSingleMessage(message: EmailMessage): Promise<EmailSendResult> {
    // Use SendRawEmailCommand if attachments are present or if we have CC/BCC
    // Otherwise use the simpler SendEmailCommand
    const useRawEmail = message.attachments && message.attachments.length > 0;

    if (useRawEmail) {
      return this.sendRawEmail(message);
    } else {
      return this.sendSimpleEmail(message);
    }
  }

  private async sendSimpleEmail(message: EmailMessage): Promise<EmailSendResult> {
    const { SendEmailCommand } = require('@aws-sdk/client-ses');
    
    const toAddresses = Array.isArray(message.to) ? message.to : [message.to];
    const ccAddresses = message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined;
    const bccAddresses = message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined;

    const command = new SendEmailCommand({
      Source: message.from,
      Destination: {
        ToAddresses: toAddresses,
        CcAddresses: ccAddresses,
        BccAddresses: bccAddresses,
      },
      Message: {
        Subject: {
          Data: message.subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(message.text && {
            Text: {
              Data: message.text,
              Charset: 'UTF-8',
            },
          }),
          ...(message.html && {
            Html: {
              Data: message.html,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    const response = await this.client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  private async sendRawEmail(message: EmailMessage): Promise<EmailSendResult> {
    const { SendRawEmailCommand } = require('@aws-sdk/client-ses');
    
    const rawMessage = this.buildMimeMessage(message);
    
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
    });

    const response = await this.client.send(command);

    return {
      success: true,
      messageId: response.MessageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  private buildMimeMessage(message: EmailMessage): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const lines: string[] = [];

    // Headers
    lines.push(`From: ${message.from}`);
    
    const toAddresses = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    lines.push(`To: ${toAddresses}`);
    
    if (message.cc) {
      const ccAddresses = Array.isArray(message.cc) ? message.cc.join(', ') : message.cc;
      lines.push(`Cc: ${ccAddresses}`);
    }
    
    if (message.bcc) {
      const bccAddresses = Array.isArray(message.bcc) ? message.bcc.join(', ') : message.bcc;
      lines.push(`Bcc: ${bccAddresses}`);
    }
    
    lines.push(`Subject: ${message.subject}`);
    lines.push('MIME-Version: 1.0');
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    lines.push('');

    // Text/HTML body
    if (message.text || message.html) {
      lines.push(`--${boundary}`);
      
      if (message.text && message.html) {
        // Both text and HTML - use multipart/alternative
        const altBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
        lines.push('');
        
        // Text part
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/plain; charset=UTF-8');
        lines.push('Content-Transfer-Encoding: 7bit');
        lines.push('');
        lines.push(message.text);
        lines.push('');
        
        // HTML part
        lines.push(`--${altBoundary}`);
        lines.push('Content-Type: text/html; charset=UTF-8');
        lines.push('Content-Transfer-Encoding: 7bit');
        lines.push('');
        lines.push(message.html);
        lines.push('');
        lines.push(`--${altBoundary}--`);
      } else if (message.html) {
        lines.push('Content-Type: text/html; charset=UTF-8');
        lines.push('Content-Transfer-Encoding: 7bit');
        lines.push('');
        lines.push(message.html);
      } else if (message.text) {
        lines.push('Content-Type: text/plain; charset=UTF-8');
        lines.push('Content-Transfer-Encoding: 7bit');
        lines.push('');
        lines.push(message.text);
      }
      lines.push('');
    }

    // Attachments
    if (message.attachments) {
      for (const attachment of message.attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${attachment.contentType || 'application/octet-stream'}; name="${attachment.filename}"`);
        lines.push('Content-Transfer-Encoding: base64');
        lines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
        lines.push('');
        
        // Convert content to base64
        const content = Buffer.isBuffer(attachment.content) 
          ? attachment.content 
          : Buffer.from(attachment.content, normalizeBufferEncoding(attachment.encoding));
        
        const base64Content = content.toString('base64');
        // Split base64 into 76-character lines as per RFC 2045
        const base64Lines = base64Content.match(/.{1,76}/g) || [];
        lines.push(...base64Lines);
        lines.push('');
      }
    }

    // End boundary
    lines.push(`--${boundary}--`);

    return lines.join('\r\n');
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      const { GetSendQuotaCommand } = require('@aws-sdk/client-ses');
      const command = new GetSendQuotaCommand({});
      const response = await this.client.send(command);
      
      return {
        ok: true,
        message: 'SES provider is healthy',
        details: {
          region: this.options.region,
          maxSendRate: response.MaxSendRate,
          max24HourSend: response.Max24HourSend,
          sentLast24Hours: response.SentLast24Hours,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'SES health check failed',
      };
    }
  }
}

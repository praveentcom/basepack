import { IEmailProvider, EmailMessage, EmailSendResult, EmailHealthInfo, SMTPConfig, EmailSendConfig } from '../types';
import { EmailError } from '../errors';
import type { Logger } from '../../logger';

/**
 * SMTP email provider using Nodemailer.
 * 
 * Requires: `nodemailer` package
 * 
 * Supports:
 * - HTML and text content
 * - CC and BCC recipients
 * - File attachments
 * - Connection pooling
 * - TLS/SSL encryption
 * - Custom SMTP servers (Gmail, Outlook, custom servers)
 * 
 * @example
 * ```typescript
 * const provider = new SMTPProvider({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   auth: {
 *     user: 'your-email@gmail.com',
 *     pass: 'your-app-password'
 *   }
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
 * @see https://nodemailer.com/
 */
export class SMTPProvider implements IEmailProvider {
  readonly name = 'smtp';
  private transporter: any;
  private config: SMTPConfig;
  private logger: Logger;

  /**
   * Creates a new SMTP provider instance.
   * 
   * @param config - SMTP configuration
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If nodemailer package is not installed
   * @throws {Error} If host or port is not provided
   */
  constructor(config: SMTPConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Email: Initializing provider', { provider: 'smtp', host: config.host, port: config.port });
    
    try {
      const nodemailer = require('nodemailer');
      const { createTransport } = nodemailer;
      
      const host = config.host ?? process.env.SMTP_HOST;
      const port = config.port ?? (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined);
      const user = config.auth?.user ?? process.env.SMTP_USER;
      const pass = config.auth?.pass ?? process.env.SMTP_PASS;
      const secure = config.secure ?? (process.env.SMTP_SECURE === 'true');
      
      if (!host) {
        this.logger.error('Basepack Email: Provider host missing', { provider: 'smtp' });
        throw new Error('SMTP host is required. Provide it via config or SMTP_HOST environment variable.');
      }
      
      if (!port) {
        this.logger.error('Basepack Email: Provider port missing', { provider: 'smtp' });
        throw new Error('SMTP port is required. Provide it via config or SMTP_PORT environment variable.');
      }

      this.config = {
        host,
        port,
        secure: secure || port === 465,
        auth: user && pass ? { user, pass } : config.auth,
        pool: config.pool,
        maxConnections: config.maxConnections,
        maxMessages: config.maxMessages,
        tls: config.tls,
      };
      
      const transportOptions: any = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure
      };

      if (this.config.auth) {
        transportOptions.auth = this.config.auth;
      }

      if (this.config.pool !== undefined) {
        transportOptions.pool = this.config.pool;
      }

      if (this.config.maxConnections !== undefined) {
        transportOptions.maxConnections = this.config.maxConnections;
      }

      if (this.config.maxMessages !== undefined) {
        transportOptions.maxMessages = this.config.maxMessages;
      }

      if (this.config.tls) {
        transportOptions.tls = this.config.tls;
      }

      this.transporter = createTransport(transportOptions);
    } catch (error) {
      this.logger.error('Basepack Email: Provider initialization failed', { provider: 'smtp', error });
      throw new Error(
        'nodemailer is not installed. Install it with: npm install nodemailer'
      );
    }
  }

  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    const messages = 'message' in config && config.message 
      ? [config.message] 
      : config.messages || [];
    const results: EmailSendResult[] = [];

    this.logger.debug('Basepack Email: Provider sending messages', { provider: 'smtp', count: messages.length });

    for (const message of messages) {
      try {
        const result = await this.sendSingleMessage(message);
        this.logger.debug('Basepack Email: Provider message sent', { provider: 'smtp', messageId: result.messageId });
        results.push(result);
      } catch (error) {
        this.logger.error('Basepack Email: Provider send failed', { provider: 'smtp', to: message.to, error });
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
    const errorCode = (error as any)?.code;
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'EPIPE',
    ];
    return retryableCodes.includes(errorCode);
  }

  private async sendSingleMessage(message: EmailMessage): Promise<EmailSendResult> {
    const mailOptions: any = {
      from: message.from,
      to: Array.isArray(message.to) ? message.to : [message.to],
      subject: message.subject,
    };

    if (message.cc) {
      mailOptions.cc = Array.isArray(message.cc) ? message.cc : [message.cc];
    }

    if (message.bcc) {
      mailOptions.bcc = Array.isArray(message.bcc) ? message.bcc : [message.bcc];
    }

    if (message.text) {
      mailOptions.text = message.text;
    }

    if (message.html) {
      mailOptions.html = message.html;
    }

    // Handle attachments
    if (message.attachments && message.attachments.length > 0) {
      mailOptions.attachments = message.attachments.map(attachment => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        encoding: attachment.encoding,
      }));
    }

    const info = await this.transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      provider: this.name,
      timestamp: new Date(),
    };
  }

  async health(): Promise<EmailHealthInfo> {
    try {
      await this.transporter.verify();
      
      return {
        ok: true,
        message: 'SMTP provider is healthy and ready to send messages',
        details: {
          host: this.config.host,
          port: this.config.port,
          secure: this.config.secure ?? (this.config.port === 465),
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'SMTP health check failed',
        details: {
          host: this.config.host,
          port: this.config.port,
        },
      };
    }
  }

  /**
   * Close the SMTP connection pool
   */
  async close(): Promise<void> {
    this.transporter.close();
  }
}


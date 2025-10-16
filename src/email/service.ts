import { 
  IEmailProvider, 
  EmailServiceConfig, 
  EmailSendResult, 
  EmailSendConfig, 
  SingleProviderConfig,
  SESConfig,
  SendGridConfig,
  MailgunConfig,
  ResendConfig,
  PostmarkConfig,
  SMTPConfig
} from './types';
import type { Logger } from '../logger';
import { SESProvider } from './adapters/ses';
import { MailgunProvider } from './adapters/mailgun';
import { SendGridProvider } from './adapters/sendgrid';
import { ResendProvider } from './adapters/resend';
import { PostmarkProvider } from './adapters/postmark';
import { SMTPProvider } from './adapters/smtp';
import { validateEmailMessage } from './validation';
import { EmailError, EmailProviderError } from './errors';
import { withRetry } from './retry';
import { coloredConsoleLogger } from '../logger';

/**
 * Email service with multi-provider support and automatic failover.
 * 
 * Supports multiple email providers (SES, SendGrid, Mailgun, Resend, Postmark, SMTP)
 * with automatic failover to backup providers if the primary fails.
 * 
 * @example Single provider - AWS SES
 * ```typescript
 * const service = new EmailService({
 *   provider: 'ses',
 *   config: { region: 'us-east-1' }
 * });
 * ```
 * 
 * @example Single provider - SendGrid
 * ```typescript
 * const service = new EmailService({
 *   provider: 'sendgrid',
 *   config: { apiKey: process.env.SENDGRID_API_KEY }
 * });
 * ```
 * 
 * @example Single provider - Mailgun
 * ```typescript
 * const service = new EmailService({
 *   provider: 'mailgun',
 *   config: {
 *     apiKey: process.env.MAILGUN_API_KEY,
 *     domain: 'your-domain.com',
 *     region: 'us'  // or 'eu'
 *   }
 * });
 * ```
 * 
 * @example Single provider - Resend
 * ```typescript
 * const service = new EmailService({
 *   provider: 'resend',
 *   config: { apiKey: process.env.RESEND_API_KEY }
 * });
 * ```
 * 
 * @example Single provider - Postmark
 * ```typescript
 * const service = new EmailService({
 *   provider: 'postmark',
 *   config: { serverToken: process.env.POSTMARK_SERVER_TOKEN }
 * });
 * ```
 * 
 * @example Single provider - SMTP
 * ```typescript
 * const service = new EmailService({
 *   provider: 'smtp',
 *   config: {
 *     host: 'smtp.gmail.com',
 *     port: 587,
 *     auth: { user: 'user@gmail.com', pass: 'password' }
 *   }
 * });
 * ```
 * 
 * @example With automatic failover
 * ```typescript
 * const service = new EmailService({
 *   primary: { provider: 'ses' },
 *   backups: [
 *     { provider: 'sendgrid', config: { apiKey: 'key' } },
 *     { provider: 'smtp', config: { host: 'smtp.gmail.com', port: 587 } }
 *   ]
 * });
 * ```
 */
export class EmailService {
  private primaryProvider: IEmailProvider;
  private backupProviders: IEmailProvider[];
  private logger: Logger;

  /**
   * Creates a new EmailService instance.
   * 
   * **Provider-Specific Requirements:**
   * - `ses`: Requires `@aws-sdk/client-ses` package
   * - `smtp`: Requires `nodemailer` package
   * - `sendgrid`, `mailgun`, `resend`, `postmark`: No additional packages (uses fetch)
   * 
   * @param config - Service configuration with primary and optional backup providers
   * @throws {Error} If provider configuration is invalid or required dependencies are missing
   * @see {@link SESConfig} - AWS SES configuration options
   * @see {@link SendGridConfig} - SendGrid configuration options
   * @see {@link MailgunConfig} - Mailgun configuration options
   * @see {@link ResendConfig} - Resend configuration options
   * @see {@link PostmarkConfig} - Postmark configuration options
   * @see {@link SMTPConfig} - SMTP configuration options
   */
  constructor(config: EmailServiceConfig) {
    this.logger = config.logger || coloredConsoleLogger();
    
    // Check if this is a multi-provider config
    if ('primary' in config) {
      this.logger.debug('Basepack Email: Initializing service', {
        primary: config.primary.provider,
        backups: config.backups?.map(b => b.provider) || []
      });
      this.primaryProvider = this.createProvider(config.primary);
      this.backupProviders = (config.backups || []).map(backup => this.createProvider(backup));
    } else {
      // Single provider configuration (legacy support)
      this.logger.debug('Basepack Email: Initializing service', { provider: config.provider });
      this.primaryProvider = this.createProvider(config);
      this.backupProviders = [];
    }
  }

  private createProvider(config: SingleProviderConfig): IEmailProvider {
    switch (config.provider) {
      case 'ses':
        return new SESProvider(config.config || {}, this.logger);
      case 'mailgun':
        return new MailgunProvider(config.config || {}, this.logger);
      case 'sendgrid':
        return new SendGridProvider(config.config || {}, this.logger);
      case 'resend':
        return new ResendProvider(config.config || {}, this.logger);
      case 'postmark':
        return new PostmarkProvider(config.config || {}, this.logger);
      case 'smtp':
        return new SMTPProvider(config.config || {}, this.logger);
      default:
        throw new Error(`Unknown email provider`);
    }
  }

  /**
   * Sends an email or batch of emails using the configured providers.
   * 
   * Automatically validates email addresses and message structure before sending.
   * If the primary provider fails, automatically tries backup providers in order.
   * Implements retry logic with exponential backoff for transient failures.
   * 
   * @param config - Email configuration with message(s) and optional settings
   * @returns Array of send results, one per message
   * @throws {EmailValidationError} If email validation fails
   * @throws {EmailProviderError} If all providers fail to send the email
   * 
   * @example
   * ```typescript
   * // Send single email
   * const results = await service.send({
   *   message: {
   *     from: 'sender@example.com',
   *     to: 'recipient@example.com',
   *     subject: 'Hello',
   *     html: '<p>Hello World</p>'
   *   }
   * });
   * 
   * // Send with custom retry configuration
   * const results = await service.send({
   *   message: myEmail,
   *   opts: {
   *     retries: 3,
   *     retryMinTimeout: 2000,
   *     retryMaxTimeout: 30000
   *   }
   * });
   * 
   * // Disable validation
   * const results = await service.send({
   *   message: myEmail,
   *   opts: { validateBeforeSend: false }
   * });
   * ```
   */
  async send(config: EmailSendConfig): Promise<EmailSendResult[]> {
    const messages = 'message' in config && config.message 
      ? [config.message] 
      : config.messages || [];
    
    this.logger.info('Basepack Email: Sending message', {
      messageCount: messages.length,
      to: messages.map(m => m.to),
      subject: messages.map(m => m.subject)
    });

    // Validate messages before sending (unless explicitly disabled)
    const shouldValidate = config.opts?.validateBeforeSend !== false;
    if (shouldValidate) {
      this.logger.debug('Basepack Email: Validating messages', { count: messages.length });
      try {
        for (const message of messages) {
          validateEmailMessage(message);
        }
      } catch (error) {
        this.logger.error('Basepack Email: Validation failed', { error });
        throw error;
      }
    }

    const providers = [this.primaryProvider, ...this.backupProviders];
    const errors: Array<{ provider: string; error: string }> = [];
    const retryOptions = {
      retries: config.opts?.retries ?? 2,
      minTimeout: config.opts?.retryMinTimeout ?? 1000,
      maxTimeout: config.opts?.retryMaxTimeout ?? 10000,
      factor: config.opts?.retryFactor ?? 2,
    };

    for (const provider of providers) {
      try {
        this.logger.debug('Basepack Email: Attempting send', { provider: provider.name });
        
        // Use retry logic when sending through each provider
        const results = await withRetry(
          () => provider.send(config),
          retryOptions,
          this.logger
        );
        
        // Check if send was successful
        const allSuccessful = results.every(r => r.success);
        
        if (allSuccessful) {
          // Return results if successful
          this.logger.info('Basepack Email: Message sent successfully', {
            provider: provider.name,
            messageCount: results.length,
            messageIds: results.map(r => r.messageId).filter(Boolean)
          });
          return results;
        }
        
        // Some failed, record error and continue to next provider
        const failureError = results.find(r => !r.success)?.error || 'Unknown error';
        this.logger.error('Basepack Email: Message send failed', { provider: provider.name, error: failureError });
        errors.push({
          provider: provider.name,
          error: failureError
        });
      } catch (error) {
        // Provider threw an exception, record it and try next provider
        const emailError = EmailError.from(error, provider.name, true);
        this.logger.error('Basepack Email: Provider exception', {
          provider: provider.name,
          error: emailError.message
        });
        errors.push({
          provider: provider.name,
          error: emailError.message
        });
        
        // If there are backup providers, log failover attempt
        if (providers.indexOf(provider) < providers.length - 1) {
          const nextProvider = providers[providers.indexOf(provider) + 1];
          this.logger.info('Basepack Email: Failing over to backup provider', { 
            from: provider.name,
            to: nextProvider.name 
          });
        }
      }
    }

    // All providers failed
    this.logger.error('Basepack Email: All providers failed', { errors });
    const errorMessage = `All email providers failed. Errors: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`;
    throw new EmailProviderError(errorMessage, 'all', errors);
  }

  /**
   * Checks the health status of the primary and backup email providers.
   * 
   * @returns Health status object containing primary provider status and backup provider statuses
   * 
   * @example
   * ```typescript
   * const health = await service.health();
   * console.log(health.ok); // true if primary is healthy
   * console.log(health.provider); // 'ses'
   * console.log(health.primary); // { ok: true, message: '...' }
   * console.log(health.backups); // [{ name: 'sendgrid', health: {...} }]
   * ```
   */
  async health() {
    const primaryHealth = this.primaryProvider.health
      ? await this.primaryProvider.health()
      : { ok: true };

    const backupHealths = await Promise.all(
      this.backupProviders.map(async (provider) => ({
        name: provider.name,
        health: provider.health ? await provider.health() : { ok: true }
      }))
    );

    return {
      ok: primaryHealth.ok,
      provider: this.primaryProvider.name,
      primary: primaryHealth,
      backups: backupHealths
    };
  }
}


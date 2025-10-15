/**
 * Optional configuration for email sending operations.
 */
export interface EmailBaseOptions {
  /** Timeout in milliseconds for the email operation */
  timeout?: number;
  /** Number of retry attempts for failed sends (default: 2) */
  retries?: number;
  /** Minimum timeout between retries in milliseconds (default: 1000) */
  retryMinTimeout?: number;
  /** Maximum timeout between retries in milliseconds (default: 10000) */
  retryMaxTimeout?: number;
  /** Exponential backoff factor (default: 2) */
  retryFactor?: number;
  /** Custom metadata to attach to the email operation */
  metadata?: Record<string, any>;
  /** Whether to validate email addresses before sending (default: true) */
  validateBeforeSend?: boolean;
}

/**
 * Result of an email send operation.
 */
export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Unique message ID from the email provider (if available) */
  messageId?: string;
  /** Error message if the send failed */
  error?: string;
  /** Name of the provider that handled this email */
  provider: string;
  /** Timestamp when the send operation completed */
  timestamp: Date;
}

/**
 * Health check information for an email provider.
 */
export interface EmailHealthInfo {
  /** Whether the provider is healthy and operational */
  ok: boolean;
  /** Optional health status message */
  message?: string;
  /** Additional provider-specific health details */
  details?: Record<string, any>;
}

/**
 * Email message structure.
 * 
 * @example
 * ```typescript
 * const message: EmailMessage = {
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Hello',
 *   html: '<p>Hello World</p>',
 *   text: 'Hello World'
 * };
 * ```
 */
export interface EmailMessage {
  /** Sender email address (supports "Name <email@domain.com>" format) */
  from: string;
  /** Recipient email address(es) */
  to: string | string[];
  /** CC (carbon copy) recipient(s) */
  cc?: string | string[];
  /** BCC (blind carbon copy) recipient(s) */
  bcc?: string | string[];
  /** Email subject line */
  subject: string;
  /** Plain text content (at least one of text or html is required) */
  text?: string;
  /** HTML content (at least one of text or html is required) */
  html?: string;
  /** File attachments */
  attachments?: EmailAttachment[];
}

/**
 * Email attachment structure.
 * 
 * @example
 * ```typescript
 * const attachment: EmailAttachment = {
 *   filename: 'document.pdf',
 *   content: fs.readFileSync('document.pdf'),
 *   contentType: 'application/pdf'
 * };
 * ```
 */
export interface EmailAttachment {
  /** Name of the attachment file */
  filename: string;
  /** File content as Buffer or string */
  content: Buffer | string;
  /** MIME type of the attachment (e.g., 'application/pdf') */
  contentType?: string;
  /** Encoding of string content (e.g., 'base64', 'utf-8') */
  encoding?: string;
}

/**
 * Configuration for sending emails.
 * Use either `message` for single email or `messages` for batch sending.
 * 
 * @example
 * ```typescript
 * // Single email
 * const config: EmailSendConfig = {
 *   message: { from: '...', to: '...', subject: '...', html: '...' }
 * };
 * 
 * // Batch emails
 * const config: EmailSendConfig = {
 *   messages: [
 *     { from: '...', to: '...', subject: '...', html: '...' },
 *     { from: '...', to: '...', subject: '...', html: '...' }
 *   ]
 * };
 * ```
 */
export type EmailSendConfig =
  | { message: EmailMessage; messages?: never; opts?: EmailBaseOptions }
  | { messages: EmailMessage[]; message?: never; opts?: EmailBaseOptions };

/**
 * Type guard to check if config is for sending a single message.
 * 
 * @param config - Email send configuration
 * @returns `true` if config contains a single message
 * 
 * @example
 * ```typescript
 * if (isSingleMessageConfig(config)) {
 *   // TypeScript knows config.message exists
 *   console.log(config.message.subject);
 * }
 * ```
 */
export function isSingleMessageConfig(
  config: EmailSendConfig
): config is { message: EmailMessage; opts?: EmailBaseOptions } {
  return 'message' in config && config.message !== undefined;
}

/**
 * Type guard to check if config is for sending multiple messages.
 * 
 * @param config - Email send configuration
 * @returns `true` if config contains multiple messages
 * 
 * @example
 * ```typescript
 * if (isBatchMessageConfig(config)) {
 *   // TypeScript knows config.messages exists
 *   console.log(config.messages.length);
 * }
 * ```
 */
export function isBatchMessageConfig(
  config: EmailSendConfig
): config is { messages: EmailMessage[]; opts?: EmailBaseOptions } {
  return 'messages' in config && config.messages !== undefined;
}

/**
 * Interface that all email provider adapters must implement.
 */
export interface IEmailProvider {
  /** Unique name of the email provider */
  readonly name: string;
  
  /**
   * Sends an email or batch of emails.
   * @param config - Email configuration with message(s) and options
   * @returns Array of send results
   */
  send(config: EmailSendConfig): Promise<EmailSendResult[]>;
  
  /**
   * Checks the health/status of the email provider.
   * @returns Health status information
   */
  health?(): Promise<EmailHealthInfo>;
}

/**
 * Supported email provider types.
 */
export const EMAIL_PROVIDERS = ['ses', 'sendgrid', 'mailgun', 'resend', 'postmark', 'smtp'] as const;
export type EmailProviderType = typeof EMAIL_PROVIDERS[number];

/**
 * Type guard to check if a string is a valid email provider type.
 * 
 * @param value - Value to check
 * @returns `true` if value is a valid provider type
 * 
 * @example
 * ```typescript
 * if (isEmailProviderType('ses')) {
 *   // TypeScript knows value is EmailProviderType
 * }
 * ```
 */
export function isEmailProviderType(value: unknown): value is EmailProviderType {
  return typeof value === 'string' && EMAIL_PROVIDERS.includes(value as EmailProviderType);
}

/**
 * AWS SES (Simple Email Service) configuration.
 * Requires: `@aws-sdk/client-ses` package
 * 
 * @see https://aws.amazon.com/ses/
 */
export interface SESConfig {
  /** AWS region (default: from AWS_REGION or 'us-east-1') */
  region?: string;
  /** AWS access key ID (or set AWS_ACCESS_KEY_ID env var) */
  accessKeyId?: string;
  /** AWS secret access key (or set AWS_SECRET_ACCESS_KEY env var) */
  secretAccessKey?: string;
  /** AWS session token for temporary credentials (or set AWS_SESSION_TOKEN env var) */
  sessionToken?: string;
  /** Custom SES endpoint URL (or set AWS_ENDPOINT_URL env var) */
  endpoint?: string;
}

/**
 * SendGrid email service configuration.
 * Requires: API key (no additional packages needed)
 * 
 * @see https://sendgrid.com/
 */
export interface SendGridConfig {
  /** SendGrid API key (or set SENDGRID_API_KEY env var) */
  apiKey?: string;
  /** Custom API endpoint (default: https://api.sendgrid.com/v3) */
  endpoint?: string;
}

/**
 * Mailgun email service configuration.
 * Requires: API key and domain (no additional packages needed)
 * 
 * @see https://www.mailgun.com/
 */
export interface MailgunConfig {
  /** Mailgun region - US or EU (default: 'us') */
  region?: "us" | "eu";
  /** Mailgun API key (or set MAILGUN_API_KEY env var) */
  apiKey?: string;
  /** Mailgun sending domain (or set MAILGUN_DOMAIN env var) */
  domain?: string;
  /** Custom API endpoint */
  endpoint?: string;
}

/**
 * Resend email service configuration.
 * Requires: API key (no additional packages needed)
 * 
 * @see https://resend.com/
 */
export interface ResendConfig {
  /** Resend API key (or set RESEND_API_KEY env var) */
  apiKey?: string;
  /** Custom API endpoint (default: https://api.resend.com) */
  endpoint?: string;
}

/**
 * Postmark email service configuration.
 * Requires: Server token (no additional packages needed)
 * 
 * @see https://postmarkapp.com/
 */
export interface PostmarkConfig {
  /** Postmark server token (or set POSTMARK_SERVER_TOKEN env var) */
  serverToken?: string;
  /** Custom API endpoint (default: https://api.postmarkapp.com) */
  endpoint?: string;
}

/**
 * SMTP email service configuration.
 * Requires: `nodemailer` package
 * 
 * @see https://nodemailer.com/
 */
export interface SMTPConfig {
  /** SMTP server hostname (or set SMTP_HOST env var) */
  host?: string;
  /** SMTP server port (or set SMTP_PORT env var, default: 587 for TLS, 465 for SSL) */
  port?: number;
  /** Whether to use SSL/TLS (or set SMTP_SECURE env var, default: true for port 465) */
  secure?: boolean;
  /** Authentication credentials */
  auth?: {
    /** SMTP username (or set SMTP_USER env var) */
    user?: string;
    /** SMTP password (or set SMTP_PASS env var) */
    pass?: string;
  };
  /** Whether to use connection pooling (default: false) */
  pool?: boolean;
  /** Maximum number of simultaneous connections (requires pool: true) */
  maxConnections?: number;
  /** Maximum number of messages per connection (requires pool: true) */
  maxMessages?: number;
  /** TLS/SSL options for secure connections */
  tls?: {
    /** Whether to reject unauthorized certificates (default: true) */
    rejectUnauthorized?: boolean;
    /** Additional TLS options */
    [key: string]: any;
  };
}

/**
 * Configuration for a single email provider.
 * 
 * @example
 * ```typescript
 * const sesConfig: SingleProviderConfig = {
 *   provider: 'ses',
 *   config: { region: 'us-east-1' }
 * };
 * ```
 */
export type SingleProviderConfig = 
  | { provider: 'ses'; config?: SESConfig }
  | { provider: 'sendgrid'; config?: SendGridConfig }
  | { provider: 'mailgun'; config?: MailgunConfig }
  | { provider: 'resend'; config?: ResendConfig }
  | { provider: 'postmark'; config?: PostmarkConfig }
  | { provider: 'smtp'; config?: SMTPConfig };

/**
 * EmailService configuration with optional backup providers for automatic failover.
 * 
 * Can be either:
 * - Single provider configuration
 * - Primary provider with backup providers
 * 
 * @example
 * ```typescript
 * // Single provider
 * const config: EmailServiceConfig = {
 *   provider: 'ses',
 *   config: { region: 'us-east-1' }
 * };
 * 
 * // With failover
 * const config: EmailServiceConfig = {
 *   primary: { provider: 'ses' },
 *   backups: [
 *     { provider: 'sendgrid', config: { apiKey: 'key' } },
 *     { provider: 'smtp', config: { host: 'smtp.gmail.com', port: 587 } }
 *   ]
 * };
 * ```
 */
export type EmailServiceConfig = 
  | SingleProviderConfig
  | {
      /** Primary email provider to use first */
      primary: SingleProviderConfig;
      /** Optional backup providers for automatic failover */
      backups?: SingleProviderConfig[];
    };

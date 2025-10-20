export * from './service';
export * from './adapters';
export * from './errors';
export * from './validation';

// Types - export individually to avoid conflicts
export type {
  EmailBaseOptions,
  EmailSendResult,
  EmailHealthInfo,
  EmailMessage,
  EmailAttachment,
  EmailSendConfig,
  IEmailProvider,
  SESConfig,
  SendGridConfig,
  MailgunConfig,
  ResendConfig,
  PostmarkConfig,
  SMTPConfig,
  EmailSingleProviderConfig,
  EmailServiceConfig
} from './types';

export {
  EmailProvider,
  isEmailSingleMessageConfig,
  isEmailBatchMessageConfig
} from './types';

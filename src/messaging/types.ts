/**
 * Messaging service types and interfaces
 * @module messaging/types
 */

import type { Logger } from "../logger/types";

/**
 * Optional configuration for messaging operations.
 */
export interface MessageBaseOptions {
  /** Timeout in milliseconds for the messaging operation */
  timeout?: number;
  /** Number of retry attempts for failed sends (default: 2) */
  retries?: number;
  /** Minimum timeout between retries in milliseconds (default: 1000) */
  retryMinTimeout?: number;
  /** Maximum timeout between retries in milliseconds (default: 10000) */
  retryMaxTimeout?: number;
  /** Exponential backoff factor (default: 2) */
  retryFactor?: number;
  /** Custom metadata to attach to the messaging operation */
  metadata?: Record<string, any>;
  /** Whether to validate phone numbers before sending (default: true) */
  validateBeforeSend?: boolean;
}

/**
 * Result of a message send operation.
 */
export interface MessageSendResult {
  /** Whether the message was sent successfully */
  success: boolean;
  /** Unique message ID from the messaging provider (if available) */
  messageId?: string;
  /** Error message if the send failed */
  error?: string;
  /** Name of the provider that handled this message */
  provider: MessagingProvider;
  /** Timestamp when the send operation completed */
  timestamp: Date;
  /** Current delivery status (if available) */
  status?: string;
}

/**
 * Message status information.
 */
export interface MessageStatus {
  /** Message ID */
  messageId: string;
  /** Current delivery status */
  status: string;
  /** Provider that sent the message */
  provider: MessagingProvider;
  /** Additional status details */
  details?: Record<string, any>;
  /** Timestamp of the status */
  timestamp: Date;
}

/**
 * Health check information for a messaging provider.
 */
export interface MessagingHealthInfo {
  /** Whether the provider is healthy and operational */
  ok: boolean;
  /** Optional health status message */
  message?: string;
  /** Additional provider-specific health details */
  details?: Record<string, any>;
}

/**
 * SMS message structure.
 *
 * @example
 * ```typescript
 * const message: SMSMessage = {
 *   from: '+14155552671',
 *   to: '+14155552672',
 *   body: 'Hello from Basepack!'
 * };
 * ```
 */
export interface SMSMessage {
  /** Sender phone number in E.164 format (e.g., +14155552671) */
  from: string;
  /** Recipient phone number in E.164 format */
  to: string;
  /** Message body text */
  body: string;
  /** Optional media URLs to attach (images, videos, etc.) */
  mediaUrls?: string[];
}

/**
 * WhatsApp message structure.
 *
 * @example
 * ```typescript
 * const message: WhatsAppMessage = {
 *   from: 'whatsapp:+14155552671',
 *   to: 'whatsapp:+14155552672',
 *   body: 'Hello via WhatsApp!'
 * };
 * ```
 */
export interface WhatsAppMessage {
  /** Sender WhatsApp number in E.164 format (with or without 'whatsapp:' prefix) */
  from: string;
  /** Recipient WhatsApp number in E.164 format (with or without 'whatsapp:' prefix) */
  to: string;
  /** Message body text */
  body: string;
  /** Optional media URLs to attach (images, videos, documents, etc.) */
  mediaUrls?: string[];
  /** WhatsApp template name (for approved message templates) */
  templateName?: string;
  /** Variables for template substitution */
  templateVariables?: Record<string, string>;
}

/**
 * RCS (Rich Communication Services) message structure.
 *
 * @example
 * ```typescript
 * const message: RCSMessage = {
 *   from: '+14155552671',
 *   to: '+14155552672',
 *   body: 'Hello via RCS!',
 *   suggestions: [
 *     { type: 'reply', text: 'Yes' },
 *     { type: 'reply', text: 'No' }
 *   ]
 * };
 * ```
 */
export interface RCSMessage {
  /** Sender phone number in E.164 format */
  from: string;
  /** Recipient phone number in E.164 format */
  to: string;
  /** Message body text */
  body: string;
  /** Optional media URLs to attach */
  mediaUrls?: string[];
  /** Rich suggestions for interactive elements */
  suggestions?: RCSSuggestion[];
}

/**
 * RCS suggestion for interactive messaging.
 */
export interface RCSSuggestion {
  /** Type of suggestion (reply, action, etc.) */
  type: "reply" | "action" | "url";
  /** Display text for the suggestion */
  text: string;
  /** Action data (URL for 'url' type, etc.) */
  data?: string;
}

/**
 * Configuration for sending SMS messages.
 *
 * @example
 * ```typescript
 * const config: SMSSendConfig = {
 *   message: {
 *     from: '+14155552671',
 *     to: '+14155552672',
 *     body: 'Hello!'
 *   }
 * };
 * ```
 */
export interface SMSSendConfig {
  /** Single SMS message to send */
  message: SMSMessage;
  /** Optional configuration options */
  opts?: MessageBaseOptions;
}

/**
 * Configuration for sending WhatsApp messages.
 *
 * @example
 * ```typescript
 * const config: WhatsAppSendConfig = {
 *   message: {
 *     from: 'whatsapp:+14155552671',
 *     to: 'whatsapp:+14155552672',
 *     body: 'Hello via WhatsApp!'
 *   }
 * };
 * ```
 */
export interface WhatsAppSendConfig {
  /** Single WhatsApp message to send */
  message: WhatsAppMessage;
  /** Optional configuration options */
  opts?: MessageBaseOptions;
}

/**
 * Configuration for sending RCS messages.
 *
 * @example
 * ```typescript
 * const config: RCSSendConfig = {
 *   message: {
 *     from: '+14155552671',
 *     to: '+14155552672',
 *     body: 'Hello via RCS!'
 *   }
 * };
 * ```
 */
export interface RCSSendConfig {
  /** Single RCS message to send */
  message: RCSMessage;
  /** Optional configuration options */
  opts?: MessageBaseOptions;
}

/**
 * Interface that all messaging provider adapters must implement.
 */
export interface IMessagingProvider {
  /** Unique name of the messaging provider */
  readonly name: MessagingProvider;

  /**
   * Sends an SMS message.
   * @param config - SMS configuration
   * @returns Send result
   */
  sendSMS(config: SMSSendConfig): Promise<MessageSendResult>;

  /**
   * Sends a WhatsApp message.
   * @param config - WhatsApp configuration
   * @returns Send result
   */
  sendWhatsApp(config: WhatsAppSendConfig): Promise<MessageSendResult>;

  /**
   * Sends an RCS message.
   * @param config - RCS configuration
   * @returns Send result
   */
  sendRCS(config: RCSSendConfig): Promise<MessageSendResult>;

  /**
   * Gets the delivery status of a message (optional, not all providers support this).
   * @param messageId - Message ID to check
   * @returns Message status information or null if not supported
   */
  getMessageStatus?(messageId: string): Promise<MessageStatus | null>;

  /**
   * Checks the health/status of the messaging provider (optional).
   * @returns Health status information
   */
  health?(): Promise<MessagingHealthInfo>;
}

/**
 * Messaging provider enum
 *
 * @example
 * ```typescript
 * import { MessagingProvider } from 'basepack';
 *
 * const service = new MessagingService({
 *   provider: MessagingProvider.TWILIO,
 *   config: { accountSid: 'xxx', authToken: 'xxx' }
 * });
 * ```
 */
export enum MessagingProvider {
  TWILIO = "twilio",
  SNS = "sns",
  META = "meta",
  MSG91 = "msg91",
  VONAGE = "vonage",
  PLIVO = "plivo",
  MESSENGERBIRD = "messagebird",
}

/**
 * Twilio messaging service configuration.
 * Requires: Account SID and Auth Token (no additional packages needed)
 *
 * @see https://www.twilio.com/docs/sms
 */
export interface TwilioConfig {
  /** Twilio Account SID (or set TWILIO_ACCOUNT_SID env var) */
  accountSid?: string;
  /** Twilio Auth Token (or set TWILIO_AUTH_TOKEN env var) */
  authToken?: string;
  /** Custom API endpoint (default: https://api.twilio.com) */
  endpoint?: string;
}

/**
 * AWS SNS messaging service configuration.
 * Requires: `@aws-sdk/client-sns` package
 *
 * @see https://aws.amazon.com/sns/
 */
export interface SNSConfig {
  /** AWS region (default: from AWS_REGION or 'us-east-1') */
  region?: string;
  /** AWS access key ID (or set AWS_ACCESS_KEY_ID env var) */
  accessKeyId?: string;
  /** AWS secret access key (or set AWS_SECRET_ACCESS_KEY env var) */
  secretAccessKey?: string;
  /** AWS session token for temporary credentials (or set AWS_SESSION_TOKEN env var) */
  sessionToken?: string;
  /** Custom SNS endpoint URL (or set AWS_ENDPOINT_URL env var) */
  endpoint?: string;
}

/**
 * Meta Business messaging service configuration.
 * Requires: Phone Number ID and Access Token from Meta Business Suite
 *
 * @see https://developers.facebook.com/docs/whatsapp/
 */
export interface MetaConfig {
  /** WhatsApp Business Phone Number ID (or set META_PHONE_NUMBER_ID env var) */
  phoneNumberId?: string;
  /** Meta Business Access Token (or set META_ACCESS_TOKEN env var) */
  accessToken?: string;
  /** Meta Graph API version (default: v18.0) */
  version?: string;
  /** Custom Graph API endpoint (default: https://graph.facebook.com) */
  endpoint?: string;
  /** WhatsApp Business Account ID (optional, for advanced features) */
  wabaId?: string;
}

/**
 * MSG91 messaging service configuration.
 * Requires: Auth key from MSG91 dashboard
 *
 * @see https://docs.msg91.com/
 */
export interface MSG91Config {
  /** MSG91 Auth key (or set MSG91_AUTH_KEY env var) */
  authKey?: string;
  /** Default sender ID (or set MSG91_SENDER_ID env var) */
  senderId?: string;
  /** Default flow ID for SMS templates (or set MSG91_FLOW_ID env var) */
  flowId?: string;
  /** Custom API endpoint (default: https://control.msg91.com) */
  endpoint?: string;
  /** Default country code for numbers without country code (default: 91) */
  defaultCountryCode?: string;
}

/**
 * Vonage messaging service configuration.
 * Requires: API key and secret from Vonage dashboard
 *
 * @see https://developer.vonage.com/en/getting-started
 */
export interface VonageConfig {
  /** Vonage API key (or set VONAGE_API_KEY env var) */
  apiKey?: string;
  /** Vonage API secret (or set VONAGE_API_SECRET env var) */
  apiSecret?: string;
  /** Vonage application ID for WhatsApp (or set VONAGE_APPLICATION_ID env var) */
  applicationId?: string;
  /** Vonage private key for WhatsApp (or set VONAGE_PRIVATE_KEY env var) */
  privateKey?: string;
  /** Custom API endpoint (default: https://rest.nexmo.com) */
  endpoint?: string;
}

/**
 * Plivo messaging service configuration.
 * Requires: Auth ID and Auth Token from Plivo dashboard
 *
 * @see https://www.plivo.com/docs/messaging/
 */
export interface PlivoConfig {
  /** Plivo Auth ID (or set PLIVO_AUTH_ID env var) */
  authId?: string;
  /** Plivo Auth Token (or set PLIVO_AUTH_TOKEN env var) */
  authToken?: string;
  /** Custom API endpoint (default: https://api.plivo.com) */
  endpoint?: string;
}

/**
 * MessageBird messaging service configuration.
 * Requires: Access Key from MessageBird dashboard
 *
 * @see https://developers.messagebird.com/
 */
export interface MessageBirdConfig {
  /** MessageBird API access key (or set MESSENGERBIRD_ACCESS_KEY env var) */
  accessKey?: string;
  /** Custom API endpoint (default: https://api.messagebird.com) */
  endpoint?: string;
}

/**
 * Configuration for a single messaging provider.
 *
 * @example
 * ```typescript
 * const twilioConfig: MessagingSingleProviderConfig = {
 *   provider: MessagingProvider.TWILIO,
 *   config: { accountSid: 'xxx', authToken: 'xxx' }
 * };
 * ```
 */
export type MessagingSingleProviderConfig =
  | { provider: MessagingProvider.TWILIO; config?: TwilioConfig }
  | { provider: MessagingProvider.SNS; config?: SNSConfig }
  | { provider: MessagingProvider.META; config?: MetaConfig }
  | { provider: MessagingProvider.MSG91; config?: MSG91Config }
  | { provider: MessagingProvider.VONAGE; config?: VonageConfig }
  | { provider: MessagingProvider.PLIVO; config?: PlivoConfig }
  | { provider: MessagingProvider.MESSENGERBIRD; config?: MessageBirdConfig };

/**
 * MessagingService configuration with optional backup providers for automatic failover.
 *
 * Can be either:
 * - Single provider configuration
 * - Primary provider with backup providers
 *
 * @example
 * ```typescript
 * // Single provider
 * const config: MessagingServiceConfig = {
 *   provider: MessagingProvider.TWILIO,
 *   config: { accountSid: 'xxx', authToken: 'xxx' }
 * };
 *
 * // With failover
 * const config: MessagingServiceConfig = {
 *   primary: { provider: MessagingProvider.TWILIO },
 *   backups: [
 *     { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
 *   ]
 * };
 *
 * // With logging
 * const config: MessagingServiceConfig = {
 *   provider: MessagingProvider.TWILIO,
 *   config: { accountSid: 'xxx', authToken: 'xxx' },
 *   logger: console
 * };
 * ```
 */
export type MessagingServiceConfig =
  | (MessagingSingleProviderConfig & { logger?: Logger })
  | {
      /** Primary messaging provider to use first */
      primary: MessagingSingleProviderConfig;
      /** Optional backup providers for automatic failover */
      backups?: MessagingSingleProviderConfig[];
      /** Optional logger for debugging and monitoring */
      logger?: Logger;
    };

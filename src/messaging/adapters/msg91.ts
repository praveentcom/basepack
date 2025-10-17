/**
 * MSG91 messaging provider adapter
 * @module messaging/adapters/msg91
 */

import {
  IMessagingProvider,
  MessagingProvider,
  MSG91Config,
  SMSSendConfig,
  WhatsAppSendConfig,
  RCSSendConfig,
  MessageSendResult,
  MessageStatus,
  MessagingHealthInfo,
} from '../types';
import { MessagingError } from '../errors';
import type { Logger } from '../../logger';

/**
 * MSG91 messaging provider.
 *
 * Supports:
 * - SMS messaging with flow templates
 * - WhatsApp messaging with templates
 * - RCS messaging (limited support)
 * - Message status tracking
 * - Template-based messaging
 *
 * Uses MSG91's REST API directly (no SDK required).
 *
 * @example
 * ```typescript
 * const provider = new MSG91Provider({
 *   authKey: 'YOUR_AUTH_KEY',
 *   senderId: 'YOUR_SENDER_ID',
 *   flowId: 'YOUR_FLOW_ID'
 * });
 *
 * await provider.sendSMS({
 *   message: {
 *     from: 'SENDERID',
 *     to: '+919876543210',
 *     body: 'Hello from MSG91!'
 *   }
 * });
 * ```
 *
 * @see https://docs.msg91.com/
 */
export class MSG91Provider implements IMessagingProvider {
  readonly name = MessagingProvider.MSG91;
  private authKey: string;
  private senderId: string;
  private flowId: string;
  private endpoint: string;
  private defaultCountryCode: string;
  private logger: Logger;

  /**
   * Creates a new MSG91 provider instance.
   *
   * @param config - MSG91 configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If auth key is not provided
   */
  constructor(config: MSG91Config = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.authKey = config.authKey ?? process.env.MSG91_AUTH_KEY ?? '';
    this.senderId = config.senderId ?? process.env.MSG91_SENDER_ID ?? '';
    this.flowId = config.flowId ?? process.env.MSG91_FLOW_ID ?? '';
    this.endpoint = config.endpoint ?? 'https://control.msg91.com';
    this.defaultCountryCode = config.defaultCountryCode ?? '91';

    if (!this.authKey) {
      throw new Error(
        'MSG91 auth key is required. Provide authKey in config or set MSG91_AUTH_KEY environment variable.'
      );
    }
  }

  /**
   * Sends an SMS message via MSG91.
   *
   * @param config - SMS send configuration
   * @returns Send result with message ID and status
   */
  async sendSMS(config: SMSSendConfig): Promise<MessageSendResult> {
    const { message } = config;

    this.logger.debug('Basepack Messaging: Provider sending SMS', {
      provider: this.name,
      from: message.from,
      to: message.to,
    });

    try {
      const to = this.normalizePhoneNumber(message.to);
      const url = `${this.endpoint}/api/v5/flow`;

      const payload: any = {
        template_id: this.flowId || 'default', // Use flowId from config or default
        sender: message.from || this.senderId,
        short_url: '1', // Track clicks
        recipients: [
          {
            to,
            variables: {
              MESSAGE: message.body,
              // Add any other variables from templateVariables if present
              ...(config.opts?.metadata || {})
            }
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authKey}`,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.type === 'error') {
        const errorMessage = data.message || `MSG91 API error: ${response.status}`;
        this.logger.error('Basepack Messaging: Provider send failed', {
          provider: this.name,
          status: response.status,
          error: errorMessage,
        });

        throw new MessagingError(
          errorMessage,
          this.name,
          response.status,
          data,
          this.isRetryableStatusCode(response.status)
        );
      }

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId: data.id,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.id,
        provider: this.name,
        timestamp: new Date(),
        status: data.status || 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error,
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Sends a WhatsApp message via MSG91.
   *
   * @param config - WhatsApp send configuration
   * @returns Send result with message ID and status
   */
  async sendWhatsApp(config: WhatsAppSendConfig): Promise<MessageSendResult> {
    const { message } = config;

    this.logger.debug('Basepack Messaging: Provider sending WhatsApp', {
      provider: this.name,
      from: message.from,
      to: message.to,
    });

    try {
      const to = this.normalizePhoneNumber(message.to);
      const url = `${this.endpoint}/api/v5/whatsapp/whatsapp-outbound-message/`;

      const payload: any = {
        mobile: to,
        template_name: message.templateName || 'default',
        template_id: message.templateName || this.flowId,
        variables: message.templateVariables || {},
        // If it's a template message
        ...(message.templateName && {
          template_name: message.templateName,
          variables: message.templateVariables || {}
        }),
        // If it's a regular message
        ...(!message.templateName && {
          message: message.body
        })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authKey}`,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.type === 'error') {
        const errorMessage = data.message || `MSG91 API error: ${response.status}`;
        this.logger.error('Basepack Messaging: Provider send failed', {
          provider: this.name,
          status: response.status,
          error: errorMessage,
        });

        throw new MessagingError(
          errorMessage,
          this.name,
          response.status,
          data,
          this.isRetryableStatusCode(response.status)
        );
      }

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId: data.id,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.id,
        provider: this.name,
        timestamp: new Date(),
        status: data.status || 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error,
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Sends an RCS message via MSG91.
   *
   * Note: RCS support in MSG91 may require specific configuration.
   *
   * @param config - RCS send configuration
   * @returns Send result with message ID and status
   */
  async sendRCS(config: RCSSendConfig): Promise<MessageSendResult> {
    const { message } = config;

    this.logger.debug('Basepack Messaging: Provider sending RCS', {
      provider: this.name,
      from: message.from,
      to: message.to,
    });

    try {
      const to = this.normalizePhoneNumber(message.to);

      // MSG91 RCS support - use the flow API for RCS messages
      const url = `${this.endpoint}/api/v5/flow`;

      const payload: any = {
        template_id: this.flowId || 'default',
        sender: message.from || this.senderId,
        short_url: '1',
        recipients: [
          {
            to,
            variables: {
              MESSAGE: message.body,
              // Include RCS suggestions if present
              ...(message.suggestions && message.suggestions.length > 0 && {
                SUGGESTIONS: JSON.stringify(message.suggestions)
              }),
              ...(config.opts?.metadata || {})
            }
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authKey}`,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.type === 'error') {
        const errorMessage = data.message || `MSG91 API error: ${response.status}`;
        this.logger.error('Basepack Messaging: Provider send failed', {
          provider: this.name,
          status: response.status,
          error: errorMessage,
        });

        throw new MessagingError(
          errorMessage,
          this.name,
          response.status,
          data,
          this.isRetryableStatusCode(response.status)
        );
      }

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId: data.id,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.id,
        provider: this.name,
        timestamp: new Date(),
        status: data.status || 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error,
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Gets the delivery status of a message.
   *
   * @param messageId - MSG91 message ID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      const url = `${this.endpoint}/api/v5/flow/report/${messageId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authKey}`,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.error('Basepack Messaging: Failed to get message status', {
          provider: this.name,
          messageId,
          status: response.status,
        });

        return null;
      }

      const data = await response.json();

      return {
        messageId,
        status: data.status || 'unknown',
        provider: this.name,
        timestamp: new Date(),
        details: {
          deliveryStatus: data.delivery_status,
          responseCode: data.response_code,
          deliveredAt: data.delivered_at,
          readAt: data.read_at,
        },
      };
    } catch (error) {
      this.logger.error('Basepack Messaging: Failed to get message status', {
        provider: this.name,
        messageId,
        error,
      });

      return null;
    }
  }

  /**
   * Checks the health status of the MSG91 provider.
   *
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check MSG91 account balance/status
      const url = `${this.endpoint}/api/v5/balance`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authKey}`,
          'accept': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `MSG91 API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: true,
        message: 'MSG91 provider is healthy',
        details: {
          currency: data.currency,
          balance: data.balance,
          lowBalanceThreshold: data.low_balance_threshold,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'MSG91 health check failed',
      };
    }
  }

  /**
   * Normalizes phone number to MSG91 format.
   *
   * @param phoneNumber - Phone number to normalize
   * @returns Normalized phone number
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove any 'whatsapp:' prefix
    let normalized = phoneNumber.replace(/^whatsapp:/, '');

    // Remove any non-digit characters
    normalized = normalized.replace(/\D/g, '');

    // If number doesn't start with country code, add default country code
    if (!normalized.startsWith('91') && normalized.length === 10) {
      normalized = this.defaultCountryCode + normalized;
    }

    return normalized;
  }

  /**
   * Checks if an HTTP status code is retryable.
   *
   * @param statusCode - HTTP status code
   * @returns `true` if the error should be retried
   */
  private isRetryableStatusCode(statusCode: number): boolean {
    // 429: Too Many Requests (rate limiting)
    // 500: Internal Server Error
    // 502: Bad Gateway
    // 503: Service Unavailable
    // 504: Gateway Timeout
    return [429, 500, 502, 503, 504].includes(statusCode);
  }

  /**
   * Checks if an error is retryable.
   *
   * @param error - Error to check
   * @returns `true` if the error should be retried
   */
  private isRetryableError(error: unknown): boolean {
    // Network errors, timeouts, etc.
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('enotfound') ||
        message.includes('network') ||
        message.includes('rate limit')
      );
    }
    return false;
  }
}
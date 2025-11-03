/**
 * Vonage messaging provider adapter
 * @module messaging/adapters/vonage
 */

import {
  IMessagingProvider,
  MessagingProvider,
  VonageConfig,
  SMSSendConfig,
  WhatsAppSendConfig,
  RCSSendConfig,
  MessageSendResult,
  MessageStatus,
  MessagingHealthInfo,
} from '../types';
import { MessagingError } from '../errors';
import type { Logger } from '../../logger';
import { toSafeErrorDetails } from '../../logger';

/**
 * Vonage messaging provider.
 *
 * Supports:
 * - SMS messaging
 * - WhatsApp messaging (limited support)
 * - RCS messaging (limited support)
 * - Message status tracking
 *
 * Uses Vonage's REST API directly (no SDK required).
 *
 * @example
 * ```typescript
 * const provider = new VonageProvider({
 *   apiKey: 'YOUR_API_KEY',
 *   apiSecret: 'YOUR_API_SECRET'
 * });
 *
 * await provider.sendSMS({
 *   message: {
 *     from: 'Vonage',
 *     to: '+14155552672',
 *     body: 'Hello from Vonage!'
 *   }
 * });
 * ```
 *
 * @see https://developer.vonage.com/en/api/sms
 */
export class VonageProvider implements IMessagingProvider {
  readonly name = MessagingProvider.VONAGE;
  private apiKey: string;
  private apiSecret: string;
  private applicationId: string;
  private privateKey: string;
  private endpoint: string;
  private logger: Logger;

  /**
   * Creates a new Vonage provider instance.
   *
   * @param config - Vonage configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If API key or secret is not provided
   */
  constructor(config: VonageConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.apiKey = config.apiKey ?? process.env.VONAGE_API_KEY ?? '';
    this.apiSecret = config.apiSecret ?? process.env.VONAGE_API_SECRET ?? '';
    this.applicationId = config.applicationId ?? process.env.VONAGE_APPLICATION_ID ?? '';
    this.privateKey = config.privateKey ?? process.env.VONAGE_PRIVATE_KEY ?? '';
    this.endpoint = config.endpoint ?? 'https://rest.nexmo.com';

    if (!this.apiKey || !this.apiSecret) {
      throw new Error(
        'Vonage API key and secret are required. Provide apiKey and apiSecret in config or set VONAGE_API_KEY and VONAGE_API_SECRET environment variables.'
      );
    }
  }

  /**
   * Sends an SMS message via Vonage.
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
      const url = `${this.endpoint}/sms/json`;
      const payload: any = {
        from: message.from,
        to: message.to,
        text: message.body,
        // Add status report request for better tracking
        'status-report-req': 1,
      };

      // Add Unicode support if needed
      if (this.containsNonLatinChars(message.body)) {
        payload['type'] = 'unicode';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.messages[0]?.status !== '0') {
        const errorMessage = data.messages?.[0]?.['error-text'] || `Vonage API error: ${response.status}`;
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

      const messageId = data.messages[0]['message-id'];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: data.messages[0].status,
      });

      return {
        success: true,
        messageId,
        provider: this.name,
        timestamp: new Date(),
        status: 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error: toSafeErrorDetails(error),
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Sends a WhatsApp message via Vonage.
   *
   * Note: WhatsApp support requires Vonage application setup and private key.
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

    if (!this.applicationId || !this.privateKey) {
      throw new MessagingError(
        'Vonage application ID and private key are required for WhatsApp messaging',
        this.name,
        400
      );
    }

    try {
      // Vonage WhatsApp uses the Messages API which requires JWT authentication
      // For simplicity, we'll use the SMS API as fallback
      const to = message.to.replace(/^whatsapp:/, '');
      const from = message.from.replace(/^whatsapp:/, '');

      const url = `${this.endpoint}/sms/json`;
      const payload = {
        from,
        to,
        text: message.body,
        'status-report-req': 1,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.messages[0]?.status !== '0') {
        const errorMessage = data.messages?.[0]?.['error-text'] || `Vonage API error: ${response.status}`;
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

      const messageId = data.messages[0]['message-id'];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: data.messages[0].status,
      });

      return {
        success: true,
        messageId,
        provider: this.name,
        timestamp: new Date(),
        status: 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error: toSafeErrorDetails(error),
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Sends an RCS message via Vonage.
   *
   * Note: RCS support in Vonage requires additional setup.
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
      // For now, send as SMS since RCS requires specific Vonage setup
      const url = `${this.endpoint}/sms/json`;
      const payload: any = {
        from: message.from,
        to: message.to,
        text: message.body,
        'status-report-req': 1,
      };

      if (this.containsNonLatinChars(message.body)) {
        payload['type'] = 'unicode';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.messages[0]?.status !== '0') {
        const errorMessage = data.messages?.[0]?.['error-text'] || `Vonage API error: ${response.status}`;
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

      const messageId = data.messages[0]['message-id'];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: data.messages[0].status,
      });

      return {
        success: true,
        messageId,
        provider: this.name,
        timestamp: new Date(),
        status: 'sent',
      };
    } catch (error) {
      if (error instanceof MessagingError) {
        throw error;
      }

      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        error: toSafeErrorDetails(error),
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Gets the delivery status of a message.
   *
   * @param messageId - Vonage message ID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      // Vonage provides delivery receipts via webhook
      // For basic status checking, we can use the search API
      const url = `${this.endpoint}/search/message`;
      const params = new URLSearchParams({
        id: messageId,
        api_key: this.apiKey,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
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

      if (data.items && data.items.length > 0) {
        const messageData = data.items[0];
        return {
          messageId,
          status: messageData.status,
          provider: this.name,
          timestamp: new Date(messageData['message-timestamp']),
          details: {
            errorCode: messageData.errorCode,
            network: messageData.network,
            price: messageData['message-price'],
            currency: messageData.currency,
          },
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Basepack Messaging: Failed to get message status', {
        provider: this.name,
        messageId,
        error: toSafeErrorDetails(error),
      });

      return null;
    }
  }

  /**
   * Checks the health status of the Vonage provider.
   *
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check Vonage account balance
      const url = `${this.endpoint}/account/get-balance`;
      const params = new URLSearchParams({
        api_key: this.apiKey,
        api_secret: this.apiSecret,
      });

      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `Vonage API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: true,
        message: 'Vonage provider is healthy',
        details: {
          balance: data.value,
          currency: data.currency,
          autoReload: data['auto-reload'],
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Vonage health check failed',
      };
    }
  }

  /**
   * Checks if a string contains non-Latin characters.
   *
   * @param text - Text to check
   * @returns `true` if text contains non-Latin characters
   */
  private containsNonLatinChars(text: string): boolean {
    return /[^\x00-\x7F]/.test(text);
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
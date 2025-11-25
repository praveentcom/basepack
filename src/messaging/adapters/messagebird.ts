/**
 * MessageBird messaging provider adapter
 * @module messaging/adapters/messagebird
 */

import {
  IMessagingProvider,
  MessagingProvider,
  MessageBirdConfig,
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
 * MessageBird messaging provider.
 *
 * Supports:
 * - SMS messaging
 * - WhatsApp messaging
 * - RCS messaging (limited support)
 * - Voice messaging
 * - Message status tracking
 *
 * Uses MessageBird's REST API directly (no SDK required).
 *
 * @example
 * ```typescript
 * const provider = new MessageBirdProvider({
 *   accessKey: 'YOUR_ACCESS_KEY'
 * });
 *
 * await provider.sendSMS({
 *   message: {
 *     from: 'YourName',
 *     to: '+14155552672',
 *     body: 'Hello from MessageBird!'
 *   }
 * });
 * ```
 *
 * @see https://developers.messagebird.com/api/sms-messaging
 */
export class MessageBirdProvider implements IMessagingProvider {
  readonly name = MessagingProvider.MESSAGEBIRD;
  private accessKey: string;
  private endpoint: string;
  private logger: Logger;

  /**
   * Creates a new MessageBird provider instance.
   *
   * @param config - MessageBird configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If access key is not provided
   */
  constructor(config: MessageBirdConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.accessKey = config.accessKey ?? process.env.MESSAGEBIRD_ACCESS_KEY ?? '';
    this.endpoint = config.endpoint ?? 'https://api.messagebird.com';

    if (!this.accessKey) {
      throw new Error(
        'MessageBird access key is required. Provide accessKey in config or set MESSAGEBIRD_ACCESS_KEY environment variable.'
      );
    }
  }

  /**
   * Sends an SMS message via MessageBird.
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
      const url = `${this.endpoint}/messages`;
      const payload: any = {
        originator: message.from,
        recipients: [message.to],
        body: message.body,
        datacoding: 'auto', // Let MessageBird detect encoding
      };

      // Add media URLs if present (MMS support)
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['mediaUrls'] = message.mediaUrls;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.accessKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.errors?.length > 0) {
        const errorMessage = data.errors?.[0]?.description || `MessageBird API error: ${response.status}`;
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

      const messageId = data.id;

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: 'sent',
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
   * Sends a WhatsApp message via MessageBird.
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
      // Remove 'whatsapp:' prefix if present
      const to = message.to.replace(/^whatsapp:/, '');
      const from = message.from.replace(/^whatsapp:/, '');

      const url = `${this.endpoint}/messages`;
      const payload: any = {
        originator: from,
        recipients: [`whatsapp:${to}`],
        body: message.body,
        datacoding: 'auto',
      };

      // Handle template messages
      if (message.templateName) {
        payload['type'] = 'hsm';
        payload['template'] = {
          name: message.templateName,
          language: 'en', // Default language
          components: Object.entries(message.templateVariables || {}).map(([key, value]) => ({
            type: 'text',
            text: value
          }))
        };
      }

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['mediaUrls'] = message.mediaUrls;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.accessKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.errors?.length > 0) {
        const errorMessage = data.errors?.[0]?.description || `MessageBird API error: ${response.status}`;
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

      const messageId = data.id;

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: 'sent',
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
   * Sends an RCS message via MessageBird.
   *
   * Note: RCS support in MessageBird requires additional setup.
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
      const url = `${this.endpoint}/messages`;
      const payload: any = {
        originator: message.from,
        recipients: [message.to],
        body: message.body,
        datacoding: 'auto',
      };

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['mediaUrls'] = message.mediaUrls;
      }

      // Include RCS suggestions in the message if present
      if (message.suggestions && message.suggestions.length > 0) {
        payload['body'] += '\n\nSuggestions:\n' +
          message.suggestions.map(s => `${s.text}`).join('\n');

        // Add suggestions as metadata for future RCS implementation
        payload['reference'] = JSON.stringify({
          suggestions: message.suggestions
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `AccessKey ${this.accessKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.errors?.length > 0) {
        const errorMessage = data.errors?.[0]?.description || `MessageBird API error: ${response.status}`;
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

      const messageId = data.id;

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        status: 'sent',
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
        error,
      });

      const messagingError = MessagingError.from(error, this.name, this.isRetryableError(error));
      throw messagingError;
    }
  }

  /**
   * Gets the delivery status of a message.
   *
   * @param messageId - MessageBird message ID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      const url = `${this.endpoint}/messages/${messageId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `AccessKey ${this.accessKey}`,
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
        timestamp: new Date(data.createdDatetime),
        details: {
          originator: data.originator,
          recipient: data.recipients?.[0],
          reference: data.reference,
          totalPrice: data.totalPrice,
          currency: data.currency,
          deliveryStatus: data.recipients?.[0]?.status,
          statusDatetime: data.recipients?.[0]?.statusDatetime,
        },
      };
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
   * Checks the health status of the MessageBird provider.
   *
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check MessageBird account balance
      const url = `${this.endpoint}/balance`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `AccessKey ${this.accessKey}`,
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `MessageBird API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: true,
        message: 'MessageBird provider is healthy',
        details: {
          amount: data.amount,
          currency: data.currency,
          type: data.type,
          payment: data.payment,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'MessageBird health check failed',
      };
    }
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
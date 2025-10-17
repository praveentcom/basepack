/**
 * Plivo messaging provider adapter
 * @module messaging/adapters/plivo
 */

import {
  IMessagingProvider,
  MessagingProvider,
  PlivoConfig,
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
 * Plivo messaging provider.
 *
 * Supports:
 * - SMS messaging
 * - MMS messaging
 * - WhatsApp messaging (limited support)
 * - RCS messaging (limited support)
 * - Message status tracking
 *
 * Uses Plivo's REST API directly (no SDK required).
 *
 * @example
 * ```typescript
 * const provider = new PlivoProvider({
 *   authId: 'YOUR_AUTH_ID',
 *   authToken: 'YOUR_AUTH_TOKEN'
 * });
 *
 * await provider.sendSMS({
 *   message: {
 *     from: '+14155552671',
 *     to: '+14155552672',
 *     body: 'Hello from Plivo!'
 *   }
 * });
 * ```
 *
 * @see https://www.plivo.com/docs/messaging/api/
 */
export class PlivoProvider implements IMessagingProvider {
  readonly name = MessagingProvider.PLIVO;
  private authId: string;
  private authToken: string;
  private endpoint: string;
  private logger: Logger;

  /**
   * Creates a new Plivo provider instance.
   *
   * @param config - Plivo configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If auth ID or auth token is not provided
   */
  constructor(config: PlivoConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.authId = config.authId ?? process.env.PLIVO_AUTH_ID ?? '';
    this.authToken = config.authToken ?? process.env.PLIVO_AUTH_TOKEN ?? '';
    this.endpoint = config.endpoint ?? 'https://api.plivo.com';

    if (!this.authId || !this.authToken) {
      throw new Error(
        'Plivo auth ID and auth token are required. Provide authId and authToken in config or set PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN environment variables.'
      );
    }
  }

  /**
   * Sends an SMS message via Plivo.
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
      const url = `${this.endpoint}/v1/Account/${this.authId}/Message/`;
      const payload: any = {
        src: message.from,
        dst: message.to,
        text: message.body,
      };

      // Add media URLs if present (for MMS)
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['media_urls'] = message.mediaUrls;
        payload['type'] = 'mms';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.api_id === undefined) {
        const errorMessage = data.error || `Plivo API error: ${response.status}`;
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

      const messageId = data.message_uuid?.[0];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        apiId: data.api_id,
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
   * Sends a WhatsApp message via Plivo.
   *
   * Note: WhatsApp support requires additional Plivo setup.
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

      const url = `${this.endpoint}/v1/Account/${this.authId}/Message/`;
      const payload: any = {
        src: from,
        dst: `whatsapp:${to}`,
        text: message.body,
        powerpack_uuid: '', // Optional: for powerpack usage
      };

      // Handle template messages
      if (message.templateName) {
        payload['template'] = {
          name: message.templateName,
          language: 'en_US', // Default language
          components: [{
            type: 'body',
            parameters: Object.entries(message.templateVariables || {}).map(([key, value]) => ({
              type: 'text',
              text: value
            }))
          }]
        };
      }

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['media_urls'] = message.mediaUrls;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.api_id === undefined) {
        const errorMessage = data.error || `Plivo API error: ${response.status}`;
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

      const messageId = data.message_uuid?.[0];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        apiId: data.api_id,
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
   * Sends an RCS message via Plivo.
   *
   * Note: RCS support in Plivo requires additional setup.
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
      // For now, send as SMS since RCS requires specific Plivo setup
      const url = `${this.endpoint}/v1/Account/${this.authId}/Message/`;
      const payload: any = {
        src: message.from,
        dst: message.to,
        text: message.body,
      };

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        payload['media_urls'] = message.mediaUrls;
      }

      // Include RCS suggestions in the message if present
      if (message.suggestions && message.suggestions.length > 0) {
        payload['text'] += '\n\nSuggestions:\n' +
          message.suggestions.map(s => `${s.text}`).join('\n');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.api_id === undefined) {
        const errorMessage = data.error || `Plivo API error: ${response.status}`;
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

      const messageId = data.message_uuid?.[0];

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId,
        apiId: data.api_id,
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
   * @param messageId - Plivo message UUID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      const url = `${this.endpoint}/v1/Account/${this.authId}/Message/${messageId}/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')}`,
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
        status: data.message_state || data.message_status || 'unknown',
        provider: this.name,
        timestamp: new Date(data.message_time_stamp),
        details: {
          errorCode: data.error_code,
          fromNumber: data.from_number,
          toNumber: data.to_number,
          messageDirection: data.message_direction,
          totalAmount: data.total_amount,
          totalRate: data.total_rate,
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
   * Checks the health status of the Plivo provider.
   *
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check Plivo account details
      const url = `${this.endpoint}/v1/Account/${this.authId}/`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.authId}:${this.authToken}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `Plivo API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: data.account_type === 'standard',
        message: `Plivo provider is healthy (${data.account_type})`,
        details: {
          accountType: data.account_type,
          cashCredits: data.cash_credits,
          postalCode: data.postal_code,
          city: data.city,
          country: data.country,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Plivo health check failed',
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
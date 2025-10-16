/**
 * Twilio messaging provider adapter
 * @module messaging/adapters/twilio
 */

import {
  IMessagingProvider,
  MessagingProvider,
  TwilioConfig,
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
 * Twilio messaging provider.
 * 
 * Supports:
 * - SMS messaging
 * - WhatsApp messaging
 * - RCS messaging (limited support)
 * - Media attachments (images, videos, etc.)
 * - Message status tracking
 * - WhatsApp templates
 * 
 * Uses Twilio's REST API directly (no SDK required).
 * 
 * @example
 * ```typescript
 * const provider = new TwilioProvider({
 *   accountSid: 'YOUR_ACCOUNT_SID',
 *   authToken: 'YOUR_AUTH_TOKEN'
 * });
 * 
 * await provider.sendSMS({
 *   message: {
 *     from: '+14155552671',
 *     to: '+14155552672',
 *     body: 'Hello from Basepack!'
 *   }
 * });
 * ```
 * 
 * @see https://www.twilio.com/docs/sms/api
 */
export class TwilioProvider implements IMessagingProvider {
  readonly name = MessagingProvider.TWILIO;
  private accountSid: string;
  private authToken: string;
  private endpoint: string;
  private logger: Logger;

  /**
   * Creates a new Twilio provider instance.
   * 
   * @param config - Twilio configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If account SID or auth token is not provided
   */
  constructor(config: TwilioConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.accountSid = config.accountSid ?? process.env.TWILIO_ACCOUNT_SID ?? '';
    this.authToken = config.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? '';
    this.endpoint = config.endpoint ?? 'https://api.twilio.com';

    if (!this.accountSid || !this.authToken) {
      throw new Error(
        'Twilio credentials are required. Provide accountSid and authToken in config or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.'
      );
    }
  }

  /**
   * Sends an SMS message via Twilio.
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
      const url = `${this.endpoint}/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const body = new URLSearchParams({
        From: message.from,
        To: message.to,
        Body: message.body,
      });

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        message.mediaUrls.forEach((url) => {
          body.append('MediaUrl', url);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || `Twilio API error: ${response.status}`;
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
        messageId: data.sid,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
        timestamp: new Date(),
        status: data.status,
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
   * Sends a WhatsApp message via Twilio.
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
      // Ensure numbers have 'whatsapp:' prefix
      const from = message.from.startsWith('whatsapp:') ? message.from : `whatsapp:${message.from}`;
      const to = message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`;

      const url = `${this.endpoint}/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const body = new URLSearchParams({
        From: from,
        To: to,
      });

      // Handle template or regular message
      if (message.templateName) {
        // WhatsApp template message
        body.append('ContentSid', message.templateName);
        
        // Add template variables if present
        if (message.templateVariables) {
          body.append('ContentVariables', JSON.stringify(message.templateVariables));
        }
      } else if (message.body) {
        // Regular WhatsApp message
        body.append('Body', message.body);
      }

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        message.mediaUrls.forEach((url) => {
          body.append('MediaUrl', url);
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || `Twilio API error: ${response.status}`;
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
        messageId: data.sid,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
        timestamp: new Date(),
        status: data.status,
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
   * Sends an RCS message via Twilio.
   * 
   * Note: RCS support in Twilio is limited and may require specific account configuration.
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
      // Twilio's RCS support is through their Conversations API
      // For now, we'll attempt to send as a standard message with RCS features
      const url = `${this.endpoint}/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const body = new URLSearchParams({
        From: message.from,
        To: message.to,
        Body: message.body,
      });

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        message.mediaUrls.forEach((url) => {
          body.append('MediaUrl', url);
        });
      }

      // RCS suggestions are not directly supported in the basic Messages API
      // This would require Twilio Conversations API or custom integration
      if (message.suggestions && message.suggestions.length > 0) {
        this.logger.warn('Basepack Messaging: RCS suggestions are not fully supported', {
          provider: this.name,
          suggestionsCount: message.suggestions.length,
        });
        // Optionally, we could add suggestions as part of the body or handle differently
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || `Twilio API error: ${response.status}`;
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
        messageId: data.sid,
        status: data.status,
      });

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
        timestamp: new Date(),
        status: data.status,
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
   * @param messageId - Twilio message SID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      const url = `${this.endpoint}/2010-04-01/Accounts/${this.accountSid}/Messages/${messageId}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.message || `Twilio API error: ${response.status}`;
        
        this.logger.error('Basepack Messaging: Failed to get message status', {
          provider: this.name,
          messageId,
          status: response.status,
          error: errorMessage,
        });

        return null;
      }

      const data = await response.json();

      return {
        messageId: data.sid,
        status: data.status,
        provider: this.name,
        timestamp: new Date(data.date_updated || data.date_created),
        details: {
          errorCode: data.error_code,
          errorMessage: data.error_message,
          price: data.price,
          priceUnit: data.price_unit,
          direction: data.direction,
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
   * Checks the health status of the Twilio provider.
   * 
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check Twilio account status by fetching account details
      const url = `${this.endpoint}/2010-04-01/Accounts/${this.accountSid}.json`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `Twilio API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: data.status === 'active',
        message: `Twilio provider is ${data.status}`,
        details: {
          accountSid: data.sid,
          friendlyName: data.friendly_name,
          status: data.status,
          type: data.type,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Twilio health check failed',
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
    // 503: Service Unavailable
    // 504: Gateway Timeout
    return [429, 503, 504].includes(statusCode);
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
        message.includes('network')
      );
    }
    return false;
  }
}


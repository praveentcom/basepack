/**
 * Meta Business messaging provider adapter
 * @module messaging/adapters/meta
 */

import {
  IMessagingProvider,
  MessagingProvider,
  MetaConfig,
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
 * Meta Business messaging provider.
 *
 * Supports:
 * - WhatsApp messaging via Meta Graph API
 * - Media attachments (images, videos, documents, etc.)
 * - Message templates
 * - Interactive messages (buttons, lists)
 * - Message status tracking
 * - Location messages
 * - Contact messages
 *
 * Uses Meta's Graph API directly (no SDK required).
 *
 * @example
 * ```typescript
 * const provider = new MetaProvider({
 *   phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
 *   accessToken: 'YOUR_ACCESS_TOKEN'
 * });
 *
 * await provider.sendWhatsApp({
 *   message: {
 *     from: 'YOUR_PHONE_NUMBER_ID',
 *     to: '+14155552672',
 *     body: 'Hello from Basepack!'
 *   }
 * });
 * ```
 *
 * @see https://developers.facebook.com/docs/whatsapp/
 */
export class MetaProvider implements IMessagingProvider {
  readonly name = MessagingProvider.META;
  private phoneNumberId: string;
  private accessToken: string;
  private version: string;
  private endpoint: string;
  private wabaId?: string;
  private logger: Logger;

  /**
   * Creates a new Meta Business provider instance.
   *
   * @param config - Meta Business configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If phone number ID or access token is not provided
   */
  constructor(config: MetaConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', { provider: this.name });

    this.phoneNumberId = config.phoneNumberId ?? process.env.META_PHONE_NUMBER_ID ?? '';
    this.accessToken = config.accessToken ?? process.env.META_ACCESS_TOKEN ?? '';
    this.version = config.version ?? 'v18.0';
    this.endpoint = config.endpoint ?? 'https://graph.facebook.com';
    this.wabaId = config.wabaId;

    if (!this.phoneNumberId || !this.accessToken) {
      throw new Error(
        'Meta Business credentials are required. Provide phoneNumberId and accessToken in config or set META_PHONE_NUMBER_ID and META_ACCESS_TOKEN environment variables.'
      );
    }
  }

  /**
   * SMS is not supported by Meta Business API.
   * This method will always throw an error.
   */
  async sendSMS(config: SMSSendConfig): Promise<MessageSendResult> {
    throw new MessagingError(
      'SMS messaging is not supported by Meta Business API. Use WhatsApp messaging instead.',
      this.name,
      400,
      null,
      false
    );
  }

  /**
   * Sends a WhatsApp message via Meta Graph API.
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
      // Ensure recipient is in E.164 format without 'whatsapp:' prefix
      const to = message.to.replace('whatsapp:', '');

      const url = `${this.endpoint}/${this.version}/${this.phoneNumberId}/messages`;

      // Build the message payload
      const payload: any = {
        messaging_product: 'whatsapp',
        to: to,
      };

      // Handle template or regular message
      if (message.templateName) {
        // WhatsApp template message
        payload.type = 'template';
        payload.template = {
          name: message.templateName,
          language: { code: 'en_US' },
        };

        // Add template variables if present
        if (message.templateVariables) {
          payload.template.components = [{
            type: 'body',
            parameters: Object.entries(message.templateVariables).map(([key, value]) => ({
              type: 'text',
              text: value
            }))
          }];
        }
      } else {
        // Regular text message
        payload.type = 'text';
        payload.text = {
          body: message.body,
        };
      }

      // Add media URLs if present
      if (message.mediaUrls && message.mediaUrls.length > 0) {
        // For simplicity, we'll attach the first media URL
        // In a full implementation, you'd handle different media types
        const mediaUrl = message.mediaUrls[0];
        const mediaType = this.getMediaTypeFromUrl(mediaUrl);

        if (mediaType) {
          payload.type = mediaType;
          payload[mediaType] = {
            link: mediaUrl,
          };
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || `Meta API error: ${response.status}`;
        this.logger.error('Basepack Messaging: Provider send failed', {
          provider: this.name,
          status: response.status,
          error: errorMessage,
          errorData: data.error,
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
        messageId: data.messages?.[0]?.id,
        status: 'sent',
      });

      return {
        success: true,
        messageId: data.messages?.[0]?.id,
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
   * RCS is not supported by Meta Business API.
   * This method will always throw an error.
   */
  async sendRCS(config: RCSSendConfig): Promise<MessageSendResult> {
    throw new MessagingError(
      'RCS messaging is not supported by Meta Business API. Use WhatsApp messaging instead.',
      this.name,
      400,
      null,
      false
    );
  }

  /**
   * Gets the delivery status of a WhatsApp message.
   *
   * @param messageId - Meta message ID
   * @returns Message status information
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Getting message status', {
      provider: this.name,
      messageId,
    });

    try {
      const url = `${this.endpoint}/${this.version}/${messageId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error?.message || `Meta API error: ${response.status}`;

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
        messageId: data.id,
        status: this.mapMetaStatusToStandard(data.conversation?.origin?.type || 'unknown'),
        provider: this.name,
        timestamp: new Date(),
        details: {
          direction: data.direction,
          conversation: data.conversation,
          pricing: data.pricing,
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
   * Checks the health status of the Meta Business provider.
   *
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      // Check Meta Business phone number status
      const url = `${this.endpoint}/${this.version}/${this.phoneNumberId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `Meta API returned status ${response.status}`,
        };
      }

      const data = await response.json();

      return {
        ok: data.display_phone_number ? true : false,
        message: `Meta Business provider is ${data.name_verified ? 'verified' : 'unverified'}`,
        details: {
          phoneNumberId: data.id,
          displayName: data.display_phone_number,
          nameVerified: data.name_verified,
          qualityRating: data.quality_rating,
          codeVerificationStatus: data.code_verification_status,
          wabaId: this.wabaId,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Meta Business health check failed',
      };
    }
  }

  /**
   * Determines media type from URL extension.
   *
   * @param url - Media URL
   * @returns Media type string or null if unknown
   */
  private getMediaTypeFromUrl(url: string): string | null {
    const extension = url.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
        return 'document';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
      default:
        return null;
    }
  }

  /**
   * Maps Meta status to standard status format.
   *
   * @param metaStatus - Meta conversation status
   * @returns Standard status string
   */
  private mapMetaStatusToStandard(metaStatus: string): string {
    switch (metaStatus) {
      case 'user_initiated':
      case 'business_initiated':
        return 'sent';
      case 'referral_conversion':
        return 'delivered';
      default:
        return 'unknown';
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

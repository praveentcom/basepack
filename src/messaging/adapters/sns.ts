/**
 * AWS SNS messaging provider adapter
 * @module messaging/adapters/sns
 */

import {
  IMessagingProvider,
  MessagingProvider,
  SNSConfig,
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
 * AWS SNS (Simple Notification Service) messaging provider.
 * 
 * Supports:
 * - SMS messaging
 * - Transactional and promotional SMS
 * - International SMS
 * 
 * Does NOT support:
 * - WhatsApp messaging (throws error)
 * - RCS messaging (throws error)
 * - Message status tracking (returns null)
 * - Media attachments
 * 
 * Requires: `@aws-sdk/client-sns` package
 * 
 * @example
 * ```typescript
 * const provider = new SNSProvider({
 *   region: 'us-east-1',
 *   accessKeyId: 'YOUR_KEY',
 *   secretAccessKey: 'YOUR_SECRET'
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
 * @see https://aws.amazon.com/sns/
 */
export class SNSProvider implements IMessagingProvider {
  readonly name = MessagingProvider.SNS;
  private options: SNSConfig;
  private client: any;
  private logger: Logger;

  /**
   * Creates a new SNS provider instance.
   * 
   * @param config - SNS configuration options
   * @param logger - Optional logger for debugging and monitoring
   * @throws {Error} If @aws-sdk/client-sns package is not installed
   */
  constructor(config: SNSConfig = {}, logger: Logger = console) {
    this.logger = logger;
    this.logger.debug('Basepack Messaging: Initializing provider', {
      provider: this.name,
      region: config.region,
    });

    try {
      const { SNSClient } = require('@aws-sdk/client-sns');

      this.options = {
        region: config.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
        accessKeyId: config.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: config.sessionToken ?? process.env.AWS_SESSION_TOKEN,
        endpoint: config.endpoint ?? process.env.AWS_ENDPOINT_URL,
      };

      this.client = new SNSClient({
        region: this.options.region,
        credentials: this.options.accessKeyId && this.options.secretAccessKey ? {
          accessKeyId: this.options.accessKeyId,
          secretAccessKey: this.options.secretAccessKey,
          sessionToken: this.options.sessionToken,
        } : undefined,
        endpoint: this.options.endpoint,
      });
    } catch (error) {
      this.logger.error('Failed to initialize SNS provider', error);
      throw new Error(
        'AWS SDK for SNS is not installed. Install it with: npm install @aws-sdk/client-sns'
      );
    }
  }

  /**
   * Sends an SMS message via AWS SNS.
   * 
   * @param config - SMS send configuration
   * @returns Send result with message ID
   */
  async sendSMS(config: SMSSendConfig): Promise<MessageSendResult> {
    const { message } = config;

    this.logger.debug('Basepack Messaging: Provider sending SMS', {
      provider: this.name,
      to: message.to,
    });

    // SNS doesn't support media attachments
    if (message.mediaUrls && message.mediaUrls.length > 0) {
      this.logger.warn('Basepack Messaging: SNS does not support media attachments', {
        provider: this.name,
        mediaCount: message.mediaUrls.length,
      });
    }

    try {
      const { PublishCommand } = require('@aws-sdk/client-sns');

      const command = new PublishCommand({
        PhoneNumber: message.to,
        Message: message.body,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });

      const response = await this.client.send(command);

      this.logger.debug('Basepack Messaging: Provider message sent', {
        provider: this.name,
        messageId: response.MessageId,
      });

      return {
        success: true,
        messageId: response.MessageId,
        provider: this.name,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Basepack Messaging: Provider send failed', {
        provider: this.name,
        to: message.to,
        error,
      });

      const messagingError = MessagingError.from(
        error,
        this.name,
        this.isRetryableError(error)
      );
      throw messagingError;
    }
  }

  /**
   * WhatsApp is not supported by AWS SNS.
   * 
   * @throws {MessagingError} Always throws - WhatsApp not supported
   */
  async sendWhatsApp(config: WhatsAppSendConfig): Promise<MessageSendResult> {
    this.logger.error('Basepack Messaging: WhatsApp not supported', {
      provider: this.name,
    });

    throw new MessagingError(
      'WhatsApp messaging is not supported by AWS SNS. Use another provider that supports WhatsApp.',
      this.name,
      400
    );
  }

  /**
   * RCS is not supported by AWS SNS.
   * 
   * @throws {MessagingError} Always throws - RCS not supported
   */
  async sendRCS(config: RCSSendConfig): Promise<MessageSendResult> {
    this.logger.error('Basepack Messaging: RCS not supported', {
      provider: this.name,
    });

    throw new MessagingError(
      'RCS messaging is not supported by AWS SNS. Use another provider that supports RCS.',
      this.name,
      400
    );
  }

  /**
   * Message status tracking is not supported by AWS SNS.
   * 
   * @returns `null` - status tracking not supported
   */
  async getMessageStatus(messageId: string): Promise<MessageStatus | null> {
    this.logger.debug('Basepack Messaging: Message status not supported', {
      provider: this.name,
      messageId,
    });

    return null;
  }

  /**
   * Checks the health status of the AWS SNS provider.
   * 
   * @returns Health status information
   */
  async health(): Promise<MessagingHealthInfo> {
    try {
      const { GetSMSAttributesCommand } = require('@aws-sdk/client-sns');

      // Try to get SMS attributes to verify SNS access
      const command = new GetSMSAttributesCommand({
        attributes: ['MonthlySpendLimit', 'DeliveryStatusSuccessSamplingRate'],
      });

      const response = await this.client.send(command);

      return {
        ok: true,
        message: 'SNS provider is healthy',
        details: {
          region: this.options.region,
          attributes: response.attributes,
        },
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'SNS health check failed',
      };
    }
  }

  /**
   * Checks if an error is retryable.
   * 
   * @param error - Error to check
   * @returns `true` if the error should be retried
   */
  private isRetryableError(error: unknown): boolean {
    const errorCode = (error as any)?.code || (error as any)?.Code;
    const retryableCodes = [
      'Throttling',
      'RequestTimeout',
      'ServiceUnavailable',
      'InternalFailure',
      'InternalError',
    ];
    return retryableCodes.includes(errorCode);
  }
}

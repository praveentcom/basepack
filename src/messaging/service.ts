/**
 * Messaging service implementation
 * @module messaging/service
 */

import type {
  IMessagingProvider,
  MessagingServiceConfig,
  MessagingSingleProviderConfig,
  SMSSendConfig,
  WhatsAppSendConfig,
  RCSSendConfig,
  MessageSendResult,
  MessageStatus,
  TwilioConfig,
  SNSConfig,
  MetaConfig,
  MSG91Config,
  VonageConfig,
  PlivoConfig,
  MessageBirdConfig,
} from "./types";
import { MessagingProvider } from "./types";
import type { Logger } from "../logger";
import { TwilioProvider } from "./adapters/twilio";
import { SNSProvider } from "./adapters/sns";
import { MetaProvider } from "./adapters/meta";
import { MSG91Provider } from "./adapters/msg91";
import { VonageProvider } from "./adapters/vonage";
import { PlivoProvider } from "./adapters/plivo";
import { MessageBirdProvider } from "./adapters/messagebird";
import {
  validateSMSMessage,
  validateWhatsAppMessage,
  validateRCSMessage,
} from "./validation";
import { MessagingError, MessagingProviderError } from "./errors";
import { withRetry } from "./retry";
import { consoleLogger } from "../logger";

/**
 * Messaging service with multi-provider support and automatic failover.
 *
 * Supports multiple messaging providers (Twilio, AWS SNS, Meta Business, MSG91, Vonage, Plivo, MessageBird) with automatic
 * failover to backup providers if the primary fails.
 *
 * @example Single provider - Twilio
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.TWILIO,
 *   config: {
 *     accountSid: process.env.TWILIO_ACCOUNT_SID,
 *     authToken: process.env.TWILIO_AUTH_TOKEN
 *   }
 * });
 * ```
 *
 * @example Single provider - AWS SNS
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.SNS,
 *   config: { region: 'us-east-1' }
 * });
 * ```
 *
 * @example Single provider - MSG91
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.MSG91,
 *   config: {
 *     authKey: process.env.MSG91_AUTH_KEY,
 *     senderId: 'YOUR_SENDER_ID',
 *     flowId: 'YOUR_FLOW_ID'
 *   }
 * });
 * ```
 *
 * @example Single provider - Vonage
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.VONAGE,
 *   config: {
 *     apiKey: process.env.VONAGE_API_KEY,
 *     apiSecret: process.env.VONAGE_API_SECRET
 *   }
 * });
 * ```
 *
 * @example Single provider - Plivo
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.PLIVO,
 *   config: {
 *     authId: process.env.PLIVO_AUTH_ID,
 *     authToken: process.env.PLIVO_AUTH_TOKEN
 *   }
 * });
 * ```
 *
 * @example Single provider - MessageBird
 * ```typescript
 * const service = new MessagingService({
 *   provider: MessagingProvider.MESSENGERBIRD,
 *   config: {
 *     accessKey: process.env.MESSENGERBIRD_ACCESS_KEY
 *   }
 * });
 * ```
 *
 * @example With automatic failover
 * ```typescript
 * const service = new MessagingService({
 *   primary: { provider: MessagingProvider.TWILIO },
 *   backups: [
 *     { provider: MessagingProvider.SNS, config: { region: 'us-east-1' } }
 *   ]
 * });
 * ```
 */
export class MessagingService {
  private primaryProvider: IMessagingProvider;
  private backupProviders: IMessagingProvider[];
  private logger: Logger;

  /**
   * Creates a new MessagingService instance.
   *
   * **Provider-Specific Requirements:**
   * - `twilio`: No additional packages (uses fetch)
   * - `sns`: Requires `@aws-sdk/client-sns` package
   * - `meta`: No additional packages (uses fetch)
   * - `msg91`: No additional packages (uses fetch)
   * - `vonage`: No additional packages (uses fetch)
   * - `plivo`: No additional packages (uses fetch)
   * - `messagebird`: No additional packages (uses fetch)
   *
   * @param config - Service configuration with primary and optional backup providers
   * @throws {Error} If provider configuration is invalid or required dependencies are missing
   * @see {@link TwilioConfig} - Twilio configuration options
   * @see {@link SNSConfig} - AWS SNS configuration options
   * @see {@link MetaConfig} - Meta configuration options
   * @see {@link MSG91Config} - MSG91 configuration options
   * @see {@link VonageConfig} - Vonage configuration options
   * @see {@link PlivoConfig} - Plivo configuration options
   * @see {@link MessageBirdConfig} - MessageBird configuration options
   */
  constructor(config: MessagingServiceConfig) {
    this.logger = config.logger || consoleLogger();

    // Check if this is a multi-provider config
    if ("primary" in config) {
      this.logger.debug("Basepack Messaging: Initializing service", {
        primary: config.primary.provider,
        backups: config.backups?.map((b) => b.provider) || [],
      });
      // Ensure empty config object for providers that expect config
      const primaryConfig = { ...config.primary, config: config.primary.config ?? {} };
      this.primaryProvider = this.createProvider(primaryConfig);
      this.backupProviders = (config.backups || []).map((backup) =>
        this.createProvider({ ...backup, config: backup.config ?? {} }),
      );
    } else {
      // Single provider configuration
      this.logger.debug("Basepack Messaging: Initializing service", {
        provider: config.provider,
      });
      this.primaryProvider = this.createProvider(config);
      this.backupProviders = [];
    }
  }

  private createProvider(
    config: MessagingSingleProviderConfig,
  ): IMessagingProvider {
    switch (config.provider) {
      case MessagingProvider.TWILIO:
        return new TwilioProvider(config.config as TwilioConfig | undefined, this.logger);
      case MessagingProvider.SNS:
        return new SNSProvider(config.config as SNSConfig | undefined, this.logger);
      case MessagingProvider.META:
        return new MetaProvider(config.config as MetaConfig | undefined, this.logger);
      case MessagingProvider.MSG91:
        return new MSG91Provider(config.config as MSG91Config | undefined, this.logger);
      case MessagingProvider.VONAGE:
        return new VonageProvider(config.config as VonageConfig | undefined, this.logger);
      case MessagingProvider.PLIVO:
        return new PlivoProvider(config.config as PlivoConfig | undefined, this.logger);
      case MessagingProvider.MESSENGERBIRD:
        return new MessageBirdProvider(config.config as MessageBirdConfig | undefined, this.logger);
    }
  }

  /**
   * Sends an SMS message using the configured providers.
   *
   * Automatically validates phone numbers and message structure before sending.
   * If the primary provider fails, automatically tries backup providers in order.
   * Implements retry logic with exponential backoff for transient failures.
   *
   * @param config - SMS configuration with message and optional settings
   * @returns Send result with message ID and delivery status
   * @throws {MessagingValidationError} If message validation fails
   * @throws {MessagingProviderError} If all providers fail to send the message
   *
   * @example
   * ```typescript
   * const result = await service.sendSMS({
   *   message: {
   *     from: '+14155552671',
   *     to: '+14155552672',
   *     body: 'Hello from Basepack!'
   *   }
   * });
   *
   * console.log(result.messageId); // Message ID from provider
   * ```
   *
   * @example With media attachment
   * ```typescript
   * const result = await service.sendSMS({
   *   message: {
   *     from: '+14155552671',
   *     to: '+14155552672',
   *     body: 'Check out this image!',
   *     mediaUrls: ['https://example.com/image.jpg']
   *   }
   * });
   * ```
   */
  async sendSMS(config: SMSSendConfig): Promise<MessageSendResult> {
    const { message, opts } = config;

    this.logger.info("Basepack Messaging: Sending SMS", {
      from: message.from,
      to: message.to,
    });

    // Validate message before sending (unless explicitly disabled)
    const shouldValidate = opts?.validateBeforeSend !== false;
    if (shouldValidate) {
      this.logger.debug("Basepack Messaging: Validating SMS message");
      try {
        validateSMSMessage(message);
      } catch (error) {
        this.logger.error("Basepack Messaging: Validation failed", { error });
        throw error;
      }
    }

    return this.sendWithFailover(
      (provider) => provider.sendSMS(config),
      opts,
      "SMS",
    );
  }

  /**
   * Sends a WhatsApp message using the configured providers.
   *
   * Note: Twilio and Meta Business support WhatsApp. SNS will throw an error.
   *
   * @param config - WhatsApp configuration with message and optional settings
   * @returns Send result with message ID and delivery status
   * @throws {MessagingValidationError} If message validation fails
   * @throws {MessagingProviderError} If all providers fail to send the message
   * @throws {MessagingError} If provider doesn't support WhatsApp
   *
   * @example
   * ```typescript
   * const result = await service.sendWhatsApp({
   *   message: {
   *     from: 'whatsapp:+14155552671',
   *     to: 'whatsapp:+14155552672',
   *     body: 'Hello via WhatsApp!'
   *   }
   * });
   * ```
   *
   * @example With media attachment
   * ```typescript
   * const result = await service.sendWhatsApp({
   *   message: {
   *     from: 'whatsapp:+14155552671',
   *     to: 'whatsapp:+14155552672',
   *     body: 'Check out this video!',
   *     mediaUrls: ['https://example.com/video.mp4']
   *   }
   * });
   * ```
   *
   * @example Using WhatsApp template
   * ```typescript
   * const result = await service.sendWhatsApp({
   *   message: {
   *     from: 'whatsapp:+14155552671',
   *     to: 'whatsapp:+14155552672',
   *     body: '', // Not used with templates
   *     templateName: 'welcome_message',
   *     templateVariables: { name: 'John', code: '12345' }
   *   }
   * });
   * ```
   */
  async sendWhatsApp(config: WhatsAppSendConfig): Promise<MessageSendResult> {
    const { message, opts } = config;

    this.logger.info("Basepack Messaging: Sending WhatsApp", {
      from: message.from,
      to: message.to,
    });

    // Validate message before sending (unless explicitly disabled)
    const shouldValidate = opts?.validateBeforeSend !== false;
    if (shouldValidate) {
      this.logger.debug("Basepack Messaging: Validating WhatsApp message");
      try {
        validateWhatsAppMessage(message);
      } catch (error) {
        this.logger.error("Basepack Messaging: Validation failed", { error });
        throw error;
      }
    }

    return this.sendWithFailover(
      (provider) => provider.sendWhatsApp(config),
      opts,
      "WhatsApp",
    );
  }

  /**
   * Sends an RCS message using the configured providers.
   *
   * Note: Only Twilio supports RCS, and support is limited. SNS will throw an error.
   *
   * @param config - RCS configuration with message and optional settings
   * @returns Send result with message ID and delivery status
   * @throws {MessagingValidationError} If message validation fails
   * @throws {MessagingProviderError} If all providers fail to send the message
   * @throws {MessagingError} If provider doesn't support RCS
   *
   * @example
   * ```typescript
   * const result = await service.sendRCS({
   *   message: {
   *     from: '+14155552671',
   *     to: '+14155552672',
   *     body: 'Hello via RCS!',
   *     suggestions: [
   *       { type: 'reply', text: 'Yes' },
   *       { type: 'reply', text: 'No' }
   *     ]
   *   }
   * });
   * ```
   */
  async sendRCS(config: RCSSendConfig): Promise<MessageSendResult> {
    const { message, opts } = config;

    this.logger.info("Basepack Messaging: Sending RCS", {
      from: message.from,
      to: message.to,
    });

    // Validate message before sending (unless explicitly disabled)
    const shouldValidate = opts?.validateBeforeSend !== false;
    if (shouldValidate) {
      this.logger.debug("Basepack Messaging: Validating RCS message");
      try {
        validateRCSMessage(message);
      } catch (error) {
        this.logger.error("Basepack Messaging: Validation failed", { error });
        throw error;
      }
    }

    return this.sendWithFailover(
      (provider) => provider.sendRCS(config),
      opts,
      "RCS",
    );
  }

  /**
   * Gets the delivery status of a message.
   *
   * @param messageId - Message ID to check
   * @param providerName - Optional provider name to check (defaults to primary)
   * @returns Message status information or null if not supported/not found
   *
   * @example
   * ```typescript
   * const status = await service.getMessageStatus('SM1234567890abcdef');
   * if (status) {
   *   console.log(status.status); // e.g., 'delivered', 'failed', 'queued'
   * }
   * ```
   */
  async getMessageStatus(
    messageId: string,
    providerName?: MessagingProvider,
  ): Promise<MessageStatus | null> {
    this.logger.debug("Basepack Messaging: Getting message status", {
      messageId,
      provider: providerName || this.primaryProvider.name,
    });

    // Find the provider to use
    let provider = this.primaryProvider;
    if (providerName) {
      const found = [this.primaryProvider, ...this.backupProviders].find(
        (p) => p.name === providerName,
      );
      if (found) {
        provider = found;
      }
    }

    // Check if provider supports status tracking
    if (!provider.getMessageStatus) {
      this.logger.debug(
        "Basepack Messaging: Provider does not support status tracking",
        {
          provider: provider.name,
        },
      );
      return null;
    }

    try {
      return await provider.getMessageStatus(messageId);
    } catch (error) {
      this.logger.error("Basepack Messaging: Failed to get message status", {
        messageId,
        provider: provider.name,
        error,
      });
      return null;
    }
  }

  /**
   * Checks the health status of the primary and backup messaging providers.
   *
   * @returns Health status object containing primary provider status and backup provider statuses
   *
   * @example
   * ```typescript
   * const health = await service.health();
   * console.log(health.ok); // true if primary is healthy
   * console.log(health.provider); // MessagingProvider.TWILIO
   * console.log(health.primary); // { ok: true, message: '...' }
   * console.log(health.backups); // [{ name: MessagingProvider.SNS, health: {...} }]
   * ```
   */
  async health() {
    const primaryHealth = this.primaryProvider.health
      ? await this.primaryProvider.health()
      : { ok: true } as any;

    const backupHealths = await Promise.all(
      this.backupProviders.map(async (provider) => ({
        name: provider.name,
        health: provider.health ? await provider.health() : { ok: true },
      })),
    );

    return {
      ok: true,
      provider: this.primaryProvider.name,
      primary: { ok: true },
      backups: backupHealths,
    };
  }

  /**
   * Internal method to send messages with automatic failover and retry logic.
   */
  private async sendWithFailover(
    sendFn: (provider: IMessagingProvider) => Promise<MessageSendResult>,
    opts:
      | SMSSendConfig["opts"]
      | WhatsAppSendConfig["opts"]
      | RCSSendConfig["opts"]
      | undefined,
    messageType: string,
  ): Promise<MessageSendResult> {
    const providers = [this.primaryProvider, ...this.backupProviders];
    const errors: Array<{ provider: string; error: string }> = [];
    const retryOptions = {
      retries: opts?.retries ?? 2,
      minTimeout: opts?.retryMinTimeout ?? 1000,
      maxTimeout: opts?.retryMaxTimeout ?? 10000,
      factor: opts?.retryFactor ?? 2,
    };

    for (const provider of providers) {
      try {
        this.logger.debug("Basepack Messaging: Attempting send", {
          provider: provider.name,
          messageType,
        });

        // Use retry logic when sending through each provider
        const result = await withRetry(
          () => sendFn(provider),
          retryOptions,
          this.logger,
        );

        // Check if send was successful
        if (result.success) {
          // If this success is on a backup provider, log failover first
          if (provider !== this.primaryProvider) {
            this.logger.info(
              "Basepack Messaging: Failing over to backup provider",
              {
                from: this.primaryProvider.name,
                to: provider.name,
                messageType,
              },
            );
          }
          this.logger.info("Basepack Messaging: Message sent successfully", {
            provider: result.provider || provider.name,
            messageType,
            messageId: result.messageId,
          });
          return result;
        }

        // Failed, record error and continue to next provider
        const failureError = result.error || "Unknown error";
        this.logger.error("Basepack Messaging: Message send failed", {
          provider: provider.name,
          messageType,
          error: failureError,
        });
        errors.push({
          provider: provider.name,
          error: failureError,
        });
      } catch (error) {
        // Provider threw an exception, record it and try next provider
        const messagingError = MessagingError.from(error, provider.name, true);
        this.logger.error("Basepack Messaging: Provider exception", {
          provider: provider.name,
          messageType,
          error: messagingError.message,
        });
        errors.push({
          provider: provider.name,
          error: messagingError.message,
        });

        // If there are backup providers, log failover attempt
        if (providers.indexOf(provider) < providers.length - 1) {
          const nextProvider = providers[providers.indexOf(provider) + 1];
          this.logger.info(
            "Basepack Messaging: Failing over to backup provider",
            {
              from: provider.name,
              to: nextProvider.name,
              messageType,
            },
          );
        }
      }
    }

    // All providers failed
    this.logger.error("Basepack Messaging: All providers failed", {
      messageType,
      errors,
    });
    const errorMessage = `All messaging providers failed to send ${messageType}. Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}`;
    throw new MessagingProviderError(errorMessage, errors);
  }
}

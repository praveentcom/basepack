/**
 * Notification service main implementation
 * @module notification/service
 */

import type { Logger } from '../logger/types';
import {
  NotificationProvider,
  NotificationServiceConfig,
  NotificationSendConfig,
  NotificationSendResult,
  NotificationHealthInfo,
  INotificationProvider,
  NotificationSingleProviderConfig
} from './types';
import { NotificationError } from './errors';
import { validateNotificationSendConfig } from './validation';
import { FCMProvider } from './adapters/fcm';
import { APNSProvider } from './adapters/apns';
import { WebPushProvider } from './adapters/web-push';

/**
 * Notification service with multi-provider support and automatic failover
 */
export class NotificationService {
  private readonly primaryProvider: INotificationProvider;
  private readonly backupProviders: INotificationProvider[];
  private readonly logger?: Logger;

  /**
   * Create a new NotificationService instance
   *
   * @param config - Service configuration
   *
   * @example
   * ```typescript
   * import { NotificationService, NotificationProvider } from 'basepack';
   *
   * // Single provider
   * const service = new NotificationService({
   *   provider: NotificationProvider.FCM,
   *   config: { projectId: 'my-project' }
   * });
   *
   * // With failover
   * const service = new NotificationService({
   *   primary: { provider: NotificationProvider.FCM },
   *   backups: [
   *     { provider: NotificationProvider.APNS, config: { bundleId: 'com.example.app' } }
   *   ]
   * });
   * ```
   */
  constructor(config: NotificationServiceConfig) {
    this.logger = config.logger;

    // Handle single provider configuration
    if ('provider' in config) {
      this.primaryProvider = this.createProvider(config);
      this.backupProviders = [];
    }
    // Handle primary + backups configuration
    else {
      this.primaryProvider = this.createProvider(config.primary);
      this.backupProviders = (config.backups || []).map(backupConfig =>
        this.createProvider(backupConfig)
      );
    }

    this.log('info', 'NotificationService initialized', {
      primary: this.primaryProvider.name,
      backups: this.backupProviders.map(p => p.name),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create a provider instance from configuration
   */
  private createProvider(config: NotificationSingleProviderConfig): INotificationProvider {
    try {
      switch (config.provider) {
        case NotificationProvider.FCM:
          return new FCMProvider(config.config);
        case NotificationProvider.APNS:
          return new APNSProvider(config.config as any);
        case NotificationProvider.WEB_PUSH:
          return new WebPushProvider(config.config);
      }
    } catch (error) {
      if (error instanceof NotificationError) {
        throw error;
      }
      throw new NotificationError(
        `Failed to create provider ${config.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        config.provider
      );
    }
  }

  /**
   * Send notification(s) with automatic failover
   *
   * @param config - Send configuration with message(s) and options
   * @returns Array of send results
   *
   * @example
   * ```typescript
   * // Send single notification
   * const results = await service.send({
   *   message: {
   *     to: 'device-token',
   *     title: 'Hello',
   *     body: 'You have a new message'
   *   }
   * });
   *
   * // Send batch notifications
   * const results = await service.send({
   *   messages: [
   *     { to: 'token1', title: 'Hello', body: 'World' },
   *     { to: 'token2', title: 'Hello', body: 'World' }
   *   ]
   * });
   * ```
   */
  async send(config: NotificationSendConfig): Promise<NotificationSendResult[]> {
    validateNotificationSendConfig(config, this.primaryProvider.name);

    const messages = 'message' in config ? [config.message] : config.messages;
    this.log('info', 'Basepack Notification: Sending notifications', {
      count: messages.length,
      primary: this.primaryProvider.name,
      timestamp: new Date().toISOString()
    });

    // Try primary provider first
    try {
      const results = await this.primaryProvider.send(config);
      const successCount = results.filter(r => r.success).length;

      this.log('info', 'Basepack Notification: Primary provider completed', {
        provider: this.primaryProvider.name,
        success: successCount,
        total: results.length,
        timestamp: new Date().toISOString()
      });

      // If all successful, return results
      if (successCount === results.length) {
        return results;
      }

      // If we have backup providers and some failed, try failover
      if (this.backupProviders.length > 0 && successCount < results.length) {
        return this.handleFailover(config, results, messages);
      }

      return results;
    } catch (error) {
      this.log('error', 'Basepack Notification: Primary provider failed', {
        provider: this.primaryProvider.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Try backup providers if available
      if (this.backupProviders.length > 0) {
        return this.handleFailover(config, [], messages);
      }

      // Re-throw error if no backups available
      throw error;
    }
  }

  /**
   * Handle failover to backup providers
   */
  private async handleFailover(
    originalConfig: NotificationSendConfig,
    primaryResults: NotificationSendResult[],
    messages: any[]
  ): Promise<NotificationSendResult[]> {
    let failedIndices = primaryResults
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.success)
      .map(({ index }) => index);

    // If primary failed completely (e.g., threw), treat all messages as failed
    if (primaryResults.length === 0) {
      failedIndices = messages.map((_, idx) => idx);
    }

    // If no failures from primary, return as-is
    if (failedIndices.length === 0) {
      return primaryResults;
    }

    const allResults = [...primaryResults];

    // Try each backup provider for failed messages
    for (let i = 0; i < this.backupProviders.length && failedIndices.length > 0; i++) {
      const backupProvider = this.backupProviders[i];
      const failedMessages = failedIndices.map(index => messages[index]);

    this.log('info', 'Basepack Notification: Trying backup provider', {
        provider: backupProvider.name,
        failedCount: failedMessages.length,
        timestamp: new Date().toISOString()
      });

      try {
        const backupConfig = 'message' in originalConfig
          ? { message: failedMessages[0], opts: originalConfig.opts }
          : { messages: failedMessages, opts: originalConfig.opts };

        const backupResults = await backupProvider.send(backupConfig);
        const backupSuccessCount = backupResults.filter(r => r.success).length;

        this.log('info', 'Basepack Notification: Backup provider completed', {
          provider: backupProvider.name,
          success: backupSuccessCount,
          total: backupResults.length,
          timestamp: new Date().toISOString()
        });

        // Update results with successful backups
        let backupIndex = 0;
        const remainingFailedIndices: number[] = [];
        for (let j = 0; j < failedIndices.length; j++) {
          const originalIndex = failedIndices[j];
          if (backupResults[backupIndex]?.success) {
            allResults[originalIndex] = backupResults[backupIndex];
          } else {
            remainingFailedIndices.push(originalIndex);
          }
          backupIndex++;
        }
        failedIndices = remainingFailedIndices;

        // If all failed messages are now successful, break
        if (failedIndices.length === 0) {
          break;
        }
      } catch (error) {
        this.log('error', 'Basepack Notification: Backup provider failed', {
          provider: backupProvider.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        // Continue to next backup provider
        continue;
      }
    }

    return allResults;
  }

  /**
   * Check health of all configured providers
   *
   * @returns Health information for all providers
   */
  async health(): Promise<Record<string, NotificationHealthInfo>> {
    const results: Record<string, NotificationHealthInfo> = {};

    // Check primary provider
    try {
      results[this.primaryProvider.name] = await this.primaryProvider.health?.() ?? {
        ok: true,
        message: 'Healthy'
      };
    } catch (error) {
      results[this.primaryProvider.name] = {
        ok: false,
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }

    // Check backup providers
    for (const backupProvider of this.backupProviders) {
      try {
        results[backupProvider.name] = await backupProvider.health?.() ?? {
          ok: false,
          message: 'Unhealthy'
        };
      } catch (error) {
        results[backupProvider.name] = {
          ok: false,
          message: error instanceof Error ? error.message : 'Health check failed'
        };
      }
    }

    return results;
  }

  /**
   * Get the primary provider instance
   */
  getPrimaryProvider(): INotificationProvider {
    return this.primaryProvider;
  }

  /**
   * Get backup provider instances
   */
  getBackupProviders(): INotificationProvider[] {
    return [...this.backupProviders];
  }

  /**
   * Get all configured providers
   */
  getAllProviders(): INotificationProvider[] {
    return [this.primaryProvider, ...this.backupProviders];
  }

  /**
   * Create a provider factory function
   *
   * @param config - Provider configuration
   * @returns Provider instance
   */
  static createProvider(config: NotificationSingleProviderConfig): INotificationProvider {
    const service = { createProvider: (this as any).prototype.createProvider.bind(this) };
    return service.createProvider(config);
  }

  /**
   * Log a message if logger is available
   */
  private log(level: 'info' | 'warn' | 'error', message: string, meta?: any): void {
    if (this.logger) {
      this.logger[level](message, meta);
    }
  }
}
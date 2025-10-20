/**
 * Apple Push Notification Service (APNS) adapter
 * @module notification/adapters/apns
 */

import {
  INotificationProvider,
  NotificationProvider,
  NotificationSendConfig,
  NotificationSendResult,
  NotificationHealthInfo,
  NotificationMessage,
  APNSConfig
} from '../types';
import {
  NotificationError,
  NotificationConfigError,
  NotificationTokenError,
  NotificationAuthError,
  NotificationServiceUnavailableError,
  NotificationNetworkError,
  NotificationTimeoutError
} from '../errors';
import { validateNotificationSendConfig } from '../validation';

/**
 * Apple Push Notification Service provider implementation
 */
export class APNSProvider implements INotificationProvider {
  readonly name = NotificationProvider.APNS;

  private provider: any = null;
  private config: Required<APNSConfig>;

  constructor(config: APNSConfig) {
    this.config = {
      environment: config.environment || 'development',
      teamId: config.teamId || process.env.APNS_TEAM_ID || '',
      keyId: config.keyId || process.env.APNS_KEY_ID || '',
      bundleId: config.bundleId,
      privateKey: config.privateKey || process.env.APNS_PRIVATE_KEY || '',
      privateKeyPath: config.privateKeyPath || process.env.APNS_PRIVATE_KEY_PATH || '',
      certificate: config.certificate || process.env.APNS_CERTIFICATE || '',
      certificatePath: config.certificatePath || process.env.APNS_CERTIFICATE_PATH || '',
      connectionTimeout: config.connectionTimeout || 5000,
      tokenRefreshInterval: config.tokenRefreshInterval || 3600
    };

    this.initializeAPNS();
  }

  /**
   * Initialize APNS provider
   */
  private initializeAPNS(): void {
    try {
      // Dynamic import to make apn optional
      const apn = require('@parse/node-apn');

      // Create provider configuration
      const providerOptions: any = {
        production: this.config.environment === 'production',
        token: {
          key: this.getPrivateKey(),
          keyId: this.config.keyId,
          teamId: this.config.teamId
        },
        connectionTimeout: this.config.connectionTimeout
      };

      // Use certificate if provided
      if (this.getCertificate()) {
        providerOptions.cert = this.getCertificate();
        delete providerOptions.token;
      }

      this.provider = new apn.Provider(providerOptions);
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new NotificationConfigError(
          'Install @parse/node-apn package: npm install @parse/node-apn',
          NotificationProvider.APNS
        );
      }
      throw new NotificationConfigError(
        `Failed to initialize APNS: ${error.message}`,
        NotificationProvider.APNS
      );
    }
  }

  /**
   * Get private key from various sources
   */
  private getPrivateKey(): string {
    if (this.config.privateKey) {
      return this.config.privateKey;
    }

    if (this.config.privateKeyPath) {
      try {
        const fs = require('fs');
        return fs.readFileSync(this.config.privateKeyPath, 'utf8');
      } catch (error: any) {
        throw new NotificationConfigError(
          `Failed to read private key file: ${error.message}`,
          NotificationProvider.APNS
        );
      }
    }

    throw new NotificationConfigError(
      'Private key or private key path is required for APNS',
      NotificationProvider.APNS
    );
  }

  /**
   * Get certificate from various sources
   */
  private getCertificate(): string | undefined {
    if (this.config.certificate) {
      return this.config.certificate;
    }

    if (this.config.certificatePath) {
      try {
        const fs = require('fs');
        return fs.readFileSync(this.config.certificatePath, 'utf8');
      } catch (error: any) {
        throw new NotificationConfigError(
          `Failed to read certificate file: ${error.message}`,
          NotificationProvider.APNS
        );
      }
    }

    return undefined;
  }

  /**
   * Convert internal notification message to APNS message format
   */
  private convertToAPNSMessage(message: NotificationMessage): any {
    const aps: any = {
      alert: {
        title: message.title,
        body: message.body,
      },
      badge: message.badge,
      sound: message.sound === undefined ? 'default' : message.silent ? undefined : message.sound,
      category: message.category,
    };

    // Add iOS-specific options
    if (message.ios) {
      if (message.ios.contentAvailable) {
        aps['content-available'] = 1;
      }
      if (message.ios.mutableContent) {
        aps['mutable-content'] = 1;
      }
      if (message.ios.threadId) {
        aps['thread-id'] = message.ios.threadId;
      }
      if (message.ios.targetContentId) {
        aps['target-content-id'] = message.ios.targetContentId;
      }
      if (message.ios.payload) {
        Object.assign(aps, message.ios.payload);
      }
    }

    // Build notification payload
    const payload: any = {
      aps,
    };

    // Add custom data
    if (message.data) {
      Object.assign(payload, message.data);
    }

    // Create notification object
    const notification: any = {
      payload,
      topic: this.config.bundleId,
    };

    // Add priority if specified
    if (message.priority !== undefined) {
      notification.priority = message.priority <= 3 ? 10 : 5;
    }

    // Add expiration if specified
    if (message.ttl !== undefined) {
      notification.expiration = Math.floor(Date.now() / 1000) + message.ttl;
    }

    // Add collapse ID for grouping
    if (message.web?.tag) {
      notification.collapseId = message.web.tag;
    }

    return notification;
  }

  /**
   * Send notifications using APNS
   */
  async send(config: NotificationSendConfig): Promise<NotificationSendResult[]> {
    validateNotificationSendConfig(config, this.name);

    const messages = 'message' in config ? [config.message] : config.messages;
    const results: NotificationSendResult[] = [];

    for (const message of messages) {
      if (!message) continue;

      // Filter out WebPushSubscription objects - APNS only accepts string tokens
      const tokens = Array.isArray(message.to)
        ? message.to.filter(token => typeof token === 'string')
        : typeof message.to === 'string'
        ? [message.to]
        : [];

      if (tokens.length === 0) {
        // No valid string tokens for APNS
        const error = 'No valid device tokens found for APNS';
        results.push({
          success: false,
          error,
          provider: this.name,
          timestamp: new Date()
        });
        continue;
      }

      const apnsMessage = this.convertToAPNSMessage(message);

      try {
        const apnsResults = await this.sendToTokens(tokens, apnsMessage);

        for (const apnsResult of apnsResults) {
          results.push({
            success: !apnsResult.error,
            messageId: apnsResult.device,
            error: apnsResult.error ? this.mapAPNSError(apnsResult.error) : undefined,
            provider: this.name,
            timestamp: new Date()
          });
        }
      } catch (error: any) {
        // If it's a global error (like network issue), apply to all tokens
        for (const token of tokens) {
          results.push({
            success: false,
            error: this.mapAPNSError(error),
            provider: this.name,
            timestamp: new Date()
          });
        }
      }
    }

    return results;
  }

  /**
   * Send notification to multiple tokens
   */
  private async sendToTokens(tokens: string[], notification: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      this.provider.send(notification, tokens).then((response: any) => {
        response.sent.forEach((token: string) => {
          results.push({ device: token });
        });

        response.failed.forEach((failure: any) => {
          results.push({
            device: failure.device,
            error: failure.response || failure.error || 'Unknown error'
          });
        });

        resolve(results);
      }).catch((error: any) => {
        reject(error);
      });
    });
  }

  /**
   * Map APNS errors to readable messages
   */
  private mapAPNSError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.reason) {
      // APNS specific error codes
      switch (error.reason) {
        case 'BadDeviceToken':
          return 'Invalid device token';
        case 'DeviceTokenNotForTopic':
          return 'Device token not for this topic';
        case 'MissingDeviceToken':
          return 'Missing device token';
        case 'BadTopic':
          return 'Invalid topic';
        case 'TopicDisallowed':
          return 'Topic disallowed';
        case 'BadMessageId':
          return 'Invalid message ID';
        case 'BadExpirationDate':
          return 'Invalid expiration date';
        case 'BadPriority':
          return 'Invalid priority';
        case 'MissingTopic':
          return 'Missing topic';
        case 'PayloadEmpty':
          return 'Payload is empty';
        case 'PayloadTooLarge':
          return 'Payload too large';
        case 'BadCertificate':
          return 'Invalid certificate';
        case 'BadCertificateEnvironment':
          return 'Certificate environment mismatch';
        case 'ExpiredProviderToken':
          return 'Expired provider token';
        case 'InvalidProviderToken':
          return 'Invalid provider token';
        case 'MissingProviderToken':
          return 'Missing provider token';
        case 'BadPath':
          return 'Invalid path';
        case 'MethodNotAllowed':
          return 'Method not allowed';
        case 'TooManyRequests':
          return 'Too many requests';
        case 'IdleTimeout':
          return 'Connection idle timeout';
        case 'Shutdown':
          return 'Server shutdown';
        case 'InternalServerError':
          return 'Internal server error';
        case 'ServiceUnavailable':
          return 'Service unavailable';
        case 'Unregistered':
          return 'Device unregistered';
        default:
          return error.reason;
      }
    }

    if (error.code) {
      // Network or connection errors
      switch (error.code) {
        case 'ECONNREFUSED':
          return 'Connection refused';
        case 'ETIMEDOUT':
          return 'Connection timeout';
        case 'ENOTFOUND':
          return 'Host not found';
        case 'ECONNRESET':
          return 'Connection reset';
        case 'EAI_AGAIN':
          return 'DNS lookup failed';
        default:
          return error.code;
      }
    }

    return error.message || 'Unknown APNS error';
  }

  /**
   * Check APNS health status
   */
  async health(): Promise<NotificationHealthInfo> {
    try {
      if (!this.provider) {
        return {
          ok: false,
          message: 'APNS provider not initialized'
        };
      }

      // Try to send a test notification to an invalid token
      // This will validate our credentials but won't actually deliver a notification
      const testNotification = {
        payload: {
          aps: {
            alert: {
              title: 'Health Check',
              body: 'Health Check'
            }
          }
        },
        topic: this.config.bundleId
      };

      await new Promise<void>((resolve, reject) => {
        this.provider.send(testNotification, 'invalid-test-token')
          .then(() => resolve())
          .catch((error: any) => {
            // Some errors are expected for an invalid token
            if (error.reason === 'BadDeviceToken' || error.reason === 'DeviceTokenNotForTopic') {
              resolve(); // Success - our credentials work
            } else {
              reject(error);
            }
          });
      });

      return {
        ok: true,
        message: 'APNS is healthy',
        details: {
          bundleId: this.config.bundleId,
          environment: this.config.environment,
          teamId: this.config.teamId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      if (error.reason === 'BadCertificate' || error.reason === 'InvalidProviderToken') {
        return {
          ok: false,
          message: 'Authentication failed',
          details: { error: error.message }
        };
      }

      if (error.reason === 'ServiceUnavailable' || error.code === 'ECONNREFUSED') {
        return {
          ok: false,
          message: 'APNS service unavailable',
          details: { error: error.message }
        };
      }

      return {
        ok: false,
        message: 'Health check failed',
        details: { error: error.message }
      };
    }
  }

  /**
   * Shutdown the APNS provider
   */
  shutdown(): void {
    if (this.provider) {
      this.provider.shutdown();
      this.provider = null;
    }
  }
}
/**
 * Web Push adapter
 * @module notification/adapters/web-push
 */

import {
  INotificationProvider,
  NotificationProvider,
  NotificationSendConfig,
  NotificationSendResult,
  NotificationHealthInfo,
  NotificationMessage,
  WebPushConfig,
  WebPushSubscription
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
 * Web Push provider implementation
 */
export class WebPushProvider implements INotificationProvider {
  readonly name = NotificationProvider.WEB_PUSH;

  private webPush: any = null;
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private config: Required<WebPushConfig>;

  constructor(config: WebPushConfig = {}) {
    this.config = {
      publicKey: config.publicKey || process.env.WEB_PUSH_PUBLIC_KEY || '',
      privateKey: config.privateKey || process.env.WEB_PUSH_PRIVATE_KEY || '',
      subject: config.subject || process.env.WEB_PUSH_SUBJECT || '',
      email: config.email || process.env.WEB_PUSH_EMAIL || '',
      serviceWorker: config.serviceWorker || '/sw.js',
      endpoint: config.endpoint || 'https://updates.push.services.mozilla.com/wpush/v2',
      gcmApiKey: config.gcmApiKey || process.env.GCM_API_KEY || ''
    };

    this.initializeWebPush();
  }

  /**
   * Initialize Web Push library
   */
  private initializeWebPush(): void {
    try {
      // Dynamic import to make web-push optional
      this.webPush = require('web-push');

      // Set VAPID details if provided
      if (this.config.publicKey && this.config.privateKey) {
        this.vapidKeys = {
          publicKey: this.config.publicKey,
          privateKey: this.config.privateKey
        };

        const subject = this.config.subject || this.config.email;
        if (subject) {
          this.webPush.setVapidDetails(
            `mailto:${subject.startsWith('mailto:') ? subject : `mailto:${subject}`}`,
            this.vapidKeys.publicKey,
            this.vapidKeys.privateKey
          );
        }
      }

      // Set GCM API key for fallback
      if (this.config.gcmApiKey) {
        this.webPush.setGCMAPIKey(this.config.gcmApiKey);
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new NotificationConfigError(
          'Install web-push package: npm install web-push',
          NotificationProvider.WEB_PUSH
        );
      }
      throw new NotificationConfigError(
        `Failed to initialize Web Push: ${error.message}`,
        NotificationProvider.WEB_PUSH
      );
    }
  }

  /**
   * Generate VAPID keys if not provided
   */
  generateVAPIDKeys(): { publicKey: string; privateKey: string } {
    if (!this.webPush) {
      throw new NotificationConfigError(
        'Web Push not initialized',
        NotificationProvider.WEB_PUSH
      );
    }

    return this.webPush.generateVAPIDKeys();
  }

  /**
   * Convert string token to WebPushSubscription object
   */
  private parseSubscription(token: string | WebPushSubscription): WebPushSubscription {
    // If token is already a subscription object
    if (typeof token === 'object' && token.endpoint && token.keys) {
      return token;
    }

    // Handle string tokens
    if (typeof token === 'string') {
      // If token is an endpoint URL, try to parse as subscription
      if (token.startsWith('https://')) {
        throw new NotificationTokenError(
          'Web push requires subscription object with endpoint and keys, not just endpoint URL',
          token,
          NotificationProvider.WEB_PUSH
        );
      }

      // Try to parse as JSON subscription object
      try {
        const subscription = JSON.parse(token);
        if (subscription.endpoint && subscription.keys) {
          return subscription;
        }
      } catch {
        // Not JSON, continue to error
      }
    }

    throw new NotificationTokenError(
      'Invalid web push subscription format. Expected {endpoint: string, keys: {p256dh: string, auth: string}}',
      typeof token === 'string' ? token : JSON.stringify(token),
      NotificationProvider.WEB_PUSH
    );
  }

  /**
   * Convert internal notification message to Web Push payload
   */
  private convertToWebPushPayload(message: NotificationMessage): string {
    const payload: any = {
      title: message.title,
      body: message.body,
      data: message.data || {},
      tag: message.web?.tag,
      icon: message.web?.icon,
      badge: message.web?.badge,
      image: message.web?.image,
      requireInteraction: message.web?.requireInteraction,
      silent: message.silent,
      renotify: message.web?.renotify,
      dir: message.web?.dir,
      lang: message.web?.lang,
      timestamp: message.web?.timestamp || Date.now(),
      vibrate: message.web?.vibrate,
      actions: message.web?.actions
    };

    // Add platform-specific options
    if (message.android) {
      payload.android = message.android;
    }

    if (message.ios) {
      payload.ios = message.ios;
    }

    return JSON.stringify(payload);
  }

  /**
   * Create Web Push options
   */
  private createWebPushOptions(message: NotificationMessage): any {
    const options: any = {
      TTL: message.ttl,
      urgency: this.getWebPushUrgency(message.priority),
      contentEncoding: 'aes128gcm'
    };

    // Add VAPID if configured
    if (this.vapidKeys) {
      options.vapidDetails = {
        subject: this.config.subject || this.config.email,
        publicKey: this.vapidKeys.publicKey,
        privateKey: this.vapidKeys.privateKey
      };
    }

    // Add headers if needed
    if (message.web?.tag) {
      options.topic = message.web.tag;
    }

    return options;
  }

  /**
   * Convert priority to Web Push urgency
   */
  private getWebPushUrgency(priority?: number): 'high' | 'normal' | 'low' {
    if (priority === undefined) return 'normal';
    if (priority <= 2) return 'high';
    if (priority <= 7) return 'normal';
    return 'low';
  }

  /**
   * Send notifications using Web Push
   */
  async send(config: NotificationSendConfig): Promise<NotificationSendResult[]> {
    validateNotificationSendConfig(config, this.name);

    const messages = 'message' in config ? [config.message] : config.messages;
    const results: NotificationSendResult[] = [];

    for (const message of messages) {
      if (!message) continue;

      const tokens = Array.isArray(message.to) ? message.to : [message.to];
      const payload = this.convertToWebPushPayload(message);
      const options = this.createWebPushOptions(message);

      for (const token of tokens) {
        try {
          const subscription = this.parseSubscription(token);
          const result = await this.webPush.sendNotification(
            subscription,
            payload,
            options
          );

          results.push({
            success: true,
            messageId: result,
            provider: this.name,
            timestamp: new Date()
          });
        } catch (error: any) {
          results.push({
            success: false,
            error: this.mapWebPushError(error),
            provider: this.name,
            timestamp: new Date()
          });
        }
      }
    }

    return results;
  }

  /**
   * Map Web Push errors to readable messages
   */
  private mapWebPushError(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.statusCode) {
      switch (error.statusCode) {
        case 400:
          return 'Invalid request (bad payload or headers)';
        case 401:
          return 'Unauthorized (invalid VAPID keys)';
        case 403:
          return 'Forbidden (origin not allowed)';
        case 404:
          return 'Not found (subscription expired or invalid)';
        case 405:
          return 'Method not allowed';
        case 406:
          return 'Not acceptable (invalid content-encoding)';
        case 410:
          return 'Gone (subscription expired)';
        case 413:
          return 'Payload too large';
        case 429:
          return 'Too many requests (rate limited)';
        case 500:
          return 'Internal server error';
        case 503:
          return 'Service unavailable';
        default:
          return `HTTP ${error.statusCode}: ${error.body || 'Unknown error'}`;
      }
    }

    if (error.code) {
      // Network or system errors
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

    if (error.message) {
      return error.message;
    }

    return 'Unknown Web Push error';
  }

  /**
   * Check Web Push health status
   */
  async health(): Promise<NotificationHealthInfo> {
    try {
      if (!this.webPush) {
        return {
          ok: false,
          message: 'Web Push not initialized'
        };
      }

      // Create a test subscription (this won't actually send)
      const testSubscription: WebPushSubscription = {
        endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/test',
        keys: {
          p256dh: 'BMfFTqVRgjGk9d-3x3aI1vYz9xv9k-8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f',
          auth: 'v9k8j7h6g5f4d3e2c1b0a9z8y7x6w5v4u3t2s1r0q'
        }
      };

      const testPayload = JSON.stringify({
        title: 'Health Check',
        body: 'Health Check',
        icon: '/favicon.ico'
      });

      // Try to send a test notification
      await this.webPush.sendNotification(
        testSubscription,
        testPayload,
        {
          TTL: 0,
          urgency: 'low'
        }
      );

      return {
        ok: true,
        message: 'Web Push is healthy',
        details: {
          hasVapidKeys: !!this.vapidKeys,
          vapidSubject: this.config.subject || this.config.email,
          hasGCMApiKey: !!this.config.gcmApiKey,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      if (error.statusCode === 401) {
        return {
          ok: false,
          message: 'Authentication failed (invalid VAPID keys)',
          details: { error: error.message }
        };
      }

      if (error.statusCode === 403) {
        return {
          ok: false,
          message: 'Origin not authorized for VAPID',
          details: { error: error.message }
        };
      }

      if (error.statusCode === 503 || error.code === 'ECONNREFUSED') {
        return {
          ok: false,
          message: 'Web Push service unavailable',
          details: { error: error.message }
        };
      }

      // Some errors are expected for invalid test data
      if (error.statusCode === 404 || error.statusCode === 410) {
        return {
          ok: true,
          message: 'Web Push is healthy',
          details: {
            hasVapidKeys: !!this.vapidKeys,
            vapidSubject: this.config.subject || this.config.email,
            hasGCMApiKey: !!this.config.gcmApiKey,
            timestamp: new Date().toISOString()
          }
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
   * Get current VAPID keys
   */
  getVapidKeys(): { publicKey: string; privateKey: string } | null {
    return this.vapidKeys;
  }

  /**
   * Set VAPID keys
   */
  setVapidKeys(publicKey: string, privateKey: string, subject?: string): void {
    this.vapidKeys = { publicKey, privateKey };

    if (subject || this.config.email) {
      const subjectValue = subject || this.config.email || '';
      this.webPush.setVapidDetails(
        `mailto:${subjectValue.startsWith('mailto:') ? subjectValue : `mailto:${subjectValue}`}`,
        publicKey,
        privateKey
      );
    }
  }

  /**
   * Set GCM API key
   */
  setGCMApiKey(apiKey: string): void {
    this.config.gcmApiKey = apiKey;
    this.webPush.setGCMAPIKey(apiKey);
  }
}
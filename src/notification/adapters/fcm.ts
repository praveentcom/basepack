/**
 * Firebase Cloud Messaging (FCM) adapter
 * @module notification/adapters/fcm
 */

import {
  INotificationProvider,
  NotificationProvider,
  NotificationSendConfig,
  NotificationSendResult,
  NotificationHealthInfo,
  NotificationMessage,
  FCMConfig
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
 * Firebase Cloud Messaging provider implementation
 */
export class FCMProvider implements INotificationProvider {
  readonly name = NotificationProvider.FCM;

  private admin: any = null;
  private app: any = null;
  private config: Required<FCMConfig>;

  constructor(config: FCMConfig = {}) {
    this.config = {
      projectId: config.projectId || process.env.FIREBASE_PROJECT_ID || '',
      serviceAccount: config.serviceAccount || {},
      serviceAccountPath: config.serviceAccountPath || process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
      apiKey: config.apiKey || process.env.FIREBASE_API_KEY || '',
      endpoint: config.endpoint || 'https://fcm.googleapis.com/fcm/send'
    };

    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      // Dynamic import to make firebase-admin optional
      const { initializeApp, cert } = require('firebase-admin/app');
      const { getMessaging } = require('firebase-admin/messaging');

      // Use service account from file
      if (this.config.serviceAccountPath) {
        const serviceAccount = require(this.config.serviceAccountPath);
        this.app = initializeApp({
          credential: cert(serviceAccount)
        });
      }
      // Use service account object
      else if (Object.keys(this.config.serviceAccount).length > 0) {
        this.app = initializeApp({
          credential: cert(this.config.serviceAccount)
        });
      }
      // Use application default credentials
      else {
        this.app = initializeApp();
      }

      this.admin = getMessaging(this.app);
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        throw new NotificationConfigError(
          'Install firebase-admin package: npm install firebase-admin',
          NotificationProvider.FCM
        );
      }
      throw new NotificationConfigError(
        `Failed to initialize Firebase: ${error.message}`,
        NotificationProvider.FCM
      );
    }
  }

  /**
   * Convert internal notification message to FCM message format
   */
  private convertToFCMMessage(message: NotificationMessage): any {
    const fcmMessage: any = {
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.web?.image,
      },
      data: message.data || {},
      android: message.android ? {
        notification: {
          sound: message.sound,
          titleLocKey: undefined,
          bodyLocKey: undefined,
          titleLocArgs: undefined,
          bodyLocArgs: undefined,
          clickAction: message.android.clickAction,
          color: message.android.color,
          tag: message.web?.tag,
          imageUrl: message.web?.image,
        },
        priority: this.getFCMPriority(message.priority),
        ttl: message.ttl ? `${message.ttl}s` : undefined,
        restrictedPackageName: undefined,
        data: message.android.payload || {},
        fcmOptions: {},
        directBootOk: false,
      } : undefined,
      apns: message.ios ? {
        headers: {
          'apns-priority': this.getAPNSPriority(message.priority),
          'apns-expiration': message.ttl ? String(Math.floor(Date.now() / 1000) + message.ttl) : undefined,
        },
        payload: {
          aps: {
            badge: message.badge,
            sound: message.sound,
            category: message.category,
            'content-available': message.ios.contentAvailable ? 1 : undefined,
            'mutable-content': message.ios.mutableContent ? 1 : undefined,
            threadId: message.ios.threadId,
            'target-content-id': message.ios.targetContentId,
            alert: {
              title: message.title,
              body: message.body,
              'title-loc-key': undefined,
              'body-loc-key': undefined,
              'title-loc-args': undefined,
              'body-loc-args': undefined,
              'launch-image': undefined,
            },
          },
          ...message.ios.payload,
        },
      } : undefined,
      webpush: message.web ? {
        headers: {
          TTL: message.ttl ? String(message.ttl) : undefined,
          Urgency: this.getWebPushUrgency(message.priority),
          Topic: undefined,
        },
        notification: {
          title: message.title,
          body: message.body,
          icon: message.web.icon,
          image: message.web.image,
          badge: message.web.badge,
          data: message.web.data,
          tag: message.web.tag,
          requireInteraction: message.web.requireInteraction,
          silent: message.silent,
          actions: message.web.actions,
          vibrate: message.web.vibrate,
          timestamp: message.web.timestamp,
          dir: message.web.dir,
          lang: message.web.lang,
          renotify: message.web.renotify,
        },
        data: message.data || {},
        fcmOptions: {
          link: message.android?.clickAction,
        },
      } : undefined,
    };

    return fcmMessage;
  }

  /**
   * Convert priority to FCM priority level
   */
  private getFCMPriority(priority?: number): 'high' | 'normal' {
    if (priority === undefined) return 'normal';
    return priority <= 3 ? 'high' : 'normal';
  }

  /**
   * Convert priority to APNS priority level
   */
  private getAPNSPriority(priority?: number): '10' | '5' {
    if (priority === undefined) return '5';
    return priority <= 3 ? '10' : '5';
  }

  /**
   * Convert priority to Web Push urgency
   */
  private getWebPushUrgency(priority?: number): 'high' | 'normal' | 'low' | 'very-low' {
    if (priority === undefined) return 'normal';
    if (priority <= 2) return 'high';
    if (priority <= 5) return 'normal';
    if (priority <= 8) return 'low';
    return 'very-low';
  }

  /**
   * Send notifications using Firebase Admin SDK
   */
  async send(config: NotificationSendConfig): Promise<NotificationSendResult[]> {
    validateNotificationSendConfig(config, this.name);

    const messages = 'message' in config ? [config.message] : config.messages;
    const results: NotificationSendResult[] = [];

    for (const message of messages) {
      if (!message) continue;

      // Filter out WebPushSubscription objects - FCM only accepts string tokens
      const tokens = Array.isArray(message.to)
        ? message.to.filter(token => typeof token === 'string')
        : typeof message.to === 'string'
        ? message.to
        : null;

      if (!tokens || (Array.isArray(tokens) && tokens.length === 0)) {
        results.push({
          success: false,
          error: 'No valid device tokens found for FCM',
          provider: this.name,
          timestamp: new Date()
        });
        continue;
      }

      try {
        const fcmMessage = this.convertToFCMMessage(message);
        const fcmResult = await this.sendSingleMessage(tokens, fcmMessage);

        results.push({
          success: true,
          messageId: fcmResult,
          provider: this.name,
          timestamp: new Date()
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: this.mapFCMError(error),
          provider: this.name,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Send a single message
   */
  private async sendSingleMessage(to: string | string[], fcmMessage: any): Promise<string> {
    if (Array.isArray(to)) {
      // Multicast message
      const multicastResult = await this.admin.sendMulticast({
        ...fcmMessage,
        tokens: to
      });
      return multicastResult.multicastId.toString();
    } else {
      // Single message
      const result = await this.admin.send({
        ...fcmMessage,
        token: to
      });
      return result;
    }
  }

  /**
   * Map FCM errors to NotificationError types
   */
  private mapFCMError(error: any): string {
    if (error.code === 'messaging/registration-token-not-registered') {
      return 'Device token not registered';
    }
    if (error.code === 'messaging/invalid-registration-token') {
      return 'Invalid device token';
    }
    if (error.code === 'messaging/invalid-argument') {
      return 'Invalid argument';
    }
    if (error.code === 'messaging/quota-exceeded') {
      return 'Quota exceeded';
    }
    if (error.code === 'messaging/sender-id-mismatch') {
      return 'Sender ID mismatch';
    }
    if (error.code === 'messaging/unavailable') {
      return 'FCM service unavailable';
    }
    if (error.code === 'messaging/internal-error') {
      return 'FCM internal error';
    }
    if (error.code === 'messaging/invalid-apns-credentials') {
      return 'Invalid APNS credentials';
    }
    if (error.code === 'messaging/invalid-credentials') {
      return 'Invalid Firebase credentials';
    }
    if (error.code === 'messaging/payload-size-limit-exceeded') {
      return 'Payload size limit exceeded';
    }
    if (error.code === 'messaging/authentication-error') {
      return 'Authentication error';
    }
    if (error.code === 'messaging/permission-denied') {
      return 'Permission denied';
    }
    if (error.code === 'messaging/third-party-auth-error') {
      return 'Third party authentication error';
    }
    if (error.code === 'messaging/server-unavailable') {
      return 'Server unavailable';
    }
    if (error.code === 'messaging/unknown-error') {
      return 'Unknown error';
    }

    return error.message || 'Unknown error';
  }

  /**
   * Check FCM health status
   */
  async health(): Promise<NotificationHealthInfo> {
    try {
      if (!this.admin) {
        return {
          ok: false,
          message: 'Firebase Admin SDK not initialized'
        };
      }

      // Try to send a test message to an invalid token to check connectivity
      // This will validate our credentials but won't actually send a notification
      await this.admin.send({
        token: 'invalid-test-token',
        notification: {
          title: 'Health Check',
          body: 'Health Check'
        }
      });
    } catch (error: any) {
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        // These errors are expected for an invalid token - means auth is working
        return {
          ok: true,
          message: 'FCM is healthy',
          details: {
            projectId: this.config.projectId,
            timestamp: new Date().toISOString()
          }
        };
      }

      if (error.code === 'messaging/authentication-error' ||
          error.code === 'messaging/invalid-credentials') {
        return {
          ok: false,
          message: 'Authentication failed',
          details: { error: error.message }
        };
      }

      if (error.code === 'messaging/unavailable' ||
          error.code === 'messaging/server-unavailable') {
        return {
          ok: false,
          message: 'FCM service unavailable',
          details: { error: error.message }
        };
      }

      return {
        ok: false,
        message: 'Health check failed',
        details: { error: error.message }
      };
    }

    return {
      ok: true,
      message: 'FCM is healthy',
      details: {
        projectId: this.config.projectId,
        timestamp: new Date().toISOString()
      }
    };
  }
}
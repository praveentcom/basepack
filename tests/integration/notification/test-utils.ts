/**
 * Test utilities for notification service integration tests
 * @module tests/integration/notification/test-utils
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { test } from '@jest/globals';
import {
	NotificationMessage,
	NotificationProvider,
} from '../../../src/notification/types';
import {
  WebPushSubscription
} from '../../../src/notification/adapters';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', 'test.env') });

/**
 * Get test notification message
 */
export function getTestNotification(
	overrides: Partial<NotificationMessage> = {}
): NotificationMessage {
	return {
		to: getTestDeviceToken(),
		title: `Integration Test - ${new Date().toISOString()}`,
		body: 'This is a test notification from Basepack integration tests',
		data: {
			testId: generateTestId(),
			source: 'basepack-integration-test',
			timestamp: Date.now().toString(),
		},
		...overrides,
	};
}

/**
 * Get test iOS notification message
 */
export function getTestIosNotification(
	overrides: Partial<NotificationMessage> = {}
): NotificationMessage {
	return getTestNotification({
		to: getTestIosToken(),
		ios: {
			contentAvailable: false,
			mutableContent: true,
			threadId: 'test-thread',
			...overrides.ios,
		},
		...overrides,
	});
}

/**
 * Get test Android notification message
 */
export function getTestAndroidNotification(
	overrides: Partial<NotificationMessage> = {}
): NotificationMessage {
	return getTestNotification({
		to: getTestAndroidToken(),
		android: {
			channelId: 'test-channel',
			smallIcon: 'ic_notification',
			color: '#FF5722',
			priority: 'high',
			...overrides.android,
		},
		...overrides,
	});
}

/**
 * Get test web push notification message
 */
export function getTestWebPushNotification(
	overrides: Partial<NotificationMessage> = {}
): NotificationMessage {
	return getTestNotification({
		to: JSON.stringify(getTestWebPushSubscription()),
		web: {
			icon: 'https://example.com/icon.png',
			badge: 'https://example.com/badge.png',
			tag: 'test-notification',
			requireInteraction: true,
			...overrides.web,
		},
		...overrides,
	});
}

/**
 * Get test device token based on provider
 */
export function getTestDeviceToken(provider?: NotificationProvider): string {
	switch (provider) {
		case NotificationProvider.FCM:
			return getTestAndroidToken();
		case NotificationProvider.APNS:
			return getTestIosToken();
		case NotificationProvider.WEB_PUSH:
			return JSON.stringify(getTestWebPushSubscription());
		default:
			return process.env.TEST_DEVICE_TOKEN || 'test-device-token';
	}
}

/**
 * Get test iOS device token
 */
export function getTestIosToken(): string {
	return (
		process.env.TEST_IOS_TOKEN ||
		'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
	);
}

/**
 * Get test Android device token
 */
export function getTestAndroidToken(): string {
	return (
		process.env.TEST_ANDROID_TOKEN ||
		'fcm_token_test_1234567890abcdefghijklmnopqrstuvwxyz'
	);
}

/**
 * Get test web push subscription
 */
export function getTestWebPushSubscription(): WebPushSubscription {
	const subscription: WebPushSubscription = {
		endpoint:
			process.env.TEST_WEB_PUSH_ENDPOINT ||
			'https://fcm.googleapis.com/fcm/send/test-token',
		keys: {
			p256dh:
				process.env.TEST_WEB_PUSH_P256DH ||
				'BMfFTqVRgjGk9d-3x3aI1vYz9xv9k-8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d1e0f',
			auth:
				process.env.TEST_WEB_PUSH_AUTH ||
				'v9k8j7h6g5f4d3e2c1b0a9z8y7x6w5v4u3t2s1r0q',
		},
	};
	return subscription;
}

/**
 * Generate unique test ID
 */
export function generateTestId(): string {
	return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get Firebase configuration
 */
export function getFirebaseConfig() {
	return {
		projectId: process.env.FIREBASE_PROJECT_ID,
		serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT
			? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
			: undefined,
		serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
		apiKey: process.env.FIREBASE_API_KEY,
	};
}

/**
 * Get APNS configuration
 */
export function getApnsConfig() {
	return {
		environment:
			(process.env.APNS_ENVIRONMENT as 'development' | 'production') ||
			'development',
		teamId: process.env.APNS_TEAM_ID,
		keyId: process.env.APNS_KEY_ID,
		bundleId: process.env.APNS_BUNDLE_ID || 'com.example.testapp',
		privateKey: process.env.APNS_PRIVATE_KEY,
		privateKeyPath: process.env.APNS_PRIVATE_KEY_PATH,
		certificate: process.env.APNS_CERTIFICATE,
		certificatePath: process.env.APNS_CERTIFICATE_PATH,
	};
}

/**
 * Get Web Push configuration
 */
export function getWebPushConfig() {
	return {
		publicKey: process.env.WEB_PUSH_PUBLIC_KEY,
		privateKey: process.env.WEB_PUSH_PRIVATE_KEY,
		subject: process.env.WEB_PUSH_SUBJECT || process.env.WEB_PUSH_EMAIL,
		email: process.env.WEB_PUSH_EMAIL,
		serviceWorker: process.env.WEB_PUSH_SERVICE_WORKER || '/sw.js',
		gcmApiKey: process.env.GCM_API_KEY,
	};
}

/**
 * Wait for notification to be processed
 */
export async function waitForNotification(
	timeoutMs: number = 10000
): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

/**
 * Create test batch notifications
 */
export function createTestBatchNotifications(
	count: number,
	baseMessage?: Partial<NotificationMessage>
): NotificationMessage[] {
	return Array.from({ length: count }, (_, index) =>
		getTestNotification({
			title: `Test Notification ${index + 1}`,
			body: `This is test notification ${index + 1} in a batch`,
			data: {
				...baseMessage?.data,
				batchIndex: (index + 1).toString(),
				batchSize: count.toString(),
			},
			...baseMessage,
		})
	);
}

/**
 * Validate test results
 */
export function validateTestResults(
	results: any[],
	expectedCount: number
): void {
	expect(results).toHaveLength(expectedCount);

	// Check that at least one result succeeded
	const successCount = results.filter((r) => r.success).length;
	expect(successCount).toBeGreaterThan(0);

	// Validate result structure
	results.forEach((result) => {
		expect(result).toHaveProperty('success');
		expect(result).toHaveProperty('provider');
		expect(result).toHaveProperty('timestamp');

		if (result.success) {
			expect(result.messageId).toBeDefined();
		} else {
			expect(result.error).toBeDefined();
		}
	});
}

/**
 * Test provider health
 */
export async function testProviderHealth(
	service: any,
	providerName: string
): Promise<void> {
	const healthResults = await service.health();
	expect(healthResults).toHaveProperty(providerName);

	const health = healthResults[providerName];
	expect(health).toHaveProperty('ok');
	expect(health).toHaveProperty('message');

	if (!health.ok) {
		console.warn(
			`Provider ${providerName} health check failed: ${health.message}`
		);
	}
}

/**
 * Check if required credentials are configured
 * 
 * @param provider - Notification provider name
 * @param requiredEnvVars - Array of required environment variable names
 * @returns True if credentials are configured, false otherwise
 */
export const hasCredentials = (provider: string, requiredEnvVars: string[]): boolean => {
	const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
	
	if (missingVars.length > 0) {
		console.warn(`Skipping ${provider} integration tests - missing environment variables: ${missingVars.join(', ')}`);
		return false;
	}
	
	return true;
};

/**
 * Provider-specific credential checkers
 */
export const credentialCheckers = {
	fcm: () => hasCredentials('FCM', ['FIREBASE_PROJECT_ID']),
	apns: () => hasCredentials('APNS', ['APNS_BUNDLE_ID']),
	'web-push': () => hasCredentials('Web Push', ['WEB_PUSH_PUBLIC_KEY', 'WEB_PUSH_PRIVATE_KEY']),
};

/**
 * Messaging validation utilities
 * @module messaging/validation
 */

import { SMSMessage, WhatsAppMessage, RCSMessage } from './types';
import { MessagingValidationError } from './errors';

/**
 * E.164 phone number validation regex.
 * Format: +[country code][subscriber number]
 * - Must start with +
 * - Country code: 1-3 digits (first digit 1-9)
 * - Subscriber number: up to 14 digits total
 * 
 * Examples:
 * - +14155552671 (US)
 * - +442071838750 (UK)
 * - +81312345678 (Japan)
 */
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * WhatsApp number regex (allows 'whatsapp:' prefix).
 * Supports both formats:
 * - whatsapp:+14155552671
 * - +14155552671
 */
const WHATSAPP_REGEX = /^(whatsapp:)?\+[1-9]\d{1,14}$/;

/**
 * Validates if a phone number is in E.164 format.
 * 
 * E.164 is the international telephone numbering plan that ensures each device
 * on the PSTN has a globally unique number.
 * 
 * @param phone - Phone number to validate
 * @returns `true` if the phone number is valid E.164 format, `false` otherwise
 * 
 * @example
 * ```typescript
 * isValidE164Phone('+14155552671'); // true
 * isValidE164Phone('+442071838750'); // true
 * isValidE164Phone('14155552671'); // false (missing +)
 * isValidE164Phone('+1 415 555 2671'); // false (contains spaces)
 * ```
 */
export function isValidE164Phone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return E164_REGEX.test(phone.trim());
}

/**
 * Validates if a WhatsApp number is in valid format.
 * 
 * WhatsApp numbers can have an optional 'whatsapp:' prefix.
 * 
 * @param phone - WhatsApp number to validate
 * @returns `true` if the WhatsApp number is valid, `false` otherwise
 * 
 * @example
 * ```typescript
 * isValidWhatsAppPhone('whatsapp:+14155552671'); // true
 * isValidWhatsAppPhone('+14155552671'); // true
 * isValidWhatsAppPhone('whatsapp:14155552671'); // false (missing +)
 * ```
 */
export function isValidWhatsAppPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  return WHATSAPP_REGEX.test(phone.trim());
}

/**
 * Extracts the E.164 phone number from a WhatsApp-formatted number.
 * 
 * @param phone - WhatsApp number (with or without prefix)
 * @returns E.164 formatted phone number
 * 
 * @example
 * ```typescript
 * extractE164FromWhatsApp('whatsapp:+14155552671'); // '+14155552671'
 * extractE164FromWhatsApp('+14155552671'); // '+14155552671'
 * ```
 */
export function extractE164FromWhatsApp(phone: string): string {
  return phone.replace(/^whatsapp:/, '');
}

/**
 * Validates a phone number and throws if invalid.
 * 
 * @param phone - Phone number to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws {MessagingValidationError} If the phone number format is invalid
 * 
 * @example
 * ```typescript
 * validatePhone('+14155552671', 'from'); // OK
 * validatePhone('14155552671', 'from'); // throws MessagingValidationError
 * ```
 */
export function validatePhone(phone: string, fieldName: string = 'phone'): void {
  if (!phone) {
    throw new MessagingValidationError(
      `${fieldName} is required`,
      fieldName
    );
  }
  
  if (!isValidE164Phone(phone)) {
    throw new MessagingValidationError(
      `Invalid phone number in ${fieldName}: ${phone}. Phone numbers must be in E.164 format (e.g., +14155552671)`,
      fieldName
    );
  }
}

/**
 * Validates a WhatsApp phone number and throws if invalid.
 * 
 * @param phone - WhatsApp number to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws {MessagingValidationError} If the WhatsApp number format is invalid
 * 
 * @example
 * ```typescript
 * validateWhatsAppPhone('whatsapp:+14155552671', 'from'); // OK
 * validateWhatsAppPhone('+14155552671', 'from'); // OK
 * validateWhatsAppPhone('14155552671', 'from'); // throws MessagingValidationError
 * ```
 */
export function validateWhatsAppPhone(phone: string, fieldName: string = 'phone'): void {
  if (!phone) {
    throw new MessagingValidationError(
      `${fieldName} is required`,
      fieldName
    );
  }
  
  if (!isValidWhatsAppPhone(phone)) {
    throw new MessagingValidationError(
      `Invalid WhatsApp number in ${fieldName}: ${phone}. Numbers must be in E.164 format, optionally prefixed with 'whatsapp:' (e.g., whatsapp:+14155552671)`,
      fieldName
    );
  }
}

/**
 * Validates an SMS message object.
 * 
 * Performs comprehensive validation including:
 * - Required fields (from, to, body)
 * - Phone number formats (E.164)
 * - Body content length
 * - Media URLs format (if present)
 * 
 * @param message - SMS message to validate
 * @throws {MessagingValidationError} If any validation check fails
 * 
 * @example
 * ```typescript
 * const message: SMSMessage = {
 *   from: '+14155552671',
 *   to: '+14155552672',
 *   body: 'Hello!'
 * };
 * 
 * validateSMSMessage(message); // OK
 * 
 * // Missing required field
 * validateSMSMessage({ from: '+14155552671' }); // throws MessagingValidationError
 * ```
 */
export function validateSMSMessage(message: SMSMessage): void {
  // Validate required fields
  if (!message.from) {
    throw new MessagingValidationError('From phone number is required', 'from');
  }
  validatePhone(message.from, 'from');

  if (!message.to) {
    throw new MessagingValidationError('To phone number is required', 'to');
  }
  validatePhone(message.to, 'to');

  if (!message.body) {
    throw new MessagingValidationError('Message body is required', 'body');
  }

  if (typeof message.body !== 'string') {
    throw new MessagingValidationError('Message body must be a string', 'body');
  }

  // SMS body length limit (160 characters for single SMS, but providers handle segmentation)
  // We'll use a more generous limit of 1600 characters (10 segments)
  if (message.body.length > 1600) {
    throw new MessagingValidationError(
      'Message body exceeds maximum length of 1600 characters',
      'body'
    );
  }

  // Validate media URLs if present
  if (message.mediaUrls) {
    if (!Array.isArray(message.mediaUrls)) {
      throw new MessagingValidationError('Media URLs must be an array', 'mediaUrls');
    }

    for (const [index, url] of message.mediaUrls.entries()) {
      if (typeof url !== 'string') {
        throw new MessagingValidationError(
          `Media URL at index ${index} must be a string`,
          'mediaUrls'
        );
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        throw new MessagingValidationError(
          `Invalid media URL at index ${index}: ${url}`,
          'mediaUrls'
        );
      }
    }
  }
}

/**
 * Validates a WhatsApp message object.
 * 
 * Performs comprehensive validation including:
 * - Required fields (from, to, body or templateName)
 * - WhatsApp number formats
 * - Template configuration
 * - Media URLs format (if present)
 * 
 * @param message - WhatsApp message to validate
 * @throws {MessagingValidationError} If any validation check fails
 * 
 * @example
 * ```typescript
 * const message: WhatsAppMessage = {
 *   from: 'whatsapp:+14155552671',
 *   to: 'whatsapp:+14155552672',
 *   body: 'Hello!'
 * };
 * 
 * validateWhatsAppMessage(message); // OK
 * ```
 */
export function validateWhatsAppMessage(message: WhatsAppMessage): void {
  // Validate required fields
  if (!message.from) {
    throw new MessagingValidationError('From phone number is required', 'from');
  }
  validateWhatsAppPhone(message.from, 'from');

  if (!message.to) {
    throw new MessagingValidationError('To phone number is required', 'to');
  }
  validateWhatsAppPhone(message.to, 'to');

  // Either body or templateName is required
  if (!message.body && !message.templateName) {
    throw new MessagingValidationError(
      'Either message body or template name is required',
      'body/templateName'
    );
  }

  if (message.body) {
    if (typeof message.body !== 'string') {
      throw new MessagingValidationError('Message body must be a string', 'body');
    }

    // WhatsApp has generous message length limits
    if (message.body.length > 4096) {
      throw new MessagingValidationError(
        'Message body exceeds maximum length of 4096 characters',
        'body'
      );
    }
  }

  // Validate template configuration if present
  if (message.templateName) {
    if (typeof message.templateName !== 'string') {
      throw new MessagingValidationError('Template name must be a string', 'templateName');
    }

    if (message.templateVariables) {
      if (typeof message.templateVariables !== 'object' || Array.isArray(message.templateVariables)) {
        throw new MessagingValidationError(
          'Template variables must be an object',
          'templateVariables'
        );
      }
    }
  }

  // Validate media URLs if present
  if (message.mediaUrls) {
    if (!Array.isArray(message.mediaUrls)) {
      throw new MessagingValidationError('Media URLs must be an array', 'mediaUrls');
    }

    for (const [index, url] of message.mediaUrls.entries()) {
      if (typeof url !== 'string') {
        throw new MessagingValidationError(
          `Media URL at index ${index} must be a string`,
          'mediaUrls'
        );
      }

      try {
        new URL(url);
      } catch {
        throw new MessagingValidationError(
          `Invalid media URL at index ${index}: ${url}`,
          'mediaUrls'
        );
      }
    }
  }
}

/**
 * Validates an RCS message object.
 * 
 * Performs comprehensive validation including:
 * - Required fields (from, to, body)
 * - Phone number formats (E.164)
 * - RCS suggestions structure
 * - Media URLs format (if present)
 * 
 * @param message - RCS message to validate
 * @throws {MessagingValidationError} If any validation check fails
 * 
 * @example
 * ```typescript
 * const message: RCSMessage = {
 *   from: '+14155552671',
 *   to: '+14155552672',
 *   body: 'Hello!',
 *   suggestions: [
 *     { type: 'reply', text: 'Yes' },
 *     { type: 'reply', text: 'No' }
 *   ]
 * };
 * 
 * validateRCSMessage(message); // OK
 * ```
 */
export function validateRCSMessage(message: RCSMessage): void {
  // Validate required fields
  if (!message.from) {
    throw new MessagingValidationError('From phone number is required', 'from');
  }
  validatePhone(message.from, 'from');

  if (!message.to) {
    throw new MessagingValidationError('To phone number is required', 'to');
  }
  validatePhone(message.to, 'to');

  if (!message.body) {
    throw new MessagingValidationError('Message body is required', 'body');
  }

  if (typeof message.body !== 'string') {
    throw new MessagingValidationError('Message body must be a string', 'body');
  }

  // RCS supports longer messages
  if (message.body.length > 3072) {
    throw new MessagingValidationError(
      'Message body exceeds maximum length of 3072 characters',
      'body'
    );
  }

  // Validate suggestions if present
  if (message.suggestions) {
    if (!Array.isArray(message.suggestions)) {
      throw new MessagingValidationError('Suggestions must be an array', 'suggestions');
    }

    for (const [index, suggestion] of message.suggestions.entries()) {
      if (!suggestion.type) {
        throw new MessagingValidationError(
          `Suggestion at index ${index} must have a type`,
          'suggestions'
        );
      }

      if (!['reply', 'action', 'url'].includes(suggestion.type)) {
        throw new MessagingValidationError(
          `Invalid suggestion type at index ${index}: ${suggestion.type}. Must be 'reply', 'action', or 'url'`,
          'suggestions'
        );
      }

      if (!suggestion.text) {
        throw new MessagingValidationError(
          `Suggestion at index ${index} must have text`,
          'suggestions'
        );
      }

      if (typeof suggestion.text !== 'string') {
        throw new MessagingValidationError(
          `Suggestion text at index ${index} must be a string`,
          'suggestions'
        );
      }

      // Validate URL type suggestions have data
      if (suggestion.type === 'url' && !suggestion.data) {
        throw new MessagingValidationError(
          `URL suggestion at index ${index} must have data (URL)`,
          'suggestions'
        );
      }

      // Validate URL format if present
      if (suggestion.type === 'url' && suggestion.data) {
        try {
          new URL(suggestion.data);
        } catch {
          throw new MessagingValidationError(
            `Invalid URL in suggestion at index ${index}: ${suggestion.data}`,
            'suggestions'
          );
        }
      }
    }
  }

  // Validate media URLs if present
  if (message.mediaUrls) {
    if (!Array.isArray(message.mediaUrls)) {
      throw new MessagingValidationError('Media URLs must be an array', 'mediaUrls');
    }

    for (const [index, url] of message.mediaUrls.entries()) {
      if (typeof url !== 'string') {
        throw new MessagingValidationError(
          `Media URL at index ${index} must be a string`,
          'mediaUrls'
        );
      }

      try {
        new URL(url);
      } catch {
        throw new MessagingValidationError(
          `Invalid media URL at index ${index}: ${url}`,
          'mediaUrls'
        );
      }
    }
  }
}


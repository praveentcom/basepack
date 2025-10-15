import { EmailMessage } from './types';
import { EmailValidationError } from './errors';

/**
 * Simple email validation regex (RFC 5322 simplified)
 * Supports both "email@domain.com" and "Name <email@domain.com>" formats
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_WITH_NAME_REGEX = /^.+<[^\s@]+@[^\s@]+\.[^\s@]+>$/;

/**
 * Validates an email address format.
 * 
 * Supports both simple and display name formats:
 * - Simple: `user@example.com`
 * - With name: `John Doe <john@example.com>`
 * 
 * @param email - Email address to validate
 * @returns `true` if the email format is valid, `false` otherwise
 * 
 * @example
 * ```typescript
 * isValidEmail('user@example.com'); // true
 * isValidEmail('John Doe <john@example.com>'); // true
 * isValidEmail('invalid'); // false
 * ```
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const trimmed = email.trim();
  return EMAIL_REGEX.test(trimmed) || EMAIL_WITH_NAME_REGEX.test(trimmed);
}

/**
 * Validates an email address and throws if invalid.
 * 
 * @param email - Email address to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws {EmailValidationError} If the email format is invalid
 * 
 * @example
 * ```typescript
 * validateEmail('user@example.com'); // OK
 * validateEmail('invalid', 'from'); // throws EmailValidationError
 * ```
 */
export function validateEmail(email: string, fieldName: string = 'email'): void {
  if (!isValidEmail(email)) {
    throw new EmailValidationError(
      `Invalid email address in ${fieldName}: ${email}`,
      fieldName
    );
  }
}

/**
 * Validates an array of email addresses.
 * 
 * @param emails - Single email or array of emails to validate
 * @param fieldName - Name of the field being validated (for error messages)
 * @throws {EmailValidationError} If any email format is invalid or array is empty
 * 
 * @example
 * ```typescript
 * validateEmails('user@example.com', 'to'); // OK
 * validateEmails(['user1@example.com', 'user2@example.com'], 'to'); // OK
 * validateEmails([], 'to'); // throws EmailValidationError
 * ```
 */
export function validateEmails(emails: string | string[], fieldName: string): void {
  const emailArray = Array.isArray(emails) ? emails : [emails];
  
  if (emailArray.length === 0) {
    throw new EmailValidationError(
      `${fieldName} must contain at least one email address`,
      fieldName
    );
  }

  for (const email of emailArray) {
    validateEmail(email, fieldName);
  }
}

/**
 * Validates an EmailMessage object.
 * 
 * Performs comprehensive validation including:
 * - Required fields (from, to, subject)
 * - Email address formats
 * - At least one of text or html content
 * - Attachment structure and size limits (10MB per file)
 * 
 * @param message - Email message to validate
 * @throws {EmailValidationError} If any validation check fails
 * 
 * @example
 * ```typescript
 * const message = {
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Hello',
 *   html: '<p>Hello World</p>'
 * };
 * 
 * validateEmailMessage(message); // OK
 * 
 * // Missing required field
 * validateEmailMessage({ from: 'test@example.com' }); // throws EmailValidationError
 * ```
 */
export function validateEmailMessage(message: EmailMessage): void {
  // Validate required fields
  if (!message.from) {
    throw new EmailValidationError('From address is required', 'from');
  }
  validateEmail(message.from, 'from');

  if (!message.to) {
    throw new EmailValidationError('To address is required', 'to');
  }
  validateEmails(message.to, 'to');

  if (!message.subject) {
    throw new EmailValidationError('Subject is required', 'subject');
  }

  if (typeof message.subject !== 'string') {
    throw new EmailValidationError('Subject must be a string', 'subject');
  }

  // Validate that at least one content type is provided
  if (!message.text && !message.html) {
    throw new EmailValidationError(
      'At least one of text or html content must be provided',
      'text/html'
    );
  }

  // Validate optional fields
  if (message.cc) {
    validateEmails(message.cc, 'cc');
  }

  if (message.bcc) {
    validateEmails(message.bcc, 'bcc');
  }

  // Validate attachments
  if (message.attachments) {
    if (!Array.isArray(message.attachments)) {
      throw new EmailValidationError('Attachments must be an array', 'attachments');
    }

    for (const [index, attachment] of message.attachments.entries()) {
      if (!attachment.filename) {
        throw new EmailValidationError(
          `Attachment at index ${index} must have a filename`,
          'attachments'
        );
      }

      if (!attachment.content) {
        throw new EmailValidationError(
          `Attachment "${attachment.filename}" must have content`,
          'attachments'
        );
      }

      // Validate content is Buffer or string
      if (!Buffer.isBuffer(attachment.content) && typeof attachment.content !== 'string') {
        throw new EmailValidationError(
          `Attachment "${attachment.filename}" content must be a Buffer or string`,
          'attachments'
        );
      }

      // Optional: Add file size limit (10MB default)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const contentSize = Buffer.isBuffer(attachment.content)
        ? attachment.content.length
        : Buffer.byteLength(attachment.content, attachment.encoding as BufferEncoding || 'utf-8');

      if (contentSize > maxSize) {
        throw new EmailValidationError(
          `Attachment "${attachment.filename}" exceeds maximum size of 10MB`,
          'attachments'
        );
      }
    }
  }
}


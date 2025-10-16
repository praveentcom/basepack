/**
 * Logger types and interfaces
 * @module logger/types
 */

/**
 * Minimal logger interface that all services can use.
 * 
 * This interface is intentionally minimal to allow easy integration with
 * any logging library. It can be implemented directly or adapted using
 * the provided wrapper utilities.
 * 
 * **Default Behavior:** All services log to `console` by default.
 * 
 * @example Default logging (uses console)
 * ```typescript
 * import { EmailService } from 'basepack';
 * 
 * // Logs to console by default - no need to pass logger
 * const service = new EmailService({
 *   provider: EmailProvider.SES
 * });
 * ```
 * 
 * @example Disable logging
 * ```typescript
 * import { EmailService, noopLogger } from 'basepack';
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: noopLogger  // Silent - no logs
 * });
 * ```
 * 
 * @example Custom logger
 * ```typescript
 * const logger: Logger = {
 *   debug: (msg, ...args) => myLogger.log('DEBUG', msg, args),
 *   info: (msg, ...args) => myLogger.log('INFO', msg, args),
 *   warn: (msg, ...args) => myLogger.log('WARN', msg, args),
 *   error: (msg, ...args) => myLogger.log('ERROR', msg, args),
 * };
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger
 * });
 * ```
 * 
 * @see wrapPino - Wrapper for pino logger
 * @see wrapWinston - Wrapper for winston logger
 * @see wrapBunyan - Wrapper for bunyan logger
 * @see noopLogger - Silent logger for disabling logs
 */
export interface Logger {
  /**
   * Log debug messages for detailed troubleshooting.
   * Debug logs should be used for verbose information that helps during development.
   * 
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log informational messages about normal operations.
   * Info logs should track important events and state changes.
   * 
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log warning messages for potentially problematic situations.
   * Warn logs should be used for recoverable issues that don't prevent operation.
   * 
   * @param message - Log message
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log error messages for failures and exceptions.
   * Error logs should include context about what failed and why.
   * 
   * @param message - Log message
   * @param args - Additional arguments to log (typically error objects)
   */
  error(message: string, ...args: any[]): void;
}

/**
 * No-op logger that silently discards all log messages.
 * Use this to explicitly disable all logging.
 * 
 * By default, all services log to `console`. Pass `noopLogger` to disable logging entirely.
 * 
 * @example Disable logging
 * ```typescript
 * import { EmailService, noopLogger } from 'basepack';
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: noopLogger  // Silent - no logs
 * });
 * ```
 * 
 * @example Conditional logging
 * ```typescript
 * import { EmailService, noopLogger } from 'basepack';
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: process.env.NODE_ENV === 'production' ? noopLogger : console
 * });
 * ```
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};


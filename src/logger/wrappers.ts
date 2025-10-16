/**
 * Logger wrapper utilities for popular logging libraries
 * @module logger/wrappers
 */

import { inspect } from 'util';
import type { Logger } from './types';
import { EmailProvider } from '../email/types';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  // Foreground colors
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
} as const;

/**
 * Wraps a pino logger to match the Logger interface.
 * 
 * Pino is a fast, low-overhead JSON logger for Node.js.
 * 
 * @param pinoLogger - Pino logger instance
 * @returns Logger interface compatible wrapper
 * 
 * @example
 * ```typescript
 * import pino from 'pino';
 * import { wrapPino, EmailService } from 'basepack';
 * 
 * const pinoLogger = pino({ level: 'debug' });
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: wrapPino(pinoLogger)
 * });
 * ```
 * 
 * @example With custom serializers
 * ```typescript
 * import pino from 'pino';
 * import { wrapPino } from 'basepack';
 * 
 * const pinoLogger = pino({
 *   level: 'debug',
 *   serializers: {
 *     error: pino.stdSerializers.err,
 *   },
 * });
 * 
 * const logger = wrapPino(pinoLogger);
 * ```
 * 
 * @see https://getpino.io/
 */
export function wrapPino(pinoLogger: any): Logger {
  return {
    debug: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        pinoLogger.debug({ args }, message);
      } else {
        pinoLogger.debug(message);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        pinoLogger.info({ args }, message);
      } else {
        pinoLogger.info(message);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        pinoLogger.warn({ args }, message);
      } else {
        pinoLogger.warn(message);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        pinoLogger.error({ args }, message);
      } else {
        pinoLogger.error(message);
      }
    },
  };
}

/**
 * Wraps a winston logger to match the Logger interface.
 * 
 * Winston is a versatile logging library with multiple transport support.
 * 
 * @param winstonLogger - Winston logger instance
 * @returns Logger interface compatible wrapper
 * 
 * @example
 * ```typescript
 * import winston from 'winston';
 * import { wrapWinston, EmailService } from 'basepack';
 * 
 * const winstonLogger = winston.createLogger({
 *   level: 'debug',
 *   format: winston.format.json(),
 *   transports: [
 *     new winston.transports.Console(),
 *     new winston.transports.File({ filename: 'app.log' })
 *   ]
 * });
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: wrapWinston(winstonLogger)
 * });
 * ```
 * 
 * @example With custom format
 * ```typescript
 * import winston from 'winston';
 * import { wrapWinston } from 'basepack';
 * 
 * const winstonLogger = winston.createLogger({
 *   format: winston.format.combine(
 *     winston.format.timestamp(),
 *     winston.format.json()
 *   ),
 *   transports: [new winston.transports.Console()]
 * });
 * 
 * const logger = wrapWinston(winstonLogger);
 * ```
 * 
 * @see https://github.com/winstonjs/winston
 */
export function wrapWinston(winstonLogger: any): Logger {
  return {
    debug: (message: string, ...args: any[]) => {
      winstonLogger.debug(message, ...args);
    },
    info: (message: string, ...args: any[]) => {
      winstonLogger.info(message, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      winstonLogger.warn(message, ...args);
    },
    error: (message: string, ...args: any[]) => {
      winstonLogger.error(message, ...args);
    },
  };
}

/**
 * Wraps a bunyan logger to match the Logger interface.
 * 
 * Bunyan is a simple and fast JSON logging library for Node.js services.
 * 
 * @param bunyanLogger - Bunyan logger instance
 * @returns Logger interface compatible wrapper
 * 
 * @example
 * ```typescript
 * import bunyan from 'bunyan';
 * import { wrapBunyan, EmailService } from 'basepack';
 * 
 * const bunyanLogger = bunyan.createLogger({
 *   name: 'myapp',
 *   level: 'debug'
 * });
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: wrapBunyan(bunyanLogger)
 * });
 * ```
 * 
 * @example With streams
 * ```typescript
 * import bunyan from 'bunyan';
 * import { wrapBunyan } from 'basepack';
 * 
 * const bunyanLogger = bunyan.createLogger({
 *   name: 'myapp',
 *   streams: [
 *     { level: 'debug', stream: process.stdout },
 *     { level: 'error', path: '/var/log/myapp-error.log' }
 *   ]
 * });
 * 
 * const logger = wrapBunyan(bunyanLogger);
 * ```
 * 
 * @see https://github.com/trentm/node-bunyan
 */
export function wrapBunyan(bunyanLogger: any): Logger {
  return {
    debug: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        bunyanLogger.debug({ args }, message);
      } else {
        bunyanLogger.debug(message);
      }
    },
    info: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        bunyanLogger.info({ args }, message);
      } else {
        bunyanLogger.info(message);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        bunyanLogger.warn({ args }, message);
      } else {
        bunyanLogger.warn(message);
      }
    },
    error: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        bunyanLogger.error({ args }, message);
      } else {
        bunyanLogger.error(message);
      }
    },
  };
}

/**
 * Parses a Basepack log message and colors different parts.
 * Expected format: "Basepack [Service]: [Message]"
 * 
 * @param message - The log message to parse and color
 * @param prefixColor - Color for the "Basepack [Service]" prefix
 * @param messageColor - Color for the actual message content
 * @param args - Additional arguments to format and append
 * @returns Colored message string with formatted args
 */
function colorizeMessage(
  message: string, 
  prefixColor: string, 
  messageColor: string,
  args: any[]
): string {
  let formattedMessage: string;
  
  // Match "Basepack [Service]:" at the start
  const match = message.match(/^(Basepack\s+\w+):\s*(.*)$/);
  
  if (match) {
    const [, prefix, content] = match;
    formattedMessage = `${prefixColor}${prefix}:${colors.reset} ${messageColor}${content}${colors.reset}`;
  } else {
    // If no match, just color the whole message
    formattedMessage = `${messageColor}${message}${colors.reset}`;
  }
  
  // Append colorized args if any
  if (args.length > 0) {
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return inspect(arg, {
          colors: true,
          depth: 3,
          compact: false,
          breakLength: 80,
        });
      }
      return String(arg);
    }).join(' ');
    
    formattedMessage += ' ' + formattedArgs;
  }
  
  return formattedMessage;
}

/**
 * Creates a colored console logger with ANSI color codes.
 * 
 * This logger enhances the default console output with colors for better readability.
 * No additional dependencies required - uses ANSI escape codes.
 * 
 * Colors used:
 * - Service prefix ("Basepack Email"/"Basepack Storage"): Cyan/Magenta (bold)
 * - DEBUG messages: Gray text
 * - INFO messages: Blue text
 * - WARN messages: Yellow text
 * - ERROR messages: Red text (bold)
 * - Arguments: Default terminal color (uncolored)
 * 
 * @returns Logger interface with colored output
 * 
 * @example
 * ```typescript
 * import { coloredConsoleLogger, EmailService } from 'basepack';
 * 
 * const service = new EmailService({
 *   provider: EmailProvider.SES,
 *   logger: coloredConsoleLogger()
 * });
 * ```
 * 
 * @example Conditional colored logging
 * ```typescript
 * import { coloredConsoleLogger, noopLogger } from 'basepack';
 * 
 * const logger = process.env.NODE_ENV === 'test' 
 *   ? coloredConsoleLogger() 
 *   : noopLogger;
 * ```
 */
export function coloredConsoleLogger(): Logger {
  return {
    debug: (message: string, ...args: any[]) => {
      const colored = colorizeMessage(message, colors.dim, colors.magenta, args);
      console.debug(colored);
    },
    info: (message: string, ...args: any[]) => {
      const colored = colorizeMessage(message, colors.dim, colors.cyan, args);
      console.info(colored);
    },
    warn: (message: string, ...args: any[]) => {
      const colored = colorizeMessage(message, colors.dim, colors.yellow, args);
      console.warn(colored);
    },
    error: (message: string, ...args: any[]) => {
      const colored = colorizeMessage(message, colors.dim + colors.bright, colors.red + colors.bright, args);
      console.error(colored);
    },
  };
}


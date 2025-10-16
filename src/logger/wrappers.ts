/**
 * Logger wrapper utilities for popular logging libraries
 * @module logger/wrappers
 */

import type { Logger } from './types';

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
 *   provider: 'ses',
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
 *   provider: 'ses',
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
 *   provider: 'ses',
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
    error: (message: string, ...args: any[]) => {
      if (args.length > 0) {
        bunyanLogger.error({ args }, message);
      } else {
        bunyanLogger.error(message);
      }
    },
  };
}


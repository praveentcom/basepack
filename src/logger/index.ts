/**
 * Logger utilities for Basepack services
 * @module logger
 */

export type { Logger } from './types';
export { noopLogger } from './types';
export { wrapPino, wrapWinston, wrapBunyan, consoleLogger } from './wrappers';

/**
 * Convert an unknown error into a JSON-serializable plain object with safe fields.
 * Avoids circular structures from HTTP clients (e.g., Node IncomingMessage req/res).
 */
export function toSafeErrorDetails(error: unknown): Record<string, any> {
  const err: any = error as any;
  const details: Record<string, any> = {
    message: err?.message ?? String(error),
    name: err?.name,
    code: err?.code ?? err?.Code,
  };

  // Common HTTP/status fields across SDKs
  const statusCode = err?.statusCode ?? err?.status ?? err?.$metadata?.httpStatusCode;
  if (statusCode !== undefined) details.statusCode = statusCode;

  const requestId = err?.requestId ?? err?.$metadata?.requestId ?? err?.$response?.requestId;
  if (requestId !== undefined) details.requestId = requestId;

  // Include stack if it's a string (safe)
  if (typeof err?.stack === 'string') details.stack = err.stack;

  return details;
}


/**
 * Base class for all RPC-related errors.
 * Provides structured error information with error codes and trace IDs for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await client.user.get({ userId: 'invalid' });
 * } catch (error) {
 *   if (error instanceof RPCError) {
 *     console.log('RPC Error:', error.code, error.message, error.traceId);
 *   }
 * }
 * ```
 *
 * @group Error Classes
 */
export class RPCError extends Error {
  constructor(
    public code: string,
    message: string,
    public traceId?: string,
  ) {
    super(message);
    this.name = 'RPCError';
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      traceId: this.traceId,
    };
  }
}

/**
 * Error thrown when input or output validation fails.
 * Occurs when data doesn't match the expected Zod schemas.
 *
 * @example
 * ```typescript
 * // This would throw ValidationError if userId is not a string
 * await client.user.get({ userId: 123 });
 * ```
 *
 * @group Error Classes
 */
export class ValidationError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('VALIDATION_ERROR', message, traceId);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when transport layer communication fails.
 * Includes WebSocket connection errors, HTTP failures, etc.
 *
 * @example
 * ```typescript
 * try {
 *   await client.user.get({ userId: '123' });
 * } catch (error) {
 *   if (error instanceof TransportError) {
 *     console.log('Connection failed:', error.message);
 *   }
 * }
 * ```
 *
 * @group Error Classes
 */
export class TransportError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('TRANSPORT_ERROR', message, traceId);
    this.name = 'TransportError';
  }
}

/**
 * Error thrown when attempting to call a method that doesn't exist.
 * Usually indicates the server hasn't implemented the requested method.
 *
 * @example
 * ```typescript
 * // Throws if 'nonexistent' method isn't implemented
 * await client.user.nonexistent({ data: 'test' });
 * ```
 *
 * @group Error Classes
 */
export class MethodNotFoundError extends RPCError {
  constructor(methodId: string, traceId?: string) {
    super('METHOD_NOT_FOUND', `Method '${methodId}' not found`, traceId);
    this.name = 'MethodNotFoundError';
  }
}

/**
 * Error thrown when an RPC call exceeds its timeout duration.
 * Can be configured per-call or use the default timeout.
 *
 * @example
 * ```typescript
 * try {
 *   // This call has a 1 second timeout
 *   await client.user.get({ userId: '123' }, { timeout: 1000 });
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log('Call timed out');
 *   }
 * }
 * ```
 *
 * @group Error Classes
 */
export class TimeoutError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('TIMEOUT_ERROR', message, traceId);
    this.name = 'TimeoutError';
  }
}

/**
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
 * @group Error Classes
 */
export class ValidationError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('VALIDATION_ERROR', message, traceId);
    this.name = 'ValidationError';
  }
}

/**
 * @group Error Classes
 */
export class TransportError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('TRANSPORT_ERROR', message, traceId);
    this.name = 'TransportError';
  }
}

/**
 * @group Error Classes
 */
export class MethodNotFoundError extends RPCError {
  constructor(methodId: string, traceId?: string) {
    super('METHOD_NOT_FOUND', `Method '${methodId}' not found`, traceId);
    this.name = 'MethodNotFoundError';
  }
}

/**
 * @group Error Classes
 */
export class TimeoutError extends RPCError {
  constructor(message: string, traceId?: string) {
    super('TIMEOUT_ERROR', message, traceId);
    this.name = 'TimeoutError';
  }
}

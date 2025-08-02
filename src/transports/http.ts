import { RPCMessage, Transport } from '../types';
import { TransportError } from '../errors';
import type { Channel } from '../channel';

// Express-like types for middleware compatibility
interface Request {
  method: string;
  body?: any; // Optional for testing, required for actual usage
}

interface Response {
  status(code: number): Response;
  json(data: any): Response; // Keep flexible for chaining
}

type NextFunction = () => void;

/**
 * @group Transport Layer
 */
export interface HTTPTransportConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  fetch?: typeof globalThis.fetch;
}

/**
 * @group Transport Layer
 */
export class HTTPTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private connected = false;

  constructor(private config: HTTPTransportConfig) {
    if (!config.fetch && typeof fetch === 'undefined') {
      throw new TransportError('fetch is not available. Please provide a fetch implementation.');
    }
  }

  async send(message: RPCMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new TransportError('HTTP transport is not connected');
    }

    const fetchFn = this.config.fetch || fetch;
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/rpc`;

    try {
      const response = await fetchFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(message),
        signal: this.config.timeout ? AbortSignal.timeout(this.config.timeout) : undefined,
      });

      if (!response.ok) {
        throw new TransportError(
          `HTTP request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      if (message.type === 'request') {
        const responseData = await response.json();
        const responseMessage = responseData as RPCMessage;
        this.messageHandler?.(responseMessage);
      }
    } catch (error) {
      if (error instanceof TransportError) {
        throw error;
      }

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new TransportError(`HTTP request failed: ${errorMessage}`);
    }
  }

  onMessage(handler: (message: RPCMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    try {
      const fetchFn = this.config.fetch || fetch;
      const healthUrl = `${this.config.baseUrl.replace(/\/$/, '')}/health`;

      const response = await fetchFn(healthUrl, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.connected = true;
      } else {
        throw new TransportError(`Server health check failed: ${response.statusText}`);
      }
    } catch (error) {
      this.connected = false;

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new TransportError(`Failed to connect to HTTP server: ${errorMessage}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Creates Express middleware for handling zod-rpc calls with a channel.
 *
 * @param channel - Channel with registered service implementations
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { zodRpc, Channel } from '@xtr-dev/zod-rpc';
 * import { implementService } from '@xtr-dev/zod-rpc';
 *
 * const app = express();
 * app.use(express.json());
 *
 * // Create channel for local method invocation (no transport needed)
 * const channel = new Channel('server');
 *
 * // Implement and publish service (simplified API)
 * channel.publishService(userService, {
 *   get: async ({ userId }) => ({ id: userId, name: 'John' }),
 *   create: async ({ name, email }) => ({ id: '123', success: true })
 * });
 *
 * // Use middleware
 * app.use('/rpc', zodRpc(channel));
 * ```
 * @group HTTP Middleware
 */
export function zodRpc(
  channel: Channel | { invoke: Function },
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST') {
      return next();
    }

    try {
      const message: RPCMessage = req.body;

      // Validate message structure
      if (!message.methodId || !message.traceId || !message.callerId || !message.targetId) {
        res.status(400).json({
          error: 'Invalid RPC message',
          message: 'Missing required fields: methodId, traceId, callerId, targetId',
        });
        return;
      }

      // Call method directly through channel
      const result = await channel.invoke(message.targetId, message.methodId, message.payload);

      res.json({
        callerId: message.targetId,
        targetId: message.callerId,
        traceId: message.traceId,
        methodId: message.methodId,
        payload: result,
        type: 'response',
      });
    } catch (error) {
      res.status(500).json({
        error: 'RPC handler error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * @group Transport Layer
 */
export function createHTTPTransport(config: HTTPTransportConfig): HTTPTransport {
  return new HTTPTransport(config);
}

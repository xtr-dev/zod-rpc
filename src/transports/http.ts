import { RPCMessage, Transport } from '../types';
import { TransportError } from '../errors';

export interface HTTPTransportConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  fetch?: typeof globalThis.fetch;
}

export class HTTPTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private connected = false;

  constructor(private config: HTTPTransportConfig) {
    if (!config.fetch && typeof fetch === 'undefined') {
      throw new TransportError(
        'fetch is not available. Please provide a fetch implementation.'
      );
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
        signal: this.config.timeout
          ? AbortSignal.timeout(this.config.timeout)
          : undefined,
      });

      if (!response.ok) {
        throw new TransportError(
          `HTTP request failed with status ${response.status}: ${response.statusText}`
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
        throw new TransportError(
          `Server health check failed: ${response.statusText}`
        );
      }
    } catch (error) {
      this.connected = false;

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      throw new TransportError(
        `Failed to connect to HTTP server: ${errorMessage}`
      );
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export class HTTPServer {
  private methods = new Map<
    string,
    (message: RPCMessage) => Promise<RPCMessage>
  >();

  constructor(private port = 3000) {}

  registerHandler(handler: (message: RPCMessage) => Promise<RPCMessage>): void {
    this.methods.set('*', handler);
  }

  async start(): Promise<void> {
    throw new Error(
      'HTTPServer implementation requires a specific HTTP server framework (Express, Fastify, etc.)'
    );
  }

  async stop(): Promise<void> {
    throw new Error(
      'HTTPServer implementation requires a specific HTTP server framework (Express, Fastify, etc.)'
    );
  }
}

export function createHTTPTransport(
  config: HTTPTransportConfig
): HTTPTransport {
  return new HTTPTransport(config);
}

export interface HTTPServerAdapter {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  onRequest(path: string, handler: (body: any) => Promise<any>): void;
}

export class HTTPChannelServer {
  private messageHandler?: (message: RPCMessage) => Promise<RPCMessage>;

  constructor(private adapter: HTTPServerAdapter) {
    this.setupRoutes();
  }

  onMessage(handler: (message: RPCMessage) => Promise<RPCMessage>): void {
    this.messageHandler = handler;
  }

  async start(port = 3000): Promise<void> {
    await this.adapter.start(port);
  }

  async stop(): Promise<void> {
    await this.adapter.stop();
  }

  private setupRoutes(): void {
    this.adapter.onRequest('/rpc', async (body: any) => {
      if (!this.messageHandler) {
        throw new Error('No message handler registered');
      }

      try {
        const message: RPCMessage = body;
        return await this.messageHandler(message);
      } catch (error) {
        throw new Error(
          `RPC handler error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    this.adapter.onRequest('/health', async () => {
      return { status: 'ok' };
    });
  }
}

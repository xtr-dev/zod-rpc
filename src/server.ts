import { Channel } from './channel';
import { createWebSocketTransport } from './transports';
import { ServiceDefinition, ServiceImplementation, implementService } from './service';
import WebSocket from 'ws';

/**
 * Configuration options for creating an RPC server.
 *
 * @example
 * ```typescript
 * const config: RPCServerConfig = {
 *   port: 8080,
 *   host: '0.0.0.0',
 *   serverId: 'my-server',
 *   timeout: 30000
 * };
 * ```
 *
 * @group Server API
 */
export interface RPCServerConfig {
  /** Port number to listen on (for WebSocket servers) */
  port?: number;
  /** Host address to bind to (for WebSocket servers) */
  host?: string;
  /** Unique identifier for this server instance */
  serverId?: string;
  /** Default timeout for RPC calls in milliseconds */
  timeout?: number;
}

/**
 * RPC Server for hosting type-safe remote procedure call services.
 *
 * @example
 * ```typescript
 * const server = createRPCServer('ws://localhost:8080')
 *   .implement(userService, {
 *     get: async ({ userId }) => ({ id: userId, name: 'John' }),
 *     create: async ({ name, email }) => ({ id: '123', success: true })
 *   });
 *
 * await server.start();
 * ```
 * @group Server API
 */
export class RPCServer {
  private channel?: Channel;
  private server?: WebSocket.Server;
  private serverId: string;
  private timeout: number;
  private services = new Map<string, ServiceDefinition<any>>();
  private implementations = new Map<string, ServiceImplementation<any>>();

  constructor(
    private url: string,
    private config: RPCServerConfig = {},
  ) {
    this.serverId = config.serverId || 'server';
    this.timeout = config.timeout || 30000;
  }

  implement<T extends Record<string, any>>(
    service: ServiceDefinition<T>,
    implementation: ServiceImplementation<T>,
  ): this {
    this.services.set(service.id, service);
    this.implementations.set(service.id, implementation);
    return this;
  }

  async start(): Promise<void> {
    if (this.url.startsWith('ws://') || this.url.startsWith('wss://')) {
      await this.startWebSocketServer();
    } else if (this.url.startsWith('http://') || this.url.startsWith('https://')) {
      await this.startHttpServer();
    } else {
      throw new Error(`Unsupported URL scheme: ${this.url}`);
    }
  }

  private async startWebSocketServer(): Promise<void> {
    const urlObj = new URL(this.url);
    const port = parseInt(urlObj.port) || 8080;
    const host = urlObj.hostname || 'localhost';

    this.server = new WebSocket.Server({ port, host });
    console.log(`🚀 RPC Server starting on ${this.url}`);

    this.server.on('connection', async (ws) => {
      console.log('📡 Client connected');

      const transport = createWebSocketTransport(ws as any, false); // Don't auto-reconnect on server
      const channel = new Channel(this.serverId, this.timeout);

      for (const [serviceId, service] of this.services) {
        const implementation = this.implementations.get(serviceId);
        if (implementation) {
          const methods = implementService(service, implementation, this.serverId);
          methods.forEach((method) => channel.publishMethod(method));
        }
      }

      await channel.connect(transport);
      console.log(
        `✅ Server channel connected with services: ${Array.from(this.services.keys()).join(', ')}`,
      );

      ws.on('close', () => {
        console.log('📴 Client disconnected');
        channel.disconnect();
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        channel.disconnect();
      });
    });

    this.logAvailableServices();
  }

  private async startHttpServer(): Promise<void> {
    throw new Error('HTTP transport for server not yet implemented. Use WebSocket transport.');
  }

  private logAvailableServices(): void {
    console.log('📋 Available services:');
    for (const [serviceId, service] of this.services) {
      console.log(`  📦 ${serviceId}:`);
      for (const methodName of Object.keys(service.methods)) {
        console.log(`    - ${serviceId}.${methodName}`);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('🛑 Server stopped');
          this.server = undefined; // Clear server reference
          resolve();
        });
      });
    }

    if (this.channel) {
      await this.channel.disconnect();
    }
  }

  getServices(): string[] {
    return Array.from(this.services.keys());
  }

  isRunning(): boolean {
    return this.server !== undefined;
  }
}

/**
 * Create a new RPC server instance.
 * This is the main entry point for creating servers with service implementations.
 *
 * @param url - WebSocket or HTTP URL for the server to listen on
 * @param config - Optional server configuration
 * @returns A new RPCServer instance ready for service implementation
 *
 * @example
 * ```typescript
 * const server = createRPCServer('ws://localhost:8080', {
 *   serverId: 'my-server',
 *   timeout: 30000
 * });
 *
 * server.implement(userService, {
 *   get: async ({ userId }) => ({ name: `User ${userId}`, email: `user${userId}@example.com` }),
 *   create: async ({ name, email }) => ({ id: '123', success: true })
 * });
 *
 * await server.start();
 * ```
 *
 * @group Server API
 */
export function createRPCServer(url: string, config?: RPCServerConfig): RPCServer {
  return new RPCServer(url, config);
}

/**
 * Fluent builder pattern for creating RPC servers with advanced configurations.
 * Provides a chainable API for setting server options before building the final server.
 *
 * @example
 * ```typescript
 * const server = createServer('ws://localhost:8080')
 *   .withId('my-server')
 *   .withTimeout(30000)
 *   .withHost('0.0.0.0')
 *   .withPort(8080)
 *   .build();
 * ```
 *
 * @group Server API
 */
export class RPCServerBuilder {
  private config: RPCServerConfig = {};
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  withId(serverId: string): this {
    const newBuilder = new RPCServerBuilder(this.url);
    newBuilder.config = { ...this.config, serverId };
    return newBuilder as this;
  }

  withTimeout(timeout: number): this {
    const newBuilder = new RPCServerBuilder(this.url);
    newBuilder.config = { ...this.config, timeout };
    return newBuilder as this;
  }

  withPort(port: number): this {
    const newBuilder = new RPCServerBuilder(this.url);
    newBuilder.config = { ...this.config, port };
    return newBuilder as this;
  }

  withHost(host: string): this {
    const newBuilder = new RPCServerBuilder(this.url);
    newBuilder.config = { ...this.config, host };
    return newBuilder as this;
  }

  build(): RPCServer {
    return new RPCServer(this.url, this.config);
  }
}

/**
 * Create a new RPC server builder for fluent configuration.
 * This is the preferred way to create servers with custom settings.
 *
 * @param url - WebSocket or HTTP URL for the server to listen on
 * @returns A new RPCServerBuilder instance for chaining configuration
 *
 * @example
 * ```typescript
 * const server = createServer('ws://localhost:8080')
 *   .withId('my-server')
 *   .withTimeout(30000)
 *   .withHost('0.0.0.0')
 *   .build();
 *
 * server.implement(userService, userImplementation);
 * await server.start();
 * ```
 *
 * @group Server API
 */
export function createServer(url: string): RPCServerBuilder {
  return new RPCServerBuilder(url);
}

// Backward compatibility aliases
export { RPCServerBuilder as RpcServerBuilder };
export { createRPCServer as createRpcServer };
export { RPCServer as RpcServer };

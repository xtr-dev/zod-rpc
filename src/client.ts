import { z } from 'zod';
import { Channel } from './channel';
import { createWebSocketTransport, createHTTPTransport } from './transports';
import { ServiceDefinition, createServiceContracts, InferServiceClient } from './service';

/**
 * Configuration options for creating an RPC client.
 *
 * @example
 * ```typescript
 * const config: RPCClientConfig = {
 *   url: 'ws://localhost:8080',
 *   services: { user: userService, math: mathService },
 *   defaultTarget: 'auto',
 *   timeout: 30000,
 *   clientId: 'my-client'
 * };
 * ```
 *
 * @group Client API
 */
export interface RPCClientConfig {
  /** WebSocket or HTTP URL to connect to */
  url: string;
  /** Object mapping service names to their definitions */
  services: Record<string, ServiceDefinition<any>>;
  /** Default target for routing requests. 'auto' uses service IDs as targets */
  defaultTarget?: string;
  /** Default timeout for RPC calls in milliseconds */
  timeout?: number;
  /** Unique identifier for this client instance */
  clientId?: string;
}

/**
 * Configuration options for the fluent RPC client builder pattern.
 * Used internally by the RPCClientBuilder class.
 *
 * @example
 * ```typescript
 * const config: FluentRPCClientConfig = {
 *   transport: 'websocket',
 *   clientId: 'my-client',
 *   timeout: 10000
 * };
 * ```
 *
 * @group Client API
 */
export interface FluentRPCClientConfig {
  /** Transport type - automatically detected from URL */
  transport: 'websocket' | 'http' | string;
  /** Unique identifier for this client instance */
  clientId?: string;
  /** Default timeout for RPC calls in milliseconds */
  timeout?: number;
}

/**
 * Fully typed RPC client with service methods and utility functions.
 * Each service becomes a property with callable methods that match the service definition.
 *
 * @template T - Record mapping service names to their definitions
 *
 * @example
 * ```typescript
 * const client: RPCClient<{ user: typeof userService }> = await createRPCClient(config);
 *
 * // Service methods are fully typed
 * const user = await client.user.get({ userId: '123' });
 * const result = await client.user.create({ name: 'Alice', email: 'alice@example.com' });
 *
 * // Utility methods
 * await client.disconnect();
 * const connected = client.isConnected();
 * client.setDefaultTarget('new-server');
 * ```
 *
 * @group Client API
 */
export type RPCClient<T extends Record<string, ServiceDefinition<any>>> = {
  [K in keyof T]: InferServiceClient<T[K]>;
} & {
  /** Close all connections and clean up resources */
  disconnect(): Promise<void>;
  /** Check if client is currently connected to the server */
  isConnected(): boolean;
  /** Change the default target for future method calls */
  setDefaultTarget(target: string): void;
};

/**
 * Create a type-safe RPC client for calling remote services.
 *
 * @param config - Client configuration including URL, services, and options
 * @returns Promise that resolves to a fully typed RPC client
 *
 * @example
 * ```typescript
 * const client = await createRPCClient({
 *   url: 'ws://localhost:8080',
 *   services: { user: userService, math: mathService }
 * });
 *
 * const user = await client.user.get({ userId: '123' });
 * ```
 * @group Client API
 */
export async function createRPCClient<T extends Record<string, ServiceDefinition<any>>>(
  config: RPCClientConfig & { services: T },
): Promise<RPCClient<T>> {
  const { url, services, defaultTarget = 'auto', timeout = 30000, clientId = 'client' } = config;

  const transport =
    url.startsWith('ws://') || url.startsWith('wss://')
      ? createWebSocketTransport(url)
      : createHTTPTransport({ baseUrl: url });

  const channel = new Channel(clientId, timeout);
  await channel.connect(transport);

  let currentDefaultTarget = defaultTarget;
  const client = {} as RPCClient<T>;

  for (const [serviceName, serviceDefinition] of Object.entries(services)) {
    const contracts = createServiceContracts(serviceDefinition);
    const targetId = currentDefaultTarget === 'auto' ? serviceDefinition.id : currentDefaultTarget;

    const enhancedClient = {} as any;

    for (const [methodName, contract] of Object.entries(contracts)) {
      enhancedClient[methodName] = async (
        input: z.infer<typeof contract.input>,
        options?: { timeout?: number; target?: string },
      ): Promise<z.infer<typeof contract.output>> => {
        const actualTarget = options?.target || targetId;
        const actualTimeout = options?.timeout;

        return channel.invoke(
          actualTarget,
          contract.id,
          input,
          contract.input,
          contract.output,
          actualTimeout,
        );
      };
    }

    client[serviceName as keyof T] = enhancedClient;
  }

  client.disconnect = (): Promise<void> => channel.disconnect();
  client.isConnected = (): boolean => transport.isConnected();
  client.setDefaultTarget = (target: string): void => {
    currentDefaultTarget = target;
  };

  return client;
}

/**
 * Fluent builder pattern for creating RPC clients with advanced configurations.
 * Provides a chainable API for setting client options before building the final client.
 *
 * @example
 * ```typescript
 * const client = await connect('ws://localhost:8080')
 *   .withId('my-client')
 *   .withTimeout(10000)
 *   .withServices({ user: userService, math: mathService })
 *   .build();
 * ```
 *
 * @group Client API
 */
export class RPCClientBuilder {
  private config: Partial<FluentRPCClientConfig> = {};
  private services: Record<string, ServiceDefinition<any>> = {};
  private url = '';

  constructor(url: string) {
    this.url = url;
    this.config.transport =
      url.startsWith('ws://') || url.startsWith('wss://') ? 'websocket' : 'http';
  }

  withId(clientId: string): this {
    const newBuilder = new RPCClientBuilder(this.url);
    newBuilder.config = { ...this.config, clientId };
    newBuilder.services = { ...this.services };
    return newBuilder as this;
  }

  withTimeout(timeout: number): this {
    const newBuilder = new RPCClientBuilder(this.url);
    newBuilder.config = { ...this.config, timeout };
    newBuilder.services = { ...this.services };
    return newBuilder as this;
  }

  withServices<T extends Record<string, ServiceDefinition<any>>>(
    services: T,
  ): RPCClientBuilder & { build(): Promise<RPCClient<T>> } {
    const newBuilder = new RPCClientBuilder(this.url);
    newBuilder.config = { ...this.config };
    newBuilder.services = services;
    return newBuilder as RPCClientBuilder & { build(): Promise<RPCClient<T>> };
  }

  async build<T extends Record<string, ServiceDefinition<any>>>(): Promise<RPCClient<T>> {
    return createRPCClient({
      url: this.url,
      services: this.services as T,
      clientId: this.config.clientId,
      timeout: this.config.timeout,
    });
  }
}

/**
 * Create a new RPC client builder for fluent configuration.
 * This is the preferred way to create clients with custom settings.
 *
 * @param url - WebSocket or HTTP URL to connect to
 * @returns A new RPCClientBuilder instance for chaining configuration
 *
 * @example
 * ```typescript
 * const client = await connect('ws://localhost:8080')
 *   .withId('my-client')
 *   .withTimeout(10000)
 *   .withServices({ user: userService })
 *   .build();
 * ```
 *
 * @group Client API
 */
export function connect(url: string): RPCClientBuilder {
  return new RPCClientBuilder(url);
}

// Backward compatibility aliases
export { RPCClientBuilder as RpcClientBuilder };
export { createRPCClient as createRpcClient };
export { type RPCClient as RpcClient };
export { type RPCClientConfig as RpcClientConfig };

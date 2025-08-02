import { z } from 'zod';
import { Channel } from './channel';
import { createWebSocketTransport, createHTTPTransport } from './transports';
import { ServiceDefinition, createServiceContracts, InferServiceClient } from './service';

/**
 * @group Client API
 */
export interface RPCClientConfig {
  url: string;
  services: Record<string, ServiceDefinition<any>>;
  defaultTarget?: string;
  timeout?: number;
  clientId?: string;
}

/**
 * @group Client API
 */
export interface FluentRPCClientConfig {
  transport: 'websocket' | 'http' | string;
  clientId?: string;
  timeout?: number;
}

/**
 * @group Client API
 */
export type RPCClient<T extends Record<string, ServiceDefinition<any>>> = {
  [K in keyof T]: InferServiceClient<T[K]>;
} & {
  disconnect(): Promise<void>;
  isConnected(): boolean;
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
 * @group Client API
 */
// Fluent builder pattern for advanced configurations
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

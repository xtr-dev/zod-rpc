import { z, ZodSchema } from 'zod';

/**
 * Core message structure for RPC communication between clients and servers.
 * Every RPC call, response, and error is transmitted as an RPCMessage.
 *
 * @example
 * ```typescript
 * const requestMessage: RPCMessage = {
 *   callerId: 'client-123',
 *   targetId: 'server',
 *   traceId: 'trace-456',
 *   methodId: 'user.get',
 *   payload: { userId: '789' },
 *   type: 'request'
 * };
 * ```
 *
 * @group Core Types
 */
export interface RPCMessage {
  /** Unique identifier of the client or server sending this message */
  callerId: string;
  /** Unique identifier of the intended recipient for this message */
  targetId: string;
  /** Unique identifier for tracking this request-response cycle */
  traceId: string;
  /** Full method identifier in the format 'serviceName.methodName' */
  methodId: string;
  /** The actual data being sent - request parameters, response data, or error details */
  payload: unknown;
  /** Type of message - determines how the payload should be interpreted */
  type: 'request' | 'response' | 'error';
}

/**
 * Internal definition of an RPC method with its validation schemas and implementation.
 * This is created when implementing services on the server side.
 *
 * @template T - Zod schema type for input validation
 * @template U - Zod schema type for output validation
 *
 * @example
 * ```typescript
 * const getUserMethod: MethodDefinition<typeof inputSchema, typeof outputSchema> = {
 *   id: 'user.get',
 *   targetId: 'server',
 *   input: z.object({ userId: z.string() }),
 *   output: z.object({ name: z.string(), email: z.string() }),
 *   handler: async ({ userId }) => ({ name: 'John', email: 'john@example.com' })
 * };
 * ```
 *
 * @group Core Types
 */
export interface MethodDefinition<T extends ZodSchema, U extends ZodSchema> {
  /** Full method identifier in format 'serviceName.methodName' */
  id: string;
  /** Target server/service that should handle this method */
  targetId: string;
  /** Zod schema for validating input parameters */
  input: T;
  /** Zod schema for validating output/return values */
  output: U;
  /** The actual implementation function that processes the request */
  handler: (input: z.infer<T>) => Promise<z.infer<U>>;
}

/**
 * Metadata about an RPC method for introspection and documentation purposes.
 *
 * @example
 * ```typescript
 * const methodInfo: MethodInfo = {
 *   id: 'user.get',
 *   name: 'get'
 * };
 * ```
 *
 * @group Core Types
 */
export interface MethodInfo {
  /** Full method identifier in format 'serviceName.methodName' */
  id: string;
  /** Short method name without service prefix */
  name: string;
}

/**
 * Metadata about an RPC service and its available methods.
 * Used for service discovery and API documentation generation.
 *
 * @example
 * ```typescript
 * const serviceInfo: ServiceInfo = {
 *   id: 'user',
 *   methods: [
 *     { id: 'user.get', name: 'get' },
 *     { id: 'user.create', name: 'create' }
 *   ]
 * };
 * ```
 *
 * @group Core Types
 */
export interface ServiceInfo {
  /** Unique service identifier */
  id: string;
  /** List of all methods available in this service */
  methods: MethodInfo[];
}

/**
 * Type utility to extract the input type from a MethodDefinition.
 * Automatically infers TypeScript types from Zod input schemas.
 *
 * @template T - MethodDefinition type to extract input from
 *
 * @example
 * ```typescript
 * const method: MethodDefinition<typeof inputSchema, typeof outputSchema> = {...};
 * type InputType = InferInput<typeof method>; // { userId: string }
 * ```
 *
 * @group Core Types
 */
export type InferInput<T> = T extends MethodDefinition<infer I, any> ? z.infer<I> : never;

/**
 * Type utility to extract the output type from a MethodDefinition.
 * Automatically infers TypeScript types from Zod output schemas.
 *
 * @template T - MethodDefinition type to extract output from
 *
 * @example
 * ```typescript
 * const method: MethodDefinition<typeof inputSchema, typeof outputSchema> = {...};
 * type OutputType = InferOutput<typeof method>; // { name: string; email: string }
 * ```
 *
 * @group Core Types
 */
export type InferOutput<T> = T extends MethodDefinition<any, infer O> ? z.infer<O> : never;

/**
 * Abstract interface for transport layers that handle RPC message delivery.
 * Different transports (WebSocket, HTTP, WebRTC) implement this interface
 * to provide a consistent API for the RPC layer.
 *
 * @example
 * ```typescript
 * const transport: Transport = createWebSocketTransport('ws://localhost:8080');
 *
 * await transport.connect();
 * transport.onMessage((message) => {
 *   console.log('Received:', message);
 * });
 *
 * await transport.send({
 *   callerId: 'client',
 *   targetId: 'server',
 *   traceId: 'trace-123',
 *   methodId: 'user.get',
 *   payload: { userId: '123' },
 *   type: 'request'
 * });
 * ```
 *
 * @group Transport Layer
 */
export interface Transport {
  /** Send an RPC message through this transport */
  send(message: RPCMessage): Promise<void>;
  /** Register a handler for incoming messages */
  onMessage(handler: (message: RPCMessage) => void): void;
  /** Establish connection to the remote endpoint */
  connect(): Promise<void>;
  /** Close connection and cleanup resources */
  disconnect(): Promise<void>;
  /** Check if transport is currently connected */
  isConnected(): boolean;
}

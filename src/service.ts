import { z, ZodSchema } from 'zod';
import { MethodContract } from './method';
import { MethodDefinition } from './types';

/**
 * Definition of a single RPC method within a service, specifying its input and output schemas.
 *
 * @template T - Zod schema type for input validation
 * @template U - Zod schema type for output validation
 *
 * @example
 * ```typescript
 * const getUserMethod: ServiceMethodDefinition<typeof inputSchema, typeof outputSchema> = {
 *   input: z.object({ userId: z.string() }),
 *   output: z.object({ name: z.string(), email: z.string() })
 * };
 * ```
 *
 * @group Service Definition
 */
export interface ServiceMethodDefinition<T extends ZodSchema, U extends ZodSchema> {
  /** Zod schema for validating method input parameters */
  input: T;
  /** Zod schema for validating method output/return values */
  output: U;
}

/**
 * Complete definition of an RPC service containing multiple related methods.
 * This is the main building block for creating type-safe RPC APIs.
 *
 * @template T - Record type mapping method names to their definitions
 *
 * @example
 * ```typescript
 * const userService: ServiceDefinition<{
 *   get: ServiceMethodDefinition<typeof getInput, typeof getOutput>;
 *   create: ServiceMethodDefinition<typeof createInput, typeof createOutput>;
 * }> = {
 *   id: 'user',
 *   methods: {
 *     get: { input: getInput, output: getOutput },
 *     create: { input: createInput, output: createOutput }
 *   }
 * };
 * ```
 *
 * @group Service Definition
 */
export interface ServiceDefinition<T extends Record<string, ServiceMethodDefinition<any, any>>> {
  /** Unique identifier for this service, used for routing and method namespacing */
  id: string;
  /** Object mapping method names to their input/output schema definitions */
  methods: T;
}

/**
 * Type representing the implementation function for a service method.
 * Automatically infers input and output types from the method definition.
 *
 * @template T - ServiceMethodDefinition to create handler type for
 *
 * @example
 * ```typescript
 * const getUserHandler: ServiceMethodHandler<typeof getUserMethod> =
 *   async ({ userId }) => ({ name: 'John', email: 'john@example.com' });
 * ```
 *
 * @group Service Definition
 */
export type ServiceMethodHandler<T extends ServiceMethodDefinition<any, any>> =
  T extends ServiceMethodDefinition<infer I, infer O>
    ? (input: z.infer<I>) => Promise<z.infer<O>>
    : never;

/**
 * Type representing the complete implementation of a service.
 * Maps each method name to its corresponding handler function with proper typing.
 *
 * @template T - Service methods record type
 *
 * @example
 * ```typescript
 * const userImplementation: ServiceImplementation<typeof userService.methods> = {
 *   get: async ({ userId }) => ({ name: `User ${userId}`, email: `user${userId}@example.com` }),
 *   create: async ({ name, email }) => ({ id: '123', success: true })
 * };
 * ```
 *
 * @group Service Definition
 */
export type ServiceImplementation<T extends Record<string, ServiceMethodDefinition<any, any>>> = {
  [K in keyof T]: ServiceMethodHandler<T[K]>;
};

/**
 * Type representing the client-side interface for calling service methods.
 * Each method becomes a callable function with proper input/output typing.
 *
 * @template T - Service methods record type
 *
 * @example
 * ```typescript
 * const client: ServiceClient<typeof userService.methods> = {
 *   get: async ({ userId }, options?) => ({ name: 'John', email: 'john@example.com' }),
 *   create: async ({ name, email }, options?) => ({ id: '123', success: true })
 * };
 *
 * // Usage:
 * const user = await client.get({ userId: '123' });
 * const result = await client.create({ name: 'Alice', email: 'alice@example.com' }, { timeout: 5000 });
 * ```
 *
 * @group Service Definition
 */
export type ServiceClient<T extends Record<string, ServiceMethodDefinition<any, any>>> = {
  [K in keyof T]: T[K] extends ServiceMethodDefinition<infer I, infer O>
    ? (input: z.infer<I>, options?: { timeout?: number; target?: string }) => Promise<z.infer<O>>
    : never;
};

/**
 * Type utility to extract the client interface type from a ServiceDefinition.
 * Useful for creating properly typed RPC clients.
 *
 * @template T - ServiceDefinition to extract client type from
 *
 * @example
 * ```typescript
 * type UserClient = InferServiceClient<typeof userService>;
 * // UserClient has methods: get(input, options?) and create(input, options?)
 * ```
 *
 * @group Service Definition
 */
export type InferServiceClient<T extends ServiceDefinition<any>> =
  T extends ServiceDefinition<infer S> ? ServiceClient<S> : never;

/**
 * Define a new RPC service with typed methods.
 *
 * @param id - Unique identifier for the service
 * @param methods - Object containing method definitions with input/output Zod schemas
 * @returns A service definition that can be used with clients and servers
 *
 * @example
 * ```typescript
 * const userService = defineService('user', {
 *   get: {
 *     input: z.object({ userId: z.string() }),
 *     output: z.object({ id: z.string(), name: z.string() })
 *   }
 * });
 * ```
 * @group Service Definition
 */
export function defineService<T extends Record<string, ServiceMethodDefinition<any, any>>>(
  id: string,
  methods: T,
): ServiceDefinition<T> {
  return { id, methods };
}

/**
 * Internal utility to convert a ServiceDefinition into MethodContracts.
 * Used by the RPC client to create callable methods with proper validation.
 *
 * @template T - Service methods record type
 * @param service - The service definition to convert
 * @returns Object mapping method names to their contracts
 *
 * @example
 * ```typescript
 * const contracts = createServiceContracts(userService);
 * // contracts.get: { id: 'user.get', input: inputSchema, output: outputSchema }
 * ```
 *
 * @group Service Definition
 */
export function createServiceContracts<T extends Record<string, ServiceMethodDefinition<any, any>>>(
  service: ServiceDefinition<T>,
): { [K in keyof T]: MethodContract<T[K]['input'], T[K]['output']> } {
  const contracts = {} as { [K in keyof T]: MethodContract<T[K]['input'], T[K]['output']> };

  for (const [methodName, methodDef] of Object.entries(service.methods)) {
    contracts[methodName as keyof T] = {
      id: `${service.id}.${methodName}`,
      input: methodDef.input,
      output: methodDef.output,
    };
  }

  return contracts;
}

/**
 * Combine a service definition with its implementation to create executable RPC methods.
 * Used internally by RPC servers to register service implementations.
 *
 * @template T - Service methods record type
 * @param service - The service definition with schemas
 * @param implementation - The actual implementation functions
 * @param targetId - Target identifier for routing messages to this implementation
 * @returns Array of executable method definitions
 *
 * @example
 * ```typescript
 * const methods = implementService(userService, {
 *   get: async ({ userId }) => ({ name: `User ${userId}`, email: `user${userId}@example.com` }),
 *   create: async ({ name, email }) => ({ id: '123', success: true })
 * }, 'server');
 * ```
 *
 * @group Service Definition
 */
export function implementService<T extends Record<string, ServiceMethodDefinition<any, any>>>(
  service: ServiceDefinition<T>,
  implementation: ServiceImplementation<T>,
  targetId: string,
): MethodDefinition<any, any>[] {
  const methods: MethodDefinition<any, any>[] = [];

  for (const [methodName, methodDef] of Object.entries(service.methods)) {
    const handler = implementation[methodName as keyof T];
    methods.push({
      id: `${service.id}.${methodName}`,
      targetId,
      input: methodDef.input,
      output: methodDef.output,
      handler,
    });
  }

  return methods;
}

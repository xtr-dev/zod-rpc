import { z, ZodSchema } from 'zod';
import { MethodContract } from './method';
import { MethodDefinition } from './types';

/**
 * @group Service Definition
 */
export interface ServiceMethodDefinition<T extends ZodSchema, U extends ZodSchema> {
  input: T;
  output: U;
}

/**
 * @group Service Definition
 */
export interface ServiceDefinition<T extends Record<string, ServiceMethodDefinition<any, any>>> {
  id: string;
  methods: T;
}

/**
 * @group Service Definition
 */
export type ServiceMethodHandler<T extends ServiceMethodDefinition<any, any>> =
  T extends ServiceMethodDefinition<infer I, infer O>
    ? (input: z.infer<I>) => Promise<z.infer<O>>
    : never;

/**
 * @group Service Definition
 */
export type ServiceImplementation<T extends Record<string, ServiceMethodDefinition<any, any>>> = {
  [K in keyof T]: ServiceMethodHandler<T[K]>;
};

/**
 * @group Service Definition
 */
export type ServiceClient<T extends Record<string, ServiceMethodDefinition<any, any>>> = {
  [K in keyof T]: T[K] extends ServiceMethodDefinition<infer I, infer O>
    ? (input: z.infer<I>, options?: { timeout?: number; target?: string }) => Promise<z.infer<O>>
    : never;
};

/**
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

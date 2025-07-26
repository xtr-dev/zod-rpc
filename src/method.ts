import { z, ZodSchema } from 'zod';
import { MethodDefinition, InferInput, InferOutput } from './types';

export interface MethodContract<T extends ZodSchema, U extends ZodSchema> {
  id: string;
  input: T;
  output: U;
}

export function defineContract<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>
): MethodContract<T, U> {
  return contract;
}

export function implementContract<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>,
  handler: (input: z.infer<T>) => Promise<z.infer<U>>
): MethodDefinition<T, U> {
  return {
    ...contract,
    handler
  };
}

export function defineMethod<T extends ZodSchema, U extends ZodSchema>(definition: {
  id: string;
  input: T;
  output: U;
  handler: (input: z.infer<T>) => Promise<z.infer<U>>;
}): MethodDefinition<T, U> {
  return definition;
}

export function createMethodProxy<T extends Record<string, MethodDefinition<any, any>>>(
  methods: T,
  invoke: (methodId: string, input: any) => Promise<any>
): {
  [K in keyof T]: (input: InferInput<T[K]>) => Promise<InferOutput<T[K]>>;
} {
  const proxy = {} as any;
  
  for (const [key, method] of Object.entries(methods)) {
    proxy[key] = async (input: any) => {
      return invoke(method.id, input);
    };
  }
  
  return proxy;
}

// Overload for MethodContract
export function createTypedInvoker<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>,
  invoke: (targetId: string, methodId: string, input: any, inputSchema?: any, outputSchema?: any, timeout?: number) => Promise<any>
): (targetId: string, input: z.infer<T>, timeout?: number) => Promise<z.infer<U>>;

// Overload for MethodDefinition (backwards compatibility)
export function createTypedInvoker<T extends MethodDefinition<any, any>>(
  method: T,
  invoke: (targetId: string, methodId: string, input: any, inputSchema?: any, outputSchema?: any, timeout?: number) => Promise<any>
): (targetId: string, input: InferInput<T>, timeout?: number) => Promise<InferOutput<T>>;

// Implementation
export function createTypedInvoker<T extends MethodContract<any, any> | MethodDefinition<any, any>>(
  methodOrContract: T,
  invoke: (targetId: string, methodId: string, input: any, inputSchema?: any, outputSchema?: any, timeout?: number) => Promise<any>
): (targetId: string, input: any, timeout?: number) => Promise<any> {
  return async (targetId: string, input: any, timeout?: number): Promise<any> => {
    return invoke(targetId, methodOrContract.id, input, methodOrContract.input, methodOrContract.output, timeout);
  };
}
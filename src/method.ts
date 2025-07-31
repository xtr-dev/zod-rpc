import { z, ZodSchema } from 'zod';
import { MethodDefinition, InferInput, InferOutput } from './types';

export interface MethodContract<T extends ZodSchema, U extends ZodSchema> {
  id: string;
  input: T;
  output: U;
}

export function defineContract<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>,
): MethodContract<T, U> {
  return contract;
}

export function implementContract<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>,
  handler: (input: z.infer<T>) => Promise<z.infer<U>>,
): MethodDefinition<T, U> {
  return {
    ...contract,
    handler,
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
  invoke: (methodId: string, input: unknown) => Promise<unknown>,
): {
  [K in keyof T]: (input: InferInput<T[K]>) => Promise<InferOutput<T[K]>>;
} {
  const proxy = {} as {
    [K in keyof T]: (input: InferInput<T[K]>) => Promise<InferOutput<T[K]>>;
  };

  for (const [key, method] of Object.entries(methods)) {
    (proxy as any)[key] = async (
      input: InferInput<typeof method>,
    ): Promise<InferOutput<typeof method>> => {
      return invoke(method.id, input) as Promise<InferOutput<typeof method>>;
    };
  }

  return proxy;
}

export function createTypedInvoker<T extends ZodSchema, U extends ZodSchema>(
  contract: MethodContract<T, U>,
  invoke: (
    targetId: string,
    methodId: string,
    input: unknown,
    inputSchema?: ZodSchema,
    outputSchema?: ZodSchema,
    timeout?: number,
  ) => Promise<unknown>,
): (targetId: string, input: z.infer<T>, timeout?: number) => Promise<z.infer<U>> {
  return async (targetId: string, input: z.infer<T>, timeout?: number): Promise<z.infer<U>> => {
    return invoke(
      targetId,
      contract.id,
      input,
      contract.input,
      contract.output,
      timeout,
    ) as Promise<z.infer<U>>;
  };
}

export function createServiceClient<T extends Record<string, MethodContract<any, any>>>(
  serviceContracts: T,
  invoke: (
    targetId: string,
    methodId: string,
    input: unknown,
    inputSchema?: ZodSchema,
    outputSchema?: ZodSchema,
    timeout?: number,
  ) => Promise<unknown>,
): {
  [K in keyof T]: T[K] extends MethodContract<infer I, infer O>
    ? (targetId: string, input: z.infer<I>, timeout?: number) => Promise<z.infer<O>>
    : never;
} {
  const client = {} as {
    [K in keyof T]: T[K] extends MethodContract<infer I, infer O>
      ? (targetId: string, input: z.infer<I>, timeout?: number) => Promise<z.infer<O>>
      : never;
  };

  for (const [methodName, contract] of Object.entries(serviceContracts)) {
    (client as any)[methodName] = createTypedInvoker(contract, invoke);
  }

  return client;
}

export function createBoundServiceClient<T extends Record<string, MethodContract<any, any>>>(
  serviceContracts: T,
  targetId: string,
  invoke: (
    targetId: string,
    methodId: string,
    input: unknown,
    inputSchema?: ZodSchema,
    outputSchema?: ZodSchema,
    timeout?: number,
  ) => Promise<unknown>,
): {
  [K in keyof T]: T[K] extends MethodContract<infer I, infer O>
    ? (input: z.infer<I>, timeout?: number) => Promise<z.infer<O>>
    : never;
} {
  const client = {} as {
    [K in keyof T]: T[K] extends MethodContract<infer I, infer O>
      ? (input: z.infer<I>, timeout?: number) => Promise<z.infer<O>>
      : never;
  };

  for (const [methodName, contract] of Object.entries(serviceContracts)) {
    const typedInvoker = createTypedInvoker(contract, invoke);
    (client as any)[methodName] = (
      input: z.infer<typeof contract.input>,
      timeout?: number,
    ): Promise<z.infer<typeof contract.output>> => {
      return typedInvoker(targetId, input, timeout);
    };
  }

  return client;
}

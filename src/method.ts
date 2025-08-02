import { z, ZodSchema } from 'zod';

export interface MethodContract<T extends ZodSchema, U extends ZodSchema> {
  id: string;
  input: T;
  output: U;
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
    (client as Record<string, Function>)[methodName] = (
      input: z.infer<typeof contract.input>,
      timeout?: number,
    ): Promise<z.infer<typeof contract.output>> => {
      return typedInvoker(targetId, input, timeout);
    };
  }

  return client;
}

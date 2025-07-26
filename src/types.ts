import { z, ZodSchema } from 'zod';

export interface RPCMessage {
  callerId: string;
  targetId: string;
  traceId: string;
  methodId: string;
  payload: unknown;
  type: 'request' | 'response' | 'error';
}

export interface MethodDefinition<T extends ZodSchema, U extends ZodSchema> {
  id: string;
  input: T;
  output: U;
  handler: (input: z.infer<T>) => Promise<z.infer<U>>;
}

export interface MethodInfo {
  id: string;
  name: string;
}

export interface ServiceInfo {
  id: string;
  methods: MethodInfo[];
}

export type InferInput<T> = T extends MethodDefinition<infer I, any> ? z.infer<I> : never;
export type InferOutput<T> = T extends MethodDefinition<any, infer O> ? z.infer<O> : never;

export interface Transport {
  send(message: RPCMessage): Promise<void>;
  onMessage(handler: (message: RPCMessage) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
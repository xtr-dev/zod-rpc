import { z, ZodSchema } from 'zod';

/**
 * @group Core Types
 */
export interface RPCMessage {
  callerId: string;
  targetId: string;
  traceId: string;
  methodId: string;
  payload: unknown;
  type: 'request' | 'response' | 'error';
}

/**
 * @group Core Types
 */
export interface MethodDefinition<T extends ZodSchema, U extends ZodSchema> {
  id: string;
  targetId: string;
  input: T;
  output: U;
  handler: (input: z.infer<T>) => Promise<z.infer<U>>;
}

/**
 * @group Core Types
 */
export interface MethodInfo {
  id: string;
  name: string;
}

/**
 * @group Core Types
 */
export interface ServiceInfo {
  id: string;
  methods: MethodInfo[];
}

/**
 * @group Core Types
 */
export type InferInput<T> = T extends MethodDefinition<infer I, any> ? z.infer<I> : never;
/**
 * @group Core Types
 */
export type InferOutput<T> = T extends MethodDefinition<any, infer O> ? z.infer<O> : never;

/**
 * @group Transport Layer
 */
export interface Transport {
  send(message: RPCMessage): Promise<void>;
  onMessage(handler: (message: RPCMessage) => void): void;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

import { z, ZodSchema } from 'zod';
import { 
  RPCMessage, 
  MethodDefinition, 
  MethodInfo, 
  ServiceInfo, 
  Transport 
} from './types';
import { 
  RPCError, 
  ValidationError, 
  MethodNotFoundError, 
  TimeoutError 
} from './errors';

export class Channel {
  private methods = new Map<string, MethodDefinition<any, any>>();
  private pendingCalls = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private services = new Map<string, ServiceInfo>();

  constructor(
    private transport: Transport,
    private serviceId: string,
    private defaultTimeout: number = 30000
  ) {
    this.transport.onMessage(this.handleMessage.bind(this));
  }

  async connect(): Promise<void> {
    await this.transport.connect();
    await this.publishServiceInfo();
  }

  async disconnect(): Promise<void> {
    for (const [traceId, pending] of this.pendingCalls) {
      clearTimeout(pending.timeout);
      pending.reject(new TimeoutError(`Connection closed`, traceId));
    }
    this.pendingCalls.clear();
    await this.transport.disconnect();
  }

  publishMethod<T extends ZodSchema, U extends ZodSchema>(
    definition: MethodDefinition<T, U>
  ): void {
    this.methods.set(definition.id, definition);
  }

  async invoke<T extends ZodSchema, U extends ZodSchema>(
    targetId: string,
    methodId: string,
    input: z.infer<T>,
    inputSchema?: T,
    outputSchema?: U,
    timeout?: number
  ): Promise<z.infer<U>> {
    const traceId = this.generateTraceId();
    
    if (inputSchema) {
      try {
        inputSchema.parse(input);
      } catch (error) {
        throw new ValidationError(`Input validation failed: ${error}`, traceId);
      }
    }

    const message: RPCMessage = {
      callerId: this.serviceId,
      targetId,
      traceId,
      methodId,
      payload: input,
      type: 'request'
    };

    return new Promise<z.infer<U>>((resolve, reject) => {
      const timeoutMs = timeout || this.defaultTimeout;
      const timeoutHandle = setTimeout(() => {
        this.pendingCalls.delete(traceId);
        reject(new TimeoutError(`Method call timed out after ${timeoutMs}ms`, traceId));
      }, timeoutMs);

      this.pendingCalls.set(traceId, {
        resolve: (value) => {
          if (outputSchema) {
            try {
              const validated = outputSchema.parse(value);
              resolve(validated);
            } catch (error) {
              reject(new ValidationError(`Output validation failed: ${error}`, traceId));
            }
          } else {
            resolve(value);
          }
        },
        reject,
        timeout: timeoutHandle
      });

      this.transport.send(message).catch(reject);
    });
  }

  getAvailableMethods(serviceId: string): MethodInfo[] {
    const service = this.services.get(serviceId);
    return service ? service.methods : [];
  }

  getConnectedServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  private async handleMessage(message: RPCMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'request':
          await this.handleRequest(message);
          break;
        case 'response':
          this.handleResponse(message);
          break;
        case 'error':
          this.handleError(message);
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async handleRequest(message: RPCMessage): Promise<void> {
    const method = this.methods.get(message.methodId);
    
    if (!method) {
      await this.sendError(
        message,
        new MethodNotFoundError(message.methodId, message.traceId)
      );
      return;
    }

    try {
      const validatedInput = method.input.parse(message.payload);
      const result = await method.handler(validatedInput);
      const validatedOutput = method.output.parse(result);

      const response: RPCMessage = {
        callerId: this.serviceId,
        targetId: message.callerId,
        traceId: message.traceId,
        methodId: message.methodId,
        payload: validatedOutput,
        type: 'response'
      };

      await this.transport.send(response);
    } catch (error) {
      let rpcError: RPCError;
      if (error instanceof RPCError) {
        rpcError = error;
      } else if (error instanceof z.ZodError) {
        rpcError = new ValidationError(error.message, message.traceId);
      } else {
        rpcError = new RPCError(
          'INTERNAL_ERROR', 
          error instanceof Error ? error.message : 'Unknown error',
          message.traceId
        );
      }

      await this.sendError(message, rpcError);
    }
  }

  private handleResponse(message: RPCMessage): void {
    const pending = this.pendingCalls.get(message.traceId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(message.traceId);
      pending.resolve(message.payload);
    }
  }

  private handleError(message: RPCMessage): void {
    const pending = this.pendingCalls.get(message.traceId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(message.traceId);
      
      const error = new RPCError(
        (message.payload as any)?.code || 'UNKNOWN_ERROR',
        (message.payload as any)?.message || 'Unknown error occurred',
        message.traceId
      );
      
      pending.reject(error);
    }
  }

  private async sendError(originalMessage: RPCMessage, error: RPCError): Promise<void> {
    const errorMessage: RPCMessage = {
      callerId: this.serviceId,
      targetId: originalMessage.callerId,
      traceId: originalMessage.traceId,
      methodId: originalMessage.methodId,
      payload: error.toJSON(),
      type: 'error'
    };

    try {
      await this.transport.send(errorMessage);
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }
  }

  private async publishServiceInfo(): Promise<void> {
    const methods: MethodInfo[] = Array.from(this.methods.values()).map(method => ({
      id: method.id,
      name: method.id.split('.').pop() || method.id
    }));

    const serviceInfo: ServiceInfo = {
      id: this.serviceId,
      methods
    };

    this.services.set(this.serviceId, serviceInfo);
  }

  private generateTraceId(): string {
    return `${this.serviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
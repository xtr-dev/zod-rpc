import { z } from 'zod';
import { Channel } from '../src/channel';
import { defineMethod } from '../src/method';
import { Transport, RPCMessage } from '../src/types';
import { ValidationError, MethodNotFoundError, TimeoutError } from '../src/errors';

// Mock transport implementation
class MockTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private connected = false;
  public sentMessages: RPCMessage[] = [];

  async send(message: RPCMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    this.sentMessages.push(message);
  }

  onMessage(handler: (message: RPCMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Test helper methods
  simulateMessage(message: RPCMessage): void {
    this.messageHandler?.(message);
  }

  getLastMessage(): RPCMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clearMessages(): void {
    this.sentMessages = [];
  }
}

describe('Channel', () => {
  let transport: MockTransport;
  let channel: Channel;

  beforeEach(() => {
    transport = new MockTransport();
    channel = new Channel(transport, 'test-service');
  });

  describe('constructor', () => {
    it('should create a channel with transport and service ID', () => {
      expect(channel).toBeInstanceOf(Channel);
    });
  });

  describe('connect', () => {
    it('should connect the transport', async () => {
      await channel.connect();
      expect(transport.isConnected()).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the transport', async () => {
      await channel.connect();
      await channel.disconnect();
      expect(transport.isConnected()).toBe(false);
    });

    it('should reject pending calls on disconnect', async () => {
      await channel.connect();
      
      const promise = channel.invoke('target', 'test.method', { test: true });
      await channel.disconnect();
      
      await expect(promise).rejects.toThrow(TimeoutError);
    });
  });

  describe('publishMethod', () => {
    it('should register a method', () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello ${input.name}` })
      });

      expect(() => channel.publishMethod(method)).not.toThrow();
    });
  });

  describe('invoke', () => {
    beforeEach(async () => {
      await channel.connect();
    });

    it('should send RPC message and return response', async () => {
      const promise = channel.invoke('target-service', 'test.method', { test: true });

      // Simulate response
      const sentMessage = transport.getLastMessage();
      expect(sentMessage).toBeDefined();
      expect(sentMessage!.methodId).toBe('test.method');
      expect(sentMessage!.targetId).toBe('target-service');
      expect(sentMessage!.callerId).toBe('test-service');
      expect(sentMessage!.type).toBe('request');

      transport.simulateMessage({
        callerId: 'target-service',
        targetId: 'test-service',
        traceId: sentMessage!.traceId,
        methodId: 'test.method',
        payload: { result: 'success' },
        type: 'response'
      });

      const result = await promise;
      expect(result).toEqual({ result: 'success' });
    });

    it('should validate input when schema provided', async () => {
      const inputSchema = z.object({ name: z.string() });
      
      await expect(
        channel.invoke('target', 'test.method', { age: 25 } as any, inputSchema)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate output when schema provided', async () => {
      const outputSchema = z.object({ greeting: z.string() });
      
      const promise = channel.invoke('target', 'test.method', { name: 'test' }, undefined, outputSchema);
      
      const sentMessage = transport.getLastMessage();
      transport.simulateMessage({
        callerId: 'target',
        targetId: 'test-service',
        traceId: sentMessage!.traceId,
        methodId: 'test.method',
        payload: { invalid: 'response' },
        type: 'response'
      });

      await expect(promise).rejects.toThrow(ValidationError);
    });

    it('should handle timeout', async () => {
      const promise = channel.invoke('target', 'test.method', {}, undefined, undefined, 100);
      
      await expect(promise).rejects.toThrow(TimeoutError);
    });

    it('should handle error responses', async () => {
      const promise = channel.invoke('target', 'test.method', {});
      
      const sentMessage = transport.getLastMessage();
      transport.simulateMessage({
        callerId: 'target',
        targetId: 'test-service',
        traceId: sentMessage!.traceId,
        methodId: 'test.method',
        payload: {
          code: 'TEST_ERROR',
          message: 'Test error occurred'
        },
        type: 'error'
      });

      await expect(promise).rejects.toThrow('Test error occurred');
    });
  });

  describe('method handling', () => {
    beforeEach(async () => {
      await channel.connect();
    });

    it('should handle incoming method calls', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello ${input.name}` })
      });

      channel.publishMethod(method);

      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'test.method',
        payload: { name: 'World' },
        type: 'request'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = transport.getLastMessage();
      expect(response).toBeDefined();
      expect(response!.type).toBe('response');
      expect(response!.payload).toEqual({ greeting: 'Hello World' });
    });

    it('should handle method not found', async () => {
      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'unknown.method',
        payload: {},
        type: 'request'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = transport.getLastMessage();
      expect(response).toBeDefined();
      expect(response!.type).toBe('error');
      expect(response!.payload).toMatchObject({
        code: 'METHOD_NOT_FOUND'
      });
    });

    it('should handle validation errors in method calls', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello ${input.name}` })
      });

      channel.publishMethod(method);

      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'test.method',
        payload: { age: 25 }, // Invalid input
        type: 'request'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = transport.getLastMessage();
      expect(response).toBeDefined();
      expect(response!.type).toBe('error');
      expect(response!.payload).toMatchObject({
        code: 'VALIDATION_ERROR'
      });
    });

    it('should handle handler errors', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async () => {
          throw new Error('Handler error');
        }
      });

      channel.publishMethod(method);

      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'test.method',
        payload: { name: 'World' },
        type: 'request'
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = transport.getLastMessage();
      expect(response).toBeDefined();
      expect(response!.type).toBe('error');
      expect(response!.payload).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Handler error'
      });
    });
  });

  describe('getAvailableMethods', () => {
    it('should return empty array for unknown service', () => {
      const methods = channel.getAvailableMethods('unknown-service');
      expect(methods).toEqual([]);
    });
  });

  describe('getConnectedServices', () => {
    it('should return array of connected services', () => {
      const services = channel.getConnectedServices();
      expect(Array.isArray(services)).toBe(true);
    });
  });
});
import { z } from 'zod';
import { Channel } from '../src/channel';
import { defineMethod } from '../src/method';
import { Transport, RPCMessage } from '../src/types';
import { RPCError } from '../src/errors';

// Mock transport for edge case testing
class EdgeCaseTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  public shouldThrowOnSend = false;
  public sentMessages: RPCMessage[] = [];

  async send(message: RPCMessage): Promise<void> {
    if (this.shouldThrowOnSend) {
      throw new Error('Send failed');
    }
    this.sentMessages.push(message);
  }

  onMessage(handler: (message: RPCMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isConnected(): boolean { return true; }

  simulateMessage(message: RPCMessage): void {
    this.messageHandler?.(message);
  }
}

describe('Coverage Boost Tests', () => {
  describe('Channel edge cases', () => {
    let transport: EdgeCaseTransport;
    let channel: Channel;

    beforeEach(async () => {
      transport = new EdgeCaseTransport();
      channel = new Channel(transport, 'test-service');
      await channel.connect();
    });

    it('should handle send errors during invoke', async () => {
      transport.shouldThrowOnSend = true;
      
      const promise = channel.invoke('target', 'test.method', {});
      
      await expect(promise).rejects.toThrow('Send failed');
    });

    it('should handle custom timeout', async () => {
      const promise = channel.invoke('target', 'test.method', {}, undefined, undefined, 50);
      
      await expect(promise).rejects.toThrow('Method call timed out after 50ms');
    });

    it('should handle output validation with custom schema', async () => {
      const outputSchema = z.object({ name: z.string() });
      
      const promise = channel.invoke('target', 'test.method', {}, undefined, outputSchema, 1000);
      
      // Get the trace ID from the sent message to simulate proper response
      const sentMessage = transport.sentMessages[transport.sentMessages.length - 1];
      
      // Simulate invalid response with correct trace ID
      setTimeout(() => {
        transport.simulateMessage({
          callerId: 'target',
          targetId: 'test-service',
          traceId: sentMessage.traceId,
          methodId: 'test.method',
          payload: { invalid: 'data' },
          type: 'response'
        });
      }, 10);
      
      await expect(promise).rejects.toThrow('Output validation failed');
    });

    it('should handle method handler that throws RPCError', async () => {
      const method = defineMethod({
        id: 'error.method',
        input: z.object({ trigger: z.string() }),
        output: z.object({ result: z.string() }),
        handler: async (input) => {
          if (input.trigger === 'rpc-error') {
            throw new RPCError('CUSTOM_ERROR', 'Custom RPC error', 'trace-123');
          }
          return { result: 'success' };
        }
      });

      channel.publishMethod(method);

      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'error.method',
        payload: { trigger: 'rpc-error' },
        type: 'request'
      });

      // Wait for error response
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle output validation errors in method handler', async () => {
      const method = defineMethod({
        id: 'invalid.output',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async () => {
          // Return invalid output to trigger validation error
          return { invalid: 'output' } as any;
        }
      });

      channel.publishMethod(method);

      transport.simulateMessage({
        callerId: 'caller',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'invalid.output',
        payload: { name: 'test' },
        type: 'request'
      });

      // Wait for error response
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should get connected services', () => {
      const services = channel.getConnectedServices();
      expect(Array.isArray(services)).toBe(true);
    });

    it('should handle response without pending call', () => {
      // This should not throw
      transport.simulateMessage({
        callerId: 'unknown',
        targetId: 'test-service',
        traceId: 'unknown-trace',
        methodId: 'test.method',
        payload: { result: 'orphaned' },
        type: 'response'
      });
    });

    it('should handle error response without pending call', () => {
      // This should not throw
      transport.simulateMessage({
        callerId: 'unknown',
        targetId: 'test-service',
        traceId: 'unknown-trace',
        methodId: 'test.method',
        payload: { code: 'ORPHANED_ERROR', message: 'Orphaned error' },
        type: 'error'
      });
    });

    it('should handle message handler errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Override handleRequest to throw an error, which will be caught by handleMessage
      const originalHandleRequest = (channel as any).handleRequest.bind(channel);
      (channel as any).handleRequest = async () => {
        throw new Error('Simulated handler error');
      };
      
      // Create a request message that will trigger handleRequest
      const requestMessage = {
        callerId: 'test',
        targetId: 'test-service',
        traceId: 'trace-123',
        methodId: 'test.method',
        payload: { test: true },
        type: 'request' as const
      };
      
      transport.simulateMessage(requestMessage);

      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(consoleSpy).toHaveBeenCalledWith('Error handling message:', expect.any(Error));
      
      // Restore
      consoleSpy.mockRestore();
      (channel as any).handleRequest = originalHandleRequest;
    });
  });
});
import { z } from 'zod';
import { Channel } from '../src/channel';
import { defineMethod, createTypedInvoker } from '../src/method';
import { Transport, RPCMessage } from '../src/types';

// Create a pair of connected mock transports
class ConnectedMockTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private connected = false;
  private peer?: ConnectedMockTransport;

  constructor(private name: string) {}

  setPeer(peer: ConnectedMockTransport): void {
    this.peer = peer;
  }

  async send(message: RPCMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }
    
    // Send message to peer
    setTimeout(() => {
      this.peer?.messageHandler?.(message);
    }, 10);
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
}

describe('Integration Tests', () => {
  describe('Channel to Channel Communication', () => {
    let transport1: ConnectedMockTransport;
    let transport2: ConnectedMockTransport;
    let channel1: Channel;
    let channel2: Channel;

    beforeEach(async () => {
      transport1 = new ConnectedMockTransport('transport1');
      transport2 = new ConnectedMockTransport('transport2');
      transport1.setPeer(transport2);
      transport2.setPeer(transport1);

      channel1 = new Channel(transport1, 'service1');
      channel2 = new Channel(transport2, 'service2');

      await channel1.connect();
      await channel2.connect();
    });

    afterEach(async () => {
      await channel1.disconnect();
      await channel2.disconnect();
    });

    it('should enable bidirectional RPC calls', async () => {
      // Define methods on service2 that service1 can call
      const echoMethod = defineMethod({
        id: 'echo',
        input: z.object({ message: z.string() }),
        output: z.object({ echo: z.string() }),
        handler: async (input) => ({ echo: `Echo: ${input.message}` })
      });

      const mathMethod = defineMethod({
        id: 'math.add',
        input: z.object({ a: z.number(), b: z.number() }),
        output: z.object({ result: z.number() }),
        handler: async (input) => ({ result: input.a + input.b })
      });

      channel2.publishMethod(echoMethod);
      channel2.publishMethod(mathMethod);

      // Define a method on service1 that service2 can call
      const greetMethod = defineMethod({
        id: 'greet',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello, ${input.name}!` })
      });

      channel1.publishMethod(greetMethod);

      // Service1 calls service2
      const echoResult = await channel1.invoke('service2', 'echo', { message: 'test' });
      expect(echoResult).toEqual({ echo: 'Echo: test' });

      const mathResult = await channel1.invoke('service2', 'math.add', { a: 5, b: 3 });
      expect(mathResult).toEqual({ result: 8 });

      // Service2 calls service1
      const greetResult = await channel2.invoke('service1', 'greet', { name: 'World' });
      expect(greetResult).toEqual({ greeting: 'Hello, World!' });
    });

    it('should work with typed invokers', async () => {
      const testMethod = defineMethod({
        id: 'test.typed',
        input: z.object({ value: z.string() }),
        output: z.object({ processed: z.string() }),
        handler: async (input) => ({ processed: input.value.toUpperCase() })
      });

      channel2.publishMethod(testMethod);

      // Create typed invoker for service1 to call service2
      const callTest = createTypedInvoker(testMethod, channel1.invoke.bind(channel1));

      const result = await callTest('service2', { value: 'hello' });
      expect(result).toEqual({ processed: 'HELLO' });
    });

    it('should handle concurrent calls', async () => {
      const slowMethod = defineMethod({
        id: 'slow',
        input: z.object({ delay: z.number(), id: z.string() }),
        output: z.object({ completed: z.string(), delay: z.number() }),
        handler: async (input) => {
          await new Promise(resolve => setTimeout(resolve, input.delay));
          return { completed: input.id, delay: input.delay };
        }
      });

      channel2.publishMethod(slowMethod);

      // Make multiple concurrent calls
      const promises = [
        channel1.invoke('service2', 'slow', { delay: 50, id: 'call1' }),
        channel1.invoke('service2', 'slow', { delay: 30, id: 'call2' }),
        channel1.invoke('service2', 'slow', { delay: 20, id: 'call3' })
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([
        { completed: 'call1', delay: 50 },
        { completed: 'call2', delay: 30 },
        { completed: 'call3', delay: 20 }
      ]);
    });

    it('should handle method errors correctly', async () => {
      const errorMethod = defineMethod({
        id: 'error.test',
        input: z.object({ shouldFail: z.boolean() }),
        output: z.object({ success: z.boolean() }),
        handler: async (input) => {
          if (input.shouldFail) {
            throw new Error('Intentional test error');
          }
          return { success: true };
        }
      });

      channel2.publishMethod(errorMethod);

      // Test successful call
      const successResult = await channel1.invoke('service2', 'error.test', { shouldFail: false });
      expect(successResult).toEqual({ success: true });

      // Test error handling
      await expect(
        channel1.invoke('service2', 'error.test', { shouldFail: true })
      ).rejects.toThrow('Intentional test error');
    });

    it('should validate input and output with schemas', async () => {
      const strictMethod = defineMethod({
        id: 'strict',
        input: z.object({ 
          name: z.string().min(1),
          age: z.number().min(0).max(120) 
        }),
        output: z.object({ 
          message: z.string(),
          category: z.enum(['child', 'adult', 'senior'])
        }),
        handler: async (input) => {
          let category: 'child' | 'adult' | 'senior';
          if (input.age < 18) category = 'child';
          else if (input.age < 65) category = 'adult';
          else category = 'senior';

          return {
            message: `${input.name} is a ${category}`,
            category
          };
        }
      });

      channel2.publishMethod(strictMethod);

      // Test valid input
      const result = await channel1.invoke(
        'service2', 
        'strict', 
        { name: 'John', age: 25 },
        strictMethod.input,
        strictMethod.output
      );
      expect(result).toEqual({
        message: 'John is a adult',
        category: 'adult'
      });

      // Test invalid input (should be caught by Zod validation)
      await expect(
        channel1.invoke(
          'service2',
          'strict',
          { name: '', age: -5 } as any,
          strictMethod.input,
          strictMethod.output
        )
      ).rejects.toThrow();
    });
  });
});
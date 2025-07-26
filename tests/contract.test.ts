import { z } from 'zod';
import { defineContract, implementContract, createTypedInvoker, MethodContract } from '../src/method';
import { Channel } from '../src/channel';
import { Transport, RPCMessage } from '../src/types';

// Mock transport for testing
class MockTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private connected = false;
  public sentMessages: RPCMessage[] = [];

  async send(message: RPCMessage): Promise<void> {
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

  simulateMessage(message: RPCMessage): void {
    this.messageHandler?.(message);
  }

  getLastMessage(): RPCMessage | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }
}

describe('Method Contracts', () => {
  describe('defineContract', () => {
    it('should create a method contract without handler', () => {
      const contract = defineContract({
        id: 'user.get',
        input: z.object({ userId: z.string() }),
        output: z.object({ name: z.string(), email: z.string() })
      });

      expect(contract.id).toBe('user.get');
      expect(contract.input).toBeDefined();
      expect(contract.output).toBeDefined();
      expect('handler' in contract).toBe(false);
    });

    it('should have correct type inference', () => {
      const contract = defineContract({
        id: 'math.add',
        input: z.object({ a: z.number(), b: z.number() }),
        output: z.object({ result: z.number() })
      });

      // Type checking - these should compile without errors
      const input: z.infer<typeof contract.input> = { a: 1, b: 2 };
      const output: z.infer<typeof contract.output> = { result: 3 };

      expect(input).toEqual({ a: 1, b: 2 });
      expect(output).toEqual({ result: 3 });
    });
  });

  describe('implementContract', () => {
    it('should add handler to contract to create method definition', async () => {
      const contract = defineContract({
        id: 'user.get',
        input: z.object({ userId: z.string() }),
        output: z.object({ name: z.string(), email: z.string() })
      });

      const method = implementContract(contract, async (input) => ({
        name: `User ${input.userId}`,
        email: `user${input.userId}@example.com`
      }));

      expect(method.id).toBe('user.get');
      expect(method.input).toBe(contract.input);
      expect(method.output).toBe(contract.output);
      expect(typeof method.handler).toBe('function');

      // Test handler execution
      const result = await method.handler({ userId: '123' });
      expect(result).toEqual({
        name: 'User 123',
        email: 'user123@example.com'
      });
    });
  });

  describe('createTypedInvoker with contract', () => {
    let transport: MockTransport;
    let channel: Channel;

    beforeEach(async () => {
      transport = new MockTransport();
      channel = new Channel(transport, 'test-service');
      await channel.connect();
    });

    it('should create typed invoker from contract', async () => {
      const contract = defineContract({
        id: 'echo.test',
        input: z.object({ message: z.string() }),
        output: z.object({ echo: z.string() })
      });

      const invokeEcho = createTypedInvoker(contract, channel.invoke.bind(channel));

      // Start the invoke call
      const promise = invokeEcho('target-service', { message: 'hello' });

      // Verify message was sent
      const sentMessage = transport.getLastMessage();
      expect(sentMessage).toBeDefined();
      expect(sentMessage!.methodId).toBe('echo.test');
      expect(sentMessage!.payload).toEqual({ message: 'hello' });

      // Simulate response
      transport.simulateMessage({
        callerId: 'target-service',
        targetId: 'test-service',
        traceId: sentMessage!.traceId,
        methodId: 'echo.test',
        payload: { echo: 'hello' },
        type: 'response'
      });

      const result = await promise;
      expect(result).toEqual({ echo: 'hello' });
    });

    it('should provide type safety for input and output', async () => {
      const contract = defineContract({
        id: 'math.multiply',
        input: z.object({ x: z.number(), y: z.number() }),
        output: z.object({ product: z.number() })
      });

      const multiply = createTypedInvoker(contract, channel.invoke.bind(channel));

      // This should compile and work
      const promise = multiply('calc-service', { x: 5, y: 3 });

      const sentMessage = transport.getLastMessage();
      transport.simulateMessage({
        callerId: 'calc-service',
        targetId: 'test-service',
        traceId: sentMessage!.traceId,
        methodId: 'math.multiply',
        payload: { product: 15 },
        type: 'response'
      });

      const result = await promise;
      // TypeScript should know result has type { product: number }
      expect(result.product).toBe(15);
    });
  });

  describe('Contract-based client-server pattern', () => {
    it('should enable clean separation between client and server', async () => {
      // Shared contract (would be in shared package/file)
      const userContract = defineContract({
        id: 'user.get',
        input: z.object({ userId: z.string() }),
        output: z.object({ name: z.string(), email: z.string(), age: z.number() })
      });

      // Server implementation
      const serverTransport = new MockTransport();
      const serverChannel = new Channel(serverTransport, 'user-service');
      
      const userMethod = implementContract(userContract, async (input) => ({
        name: `User ${input.userId}`,
        email: `user${input.userId}@example.com`,
        age: 25
      }));
      
      serverChannel.publishMethod(userMethod);
      await serverChannel.connect();

      // Client usage
      const clientTransport = new MockTransport();
      const clientChannel = new Channel(clientTransport, 'client');
      await clientChannel.connect();

      const getUser = createTypedInvoker(userContract, clientChannel.invoke.bind(clientChannel));

      // Simulate client call
      const promise = getUser('user-service', { userId: '456' });

      // Get the message and simulate server processing
      const clientMessage = clientTransport.getLastMessage();
      expect(clientMessage!.methodId).toBe('user.get');

      // Simulate the server receiving and responding
      const serverResponse = await userMethod.handler({ userId: '456' });
      
      // Simulate response back to client
      clientTransport.simulateMessage({
        callerId: 'user-service',
        targetId: 'client',
        traceId: clientMessage!.traceId,
        methodId: 'user.get',
        payload: serverResponse,
        type: 'response'
      });

      const result = await promise;
      expect(result).toEqual({
        name: 'User 456',
        email: 'user456@example.com',
        age: 25
      });

      // TypeScript knows the exact shape of result
      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
      expect(typeof result.age).toBe('number');
    });
  });
});
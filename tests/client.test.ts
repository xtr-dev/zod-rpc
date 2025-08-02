import { z } from 'zod';
import { defineService } from '../src/service';
import { createRpcClient, connect } from '../src/client';
import { Channel } from '../src/channel';

// Mock WebSocket for testing
const mockWebSocket = {
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // WebSocket.OPEN
  close: jest.fn(),
};

jest.mock('ws', () => ({
  WebSocket: jest.fn(() => mockWebSocket),
}));

// Mock the transport
const mockTransport = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  onMessage: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
};

jest.mock('../src/transports', () => ({
  createWebSocketTransport: jest.fn(() => mockTransport),
  createHTTPTransport: jest.fn(() => mockTransport),
}));

// Mock Channel
const mockChannel = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  invoke: jest.fn(),
  publishMethod: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
};

jest.mock('../src/channel', () => ({
  Channel: jest.fn(() => mockChannel),
}));

describe('Client API', () => {
  const testService = defineService('test', {
    echo: {
      input: z.object({ message: z.string() }),
      output: z.object({ response: z.string() }),
    },
    add: {
      input: z.object({ a: z.number(), b: z.number() }),
      output: z.object({ result: z.number() }),
    },
  });

  const userService = defineService('user', {
    get: {
      input: z.object({ id: z.string() }),
      output: z.object({ name: z.string(), email: z.string() }),
    },
    create: {
      input: z.object({ name: z.string(), email: z.string() }),
      output: z.object({ id: z.string(), success: z.boolean() }),
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRpcClient', () => {
    it('should create client with WebSocket transport for ws:// URLs', async () => {
      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
      });

      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
      expect(client.test.echo).toBeInstanceOf(Function);
      expect(client.test.add).toBeInstanceOf(Function);
      expect(client.disconnect).toBeInstanceOf(Function);
      expect(client.isConnected).toBeInstanceOf(Function);
      expect(client.setDefaultTarget).toBeInstanceOf(Function);
    });

    it('should create client with HTTP transport for http:// URLs', async () => {
      const client = await createRpcClient({
        url: 'http://localhost:3000',
        services: { test: testService },
      });

      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
    });

    it('should support multiple services', async () => {
      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: {
          test: testService,
          user: userService,
        },
      });

      expect(client.test).toBeDefined();
      expect(client.user).toBeDefined();
      expect(client.test.echo).toBeInstanceOf(Function);
      expect(client.user.get).toBeInstanceOf(Function);
      expect(client.user.create).toBeInstanceOf(Function);
    });

    it('should configure Channel with correct parameters', async () => {
      await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
        clientId: 'test-client',
        timeout: 5000,
        defaultTarget: 'my-server',
      });

      expect(Channel).toHaveBeenCalledWith('test-client', 5000);
      expect(mockChannel.connect).toHaveBeenCalledWith(mockTransport);
    });

    it('should use service ID as default target when defaultTarget is "auto"', async () => {
      mockChannel.invoke.mockResolvedValue({ response: 'test' });

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
        defaultTarget: 'auto',
      });

      await client.test.echo({ message: 'hello' });

      expect(mockChannel.invoke).toHaveBeenCalledWith(
        'test', // service ID used as target
        'test.echo',
        { message: 'hello' },
        testService.methods.echo.input,
        testService.methods.echo.output,
        undefined,
      );
    });

    it('should use specified default target', async () => {
      mockChannel.invoke.mockResolvedValue({ result: 10 });

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
        defaultTarget: 'my-server',
      });

      await client.test.add({ a: 5, b: 5 });

      expect(mockChannel.invoke).toHaveBeenCalledWith(
        'my-server',
        'test.add',
        { a: 5, b: 5 },
        testService.methods.add.input,
        testService.methods.add.output,
        undefined,
      );
    });

    it('should support method options for timeout and target override', async () => {
      mockChannel.invoke.mockResolvedValue({ response: 'test' });

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
        defaultTarget: 'default-server',
      });

      await client.test.echo({ message: 'hello' }, { timeout: 2000, target: 'override-server' });

      expect(mockChannel.invoke).toHaveBeenCalledWith(
        'override-server',
        'test.echo',
        { message: 'hello' },
        testService.methods.echo.input,
        testService.methods.echo.output,
        2000,
      );
    });

    it('should provide utility methods', async () => {
      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
      });

      // Test disconnect
      await client.disconnect();
      expect(mockChannel.disconnect).toHaveBeenCalled();

      // Test isConnected
      const connected = client.isConnected();
      expect(mockTransport.isConnected).toHaveBeenCalled();
      expect(connected).toBe(true);

      // Test setDefaultTarget
      client.setDefaultTarget('new-target');
      // This should change the default target for subsequent calls
    });
  });

  describe('Builder Pattern (connect)', () => {
    it('should create builder with fluent API', () => {
      const builder = connect('ws://localhost:8080');

      expect(builder).toBeDefined();
      expect(builder.withId).toBeInstanceOf(Function);
      expect(builder.withTimeout).toBeInstanceOf(Function);
      expect(builder.withServices).toBeInstanceOf(Function);
    });

    it('should chain builder methods', async () => {
      const client = await connect('ws://localhost:8080')
        .withId('my-client')
        .withTimeout(10000)
        .withServices({ test: testService })
        .build();

      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
      expect(Channel).toHaveBeenCalledWith('my-client', 10000);
    });

    it('should detect transport type from URL', () => {
      const wsBuilder = connect('ws://localhost:8080');
      const httpBuilder = connect('http://localhost:3000');

      expect(wsBuilder).toBeDefined();
      expect(httpBuilder).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      mockChannel.connect.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(
        createRpcClient({
          url: 'ws://localhost:8080',
          services: { test: testService },
        }),
      ).rejects.toThrow('Connection failed');
    });

    it('should handle method call failures', async () => {
      mockChannel.invoke.mockRejectedValueOnce(new Error('Method call failed'));

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
      });

      await expect(client.test.echo({ message: 'test' })).rejects.toThrow('Method call failed');
    });
  });

  describe('Type Safety', () => {
    it('should provide type-safe method calls', async () => {
      mockChannel.invoke.mockResolvedValue({ response: 'Hello World' });

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: { test: testService },
      });

      // This should be type-safe - TypeScript would catch errors here
      const result = await client.test.echo({ message: 'Hello' });

      // Result should be properly typed
      expect(result).toEqual({ response: 'Hello World' });
    });

    it('should maintain type safety across multiple services', async () => {
      mockChannel.invoke
        .mockResolvedValueOnce({ name: 'John', email: 'john@example.com' })
        .mockResolvedValueOnce({ id: '123', success: true });

      const client = await createRpcClient({
        url: 'ws://localhost:8080',
        services: {
          test: testService,
          user: userService,
        },
      });

      const user = await client.user.get({ id: '123' });
      const created = await client.user.create({ name: 'Jane', email: 'jane@example.com' });

      expect(user).toEqual({ name: 'John', email: 'john@example.com' });
      expect(created).toEqual({ id: '123', success: true });
    });
  });
});

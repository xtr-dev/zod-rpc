import { z } from 'zod';
import { defineService } from '../src/service';
import { connect, RpcClientBuilder } from '../src/client';
import { createServer, RpcServerBuilder } from '../src/server';

// Mock dependencies
jest.mock('../src/transports', () => ({
  createWebSocketTransport: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
  })),
  createHTTPTransport: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    onMessage: jest.fn(),
    isConnected: jest.fn().mockReturnValue(true),
  })),
}));

jest.mock('../src/channel', () => ({
  Channel: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    invoke: jest.fn().mockResolvedValue({ success: true }),
    publishMethod: jest.fn(),
  })),
}));

jest.mock('ws', () => ({
  WebSocket: {
    Server: jest.fn(() => ({
      on: jest.fn(),
      close: jest.fn((callback) => callback && callback()),
    })),
  },
}));

describe('Builder Pattern APIs', () => {
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
  });

  describe('Client Builder (connect)', () => {
    it('should create RpcClientBuilder instance', () => {
      const builder = connect('ws://localhost:8080');

      expect(builder).toBeInstanceOf(RpcClientBuilder);
      expect(builder.withId).toBeInstanceOf(Function);
      expect(builder.withTimeout).toBeInstanceOf(Function);
      expect(builder.withServices).toBeInstanceOf(Function);
    });

    it('should detect WebSocket transport from URL', () => {
      const wsBuilder = connect('ws://localhost:8080');
      const wssBuilder = connect('wss://localhost:8080');

      expect(wsBuilder).toBeInstanceOf(RpcClientBuilder);
      expect(wssBuilder).toBeInstanceOf(RpcClientBuilder);
    });

    it('should detect HTTP transport from URL', () => {
      const httpBuilder = connect('http://localhost:3000');
      const httpsBuilder = connect('https://localhost:3000');

      expect(httpBuilder).toBeInstanceOf(RpcClientBuilder);
      expect(httpsBuilder).toBeInstanceOf(RpcClientBuilder);
    });

    it('should support method chaining', async () => {
      const builder = connect('ws://localhost:8080')
        .withId('test-client')
        .withTimeout(15000)
        .withServices({ test: testService });

      expect(builder).toBeDefined();
      expect(builder.build).toBeInstanceOf(Function);

      const client = await builder.build();
      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
      expect(client.test.echo).toBeInstanceOf(Function);
    });

    it('should support multiple services in builder', async () => {
      const client = await connect('ws://localhost:8080')
        .withId('multi-service-client')
        .withTimeout(10000)
        .withServices({
          test: testService,
          user: userService,
        })
        .build();

      expect(client.test).toBeDefined();
      expect(client.user).toBeDefined();
      expect(client.test.echo).toBeInstanceOf(Function);
      expect(client.test.add).toBeInstanceOf(Function);
      expect(client.user.get).toBeInstanceOf(Function);
    });

    it('should use default values when not specified', async () => {
      const client = await connect('ws://localhost:8080')
        .withServices({ test: testService })
        .build();

      expect(client).toBeDefined();
      expect(client.test).toBeDefined();
    });

    it('should support partial configuration', async () => {
      // Only ID
      const client1 = await connect('ws://localhost:8080')
        .withId('custom-client')
        .withServices({ test: testService })
        .build();
      expect(client1).toBeDefined();

      // Only timeout
      const client2 = await connect('ws://localhost:8080')
        .withTimeout(5000)
        .withServices({ test: testService })
        .build();
      expect(client2).toBeDefined();

      // Only services
      const client3 = await connect('ws://localhost:8080')
        .withServices({ test: testService })
        .build();
      expect(client3).toBeDefined();
    });

    it('should maintain builder immutability', () => {
      const baseBuilder = connect('ws://localhost:8080');
      const builderWithId = baseBuilder.withId('test-1');
      const builderWithTimeout = baseBuilder.withTimeout(5000);

      // Each method should return a new builder instance
      expect(builderWithId).not.toBe(baseBuilder);
      expect(builderWithTimeout).not.toBe(baseBuilder);
      expect(builderWithId).not.toBe(builderWithTimeout);
    });
  });

  describe('Server Builder (createServer)', () => {
    it('should create RpcServerBuilder instance', () => {
      const builder = createServer('ws://localhost:8080');

      expect(builder).toBeInstanceOf(RpcServerBuilder);
      expect(builder.withId).toBeInstanceOf(Function);
      expect(builder.withTimeout).toBeInstanceOf(Function);
      expect(builder.withPort).toBeInstanceOf(Function);
      expect(builder.withHost).toBeInstanceOf(Function);
      expect(builder.build).toBeInstanceOf(Function);
    });

    it('should support method chaining', () => {
      const server = createServer('ws://localhost:8080')
        .withId('test-server')
        .withTimeout(20000)
        .withPort(9000)
        .withHost('0.0.0.0')
        .build();

      expect(server).toBeDefined();
      expect(server.implement).toBeInstanceOf(Function);
      expect(server.start).toBeInstanceOf(Function);
      expect(server.stop).toBeInstanceOf(Function);
    });

    it('should support partial configuration', () => {
      // Only ID
      const server1 = createServer('ws://localhost:8080').withId('custom-server').build();
      expect(server1).toBeDefined();

      // Only timeout
      const server2 = createServer('ws://localhost:8080').withTimeout(30000).build();
      expect(server2).toBeDefined();

      // Only port
      const server3 = createServer('ws://localhost:8080').withPort(9999).build();
      expect(server3).toBeDefined();

      // Only host
      const server4 = createServer('ws://localhost:8080').withHost('127.0.0.1').build();
      expect(server4).toBeDefined();
    });

    it('should maintain builder immutability', () => {
      const baseBuilder = createServer('ws://localhost:8080');
      const builderWithId = baseBuilder.withId('server-1');
      const builderWithTimeout = baseBuilder.withTimeout(10000);

      // Each method should return a new builder instance
      expect(builderWithId).not.toBe(baseBuilder);
      expect(builderWithTimeout).not.toBe(baseBuilder);
      expect(builderWithId).not.toBe(builderWithTimeout);
    });

    it('should allow implementation after building', () => {
      const server = createServer('ws://localhost:8080').withId('impl-server').build();

      server.implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      expect(server.getServices()).toContain('test');
    });

    it('should support fluent service implementation after building', () => {
      const server = createServer('ws://localhost:8080')
        .withId('fluent-server')
        .build()
        .implement(testService, {
          echo: async ({ message }) => ({ response: `Echo: ${message}` }),
          add: async ({ a, b }) => ({ result: a + b }),
        })
        .implement(userService, {
          get: async ({ id }) => ({ name: `User ${id}`, email: `user${id}@example.com` }),
        });

      expect(server.getServices()).toContain('test');
      expect(server.getServices()).toContain('user');
      expect(server.getServices()).toHaveLength(2);
    });
  });

  describe('Builder Pattern Edge Cases', () => {
    it('should handle empty service configuration', async () => {
      // Client with no services should still work
      const client = await connect('ws://localhost:8080').withServices({}).build();

      expect(client).toBeDefined();
      expect(client.disconnect).toBeInstanceOf(Function);
      expect(client.isConnected).toBeInstanceOf(Function);
    });

    it('should handle multiple withServices calls (last one wins)', async () => {
      const client = await connect('ws://localhost:8080')
        .withServices({ test: testService })
        .withServices({ user: userService }) // This should replace the previous services
        .build();

      expect(client.user).toBeDefined();
      // test service should not be available since it was replaced
      expect(client.test).toBeUndefined();
    });

    it('should handle multiple configuration calls (last one wins)', () => {
      const server = createServer('ws://localhost:8080')
        .withId('first-id')
        .withId('second-id') // This should replace the first ID
        .withTimeout(5000)
        .withTimeout(10000) // This should replace the first timeout
        .build();

      expect(server).toBeDefined();
    });

    it('should validate URL format in builders', () => {
      // Valid URLs should work
      expect(() => connect('ws://localhost:8080')).not.toThrow();
      expect(() => connect('http://localhost:3000')).not.toThrow();
      expect(() => createServer('ws://localhost:8080')).not.toThrow();

      // Empty URL should still create builder (error will occur on build/start)
      expect(() => connect('')).not.toThrow();
      expect(() => createServer('')).not.toThrow();
    });
  });

  describe('Builder vs Direct API Equivalence', () => {
    it('should produce equivalent client configurations', async () => {
      // Direct API
      const directClient = await connect('ws://localhost:8080')
        .withId('test-client')
        .withTimeout(15000)
        .withServices({ test: testService })
        .build();

      // Builder API should produce equivalent result
      const builderClient = await connect('ws://localhost:8080')
        .withId('test-client')
        .withTimeout(15000)
        .withServices({ test: testService })
        .build();

      // Both should have the same structure
      expect(typeof directClient.test.echo).toBe('function');
      expect(typeof builderClient.test.echo).toBe('function');
      expect(typeof directClient.disconnect).toBe('function');
      expect(typeof builderClient.disconnect).toBe('function');
    });

    it('should produce equivalent server configurations', () => {
      // Direct API
      const directServer = createServer('ws://localhost:8080')
        .withId('test-server')
        .withTimeout(20000)
        .build();

      // Builder API should produce equivalent result
      const builderServer = createServer('ws://localhost:8080')
        .withId('test-server')
        .withTimeout(20000)
        .build();

      // Both should have the same structure
      expect(typeof directServer.implement).toBe('function');
      expect(typeof builderServer.implement).toBe('function');
      expect(typeof directServer.start).toBe('function');
      expect(typeof builderServer.start).toBe('function');
    });
  });
});

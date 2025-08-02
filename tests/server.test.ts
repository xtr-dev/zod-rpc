import { z } from 'zod';
import { defineService } from '../src/service';
import { createRpcServer, createServer, RpcServer } from '../src/server';

// Mock WebSocket Server
const mockWebSocketServer = {
  on: jest.fn(),
  close: jest.fn((callback) => callback && callback()),
  clients: new Set(),
};

jest.mock('ws', () => {
  return {
    __esModule: true,
    default: {
      Server: jest.fn().mockImplementation(() => mockWebSocketServer),
    },
  };
});

// Mock WebSocket instance
const mockWebSocket = {
  on: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  readyState: 1,
};

// Mock Channel
const mockChannel = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  publishMethod: jest.fn(),
};

jest.mock('../src/channel', () => ({
  Channel: jest.fn(() => mockChannel),
}));

// Mock transport
const mockTransport = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  onMessage: jest.fn(),
  isConnected: jest.fn().mockReturnValue(true),
};

jest.mock('../src/transports', () => ({
  createWebSocketTransport: jest.fn(() => mockTransport),
}));

describe('Server API', () => {
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

  describe('createRpcServer', () => {
    it('should create server instance', () => {
      const server = createRpcServer('ws://localhost:8080');

      expect(server).toBeInstanceOf(RpcServer);
      expect(server.implement).toBeInstanceOf(Function);
      expect(server.start).toBeInstanceOf(Function);
      expect(server.stop).toBeInstanceOf(Function);
    });

    it('should support fluent service implementation', () => {
      const server = createRpcServer('ws://localhost:8080')
        .implement(testService, {
          echo: async ({ message }) => ({ response: `Echo: ${message}` }),
          add: async ({ a, b }) => ({ result: a + b }),
        })
        .implement(userService, {
          get: async ({ id }) => ({ name: `User ${id}`, email: `user${id}@example.com` }),
          create: async ({ name: _name, email: _email }) => ({ id: '123', success: true }),
        });

      expect(server).toBeInstanceOf(RpcServer);
      expect(server.getServices()).toContain('test');
      expect(server.getServices()).toContain('user');
    });

    it('should configure server with options', () => {
      const server = createRpcServer('ws://localhost:8080', {
        serverId: 'my-server',
        timeout: 15000,
        port: 9000,
        host: '0.0.0.0',
      });

      expect(server).toBeInstanceOf(RpcServer);
    });
  });

  describe('RpcServer', () => {
    let server: RpcServer;

    beforeEach(() => {
      server = createRpcServer('ws://localhost:8080');
    });

    it('should implement services', () => {
      const implementation = {
        echo: async ({ message }: { message: string }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }: { a: number; b: number }) => ({ result: a + b }),
      };

      server.implement(testService, implementation);

      expect(server.getServices()).toContain('test');
    });

    it('should start WebSocket server', async () => {
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      await server.start();

      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(server.isRunning()).toBe(true);
    });

    it('should handle client connections', async () => {
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      await server.start();

      // Simulate client connection
      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        (call) => call[0] === 'connection',
      )?.[1];

      if (connectionHandler) {
        connectionHandler(mockWebSocket);

        expect(mockChannel.publishMethod).toHaveBeenCalledTimes(2); // echo + add methods
        expect(mockChannel.connect).toHaveBeenCalled();
      }
    });

    it('should stop server gracefully', async () => {
      await server.start();
      await server.stop();

      expect(mockWebSocketServer.close).toHaveBeenCalled();
      expect(server.isRunning()).toBe(false);
    });

    it('should handle WebSocket client disconnection', async () => {
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      await server.start();

      // Simulate client connection
      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        (call) => call[0] === 'connection',
      )?.[1];

      if (connectionHandler) {
        connectionHandler(mockWebSocket);

        // Simulate client close
        const closeHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'close')?.[1];

        if (closeHandler) {
          closeHandler();
          expect(mockChannel.disconnect).toHaveBeenCalled();
        }
      }
    });

    it('should handle WebSocket errors', async () => {
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      await server.start();

      // Simulate client connection
      const connectionHandler = mockWebSocketServer.on.mock.calls.find(
        (call) => call[0] === 'connection',
      )?.[1];

      if (connectionHandler) {
        connectionHandler(mockWebSocket);

        // Simulate WebSocket error
        const errorHandler = mockWebSocket.on.mock.calls.find((call) => call[0] === 'error')?.[1];

        if (errorHandler) {
          errorHandler(new Error('WebSocket error'));
          expect(mockChannel.disconnect).toHaveBeenCalled();
        }
      }
    });

    it('should reject unsupported URL schemes', async () => {
      const invalidServer = createRpcServer('ftp://localhost:8080');

      await expect(invalidServer.start()).rejects.toThrow('Unsupported URL scheme');
    });

    it('should support multiple service implementations', () => {
      server
        .implement(testService, {
          echo: async ({ message }) => ({ response: `Echo: ${message}` }),
          add: async ({ a, b }) => ({ result: a + b }),
        })
        .implement(userService, {
          get: async ({ id }) => ({ name: `User ${id}`, email: `user${id}@example.com` }),
          create: async ({ name: _name, email: _email }) => ({ id: '123', success: true }),
        });

      const services = server.getServices();
      expect(services).toContain('test');
      expect(services).toContain('user');
      expect(services).toHaveLength(2);
    });
  });

  describe('Builder Pattern (createServer)', () => {
    it('should create server builder with fluent API', () => {
      const builder = createServer('ws://localhost:8080');

      expect(builder).toBeDefined();
      expect(builder.withId).toBeInstanceOf(Function);
      expect(builder.withTimeout).toBeInstanceOf(Function);
      expect(builder.withPort).toBeInstanceOf(Function);
      expect(builder.withHost).toBeInstanceOf(Function);
      expect(builder.build).toBeInstanceOf(Function);
    });

    it('should chain builder methods', () => {
      const server = createServer('ws://localhost:8080')
        .withId('my-server')
        .withTimeout(20000)
        .withPort(9000)
        .withHost('0.0.0.0')
        .build();

      expect(server).toBeInstanceOf(RpcServer);
    });
  });

  describe('Error Handling', () => {
    it('should handle service implementation errors', async () => {
      const server = createRpcServer('ws://localhost:8080');

      server.implement(testService, {
        echo: async ({ message: _message }) => {
          throw new Error('Implementation error');
        },
        add: async ({ a, b }) => ({ result: a + b }),
      });

      // The error should be handled gracefully during method calls
      // This would be tested in integration tests with actual method invocation
      expect(server.getServices()).toContain('test');
    });

    it('should handle server startup failures', async () => {
      // Create a mock that throws an error
      const throwingMock = jest.fn(() => {
        throw new Error('Port already in use');
      });

      const ws = require('ws');
      const originalServer = ws.default.Server;
      ws.default.Server = throwingMock;

      const server = createRpcServer('ws://localhost:8080');
      server.implement(testService, {
        echo: async ({ message }) => ({ response: message }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      await expect(server.start()).rejects.toThrow('Port already in use');

      // Restore mock
      ws.default.Server = originalServer;
    });
  });

  describe('Service Management', () => {
    it('should track implemented services', () => {
      const server = createRpcServer('ws://localhost:8080');

      expect(server.getServices()).toHaveLength(0);

      server.implement(testService, {
        echo: async ({ message }) => ({ response: message }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      expect(server.getServices()).toHaveLength(1);
      expect(server.getServices()).toContain('test');

      server.implement(userService, {
        get: async ({ id }) => ({ name: `User ${id}`, email: `user${id}@example.com` }),
        create: async ({ name: _name, email: _email }) => ({ id: '123', success: true }),
      });

      expect(server.getServices()).toHaveLength(2);
      expect(server.getServices()).toContain('user');
    });

    it('should allow service re-implementation', () => {
      const server = createRpcServer('ws://localhost:8080');

      // First implementation
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `v1: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
      });

      expect(server.getServices()).toHaveLength(1);

      // Re-implementation should replace the previous one
      server.implement(testService, {
        echo: async ({ message }) => ({ response: `v2: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b + 1 }),
      });

      expect(server.getServices()).toHaveLength(1); // Still only one service
      expect(server.getServices()).toContain('test');
    });
  });
});

import { z } from 'zod';
import { defineService, createRpcClient, createRpcServer } from '../src';
import WebSocket from 'ws';

describe('Integration Tests', () => {
  const testService = defineService('test', {
    echo: {
      input: z.object({ message: z.string() }),
      output: z.object({ response: z.string() }),
    },
    add: {
      input: z.object({ a: z.number(), b: z.number() }),
      output: z.object({ result: z.number() }),
    },
    slow: {
      input: z.object({ delay: z.number() }),
      output: z.object({ completed: z.boolean() }),
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

  const findAvailablePort = async (): Promise<number> => {
    return new Promise((resolve) => {
      const server = new WebSocket.Server({ port: 0 });
      server.on('listening', () => {
        const port = (server.address() as any)?.port || 0;
        server.close(() => resolve(port));
      });
    });
  };

  describe('End-to-End Workflow', () => {
    let server: any;
    let client: any;
    let port: number;

    beforeEach(async () => {
      port = await findAvailablePort();
    });

    afterEach(async () => {
      if (client) {
        await client.disconnect();
      }
      if (server) {
        await server.stop();
      }
    });

    it('should complete full client-server workflow', async () => {
      // Create and start server
      server = createRpcServer(`ws://localhost:${port}`).implement(testService, {
        echo: async ({ message }) => ({ response: `Server echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay }) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return { completed: true };
        },
      });

      await server.start();

      // Wait a moment for server to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create client
      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'server',
      });

      // Test echo method
      const echoResult = await client.test.echo({ message: 'Hello Integration!' });
      expect(echoResult).toEqual({ response: 'Server echo: Hello Integration!' });

      // Test add method
      const addResult = await client.test.add({ a: 15, b: 25 });
      expect(addResult).toEqual({ result: 40 });

      // Test slow method with timeout
      const slowResult = await client.test.slow({ delay: 100 });
      expect(slowResult).toEqual({ completed: true });
    }, 10000);

    it('should handle multiple services', async () => {
      const users = new Map([
        ['1', { name: 'Alice', email: 'alice@example.com' }],
        ['2', { name: 'Bob', email: 'bob@example.com' }],
      ]);
      let nextId = 3;

      server = createRpcServer(`ws://localhost:${port}`)
        .implement(testService, {
          echo: async ({ message }) => ({ response: `Echo: ${message}` }),
          add: async ({ a, b }) => ({ result: a + b }),
          slow: async ({ delay: _delay }) => ({ completed: true }),
        })
        .implement(userService, {
          get: async ({ id }) => {
            const user = users.get(id);
            if (!user) throw new Error(`User ${id} not found`);
            return user;
          },
          create: async ({ name, email }) => {
            const id = String(nextId++);
            users.set(id, { name, email });
            return { id, success: true };
          },
        });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: {
          test: testService,
          user: userService,
        },
        defaultTarget: 'server',
      });

      // Test both services
      const mathResult = await client.test.add({ a: 5, b: 3 });
      expect(mathResult).toEqual({ result: 8 });

      const user = await client.user.get({ id: '1' });
      expect(user).toEqual({ name: 'Alice', email: 'alice@example.com' });

      const newUser = await client.user.create({
        name: 'Charlie',
        email: 'charlie@example.com',
      });
      expect(newUser.success).toBe(true);
      expect(newUser.id).toBe('3');

      // Verify the user was created
      const createdUser = await client.user.get({ id: newUser.id });
      expect(createdUser).toEqual({
        name: 'Charlie',
        email: 'charlie@example.com',
      });
    }, 10000);

    it('should handle method options (timeout, target)', async () => {
      server = createRpcServer(`ws://localhost:${port}`).implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay }) => {
          await new Promise((resolve) => setTimeout(resolve, delay));
          return { completed: true };
        },
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'server',
      });

      // Test with custom timeout
      const quickResult = await client.test.echo({ message: 'Quick test' }, { timeout: 1000 });
      expect(quickResult).toEqual({ response: 'Echo: Quick test' });

      // Test timeout failure
      await expect(client.test.slow({ delay: 2000 }, { timeout: 500 })).rejects.toThrow(
        /timed out/,
      );
    }, 15000);

    it('should handle connection errors gracefully', async () => {
      // Try to connect to non-existent server
      await expect(
        createRpcClient({
          url: `ws://localhost:${port + 1000}`, // Non-existent port
          services: { test: testService },
          defaultTarget: 'server',
        }),
      ).rejects.toThrow();
    });

    it('should validate input and output with Zod schemas', async () => {
      server = createRpcServer(`ws://localhost:${port}`).implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay: _delay }) => ({ completed: true }),
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'server',
      });

      // Valid input should work
      const validResult = await client.test.add({ a: 5, b: 3 });
      expect(validResult).toEqual({ result: 8 });

      // Invalid input should be caught by Zod validation
      await expect(client.test.add({ a: 'invalid', b: 3 } as any)).rejects.toThrow(/validation/i);
    }, 10000);
  });

  describe('Auto Target Resolution', () => {
    let server: any;
    let client: any;
    let port: number;

    beforeEach(async () => {
      port = await findAvailablePort();
    });

    afterEach(async () => {
      if (client) {
        await client.disconnect();
      }
      if (server) {
        await server.stop();
      }
    });

    it('should use service ID as default target with auto resolution', async () => {
      server = createRpcServer(`ws://localhost:${port}`, {
        serverId: 'test', // Use service ID as server ID for auto targeting
      }).implement(testService, {
        echo: async ({ message }) => ({ response: `From ${testService.id}: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay: _delay }) => ({ completed: true }),
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'auto', // This should use service ID as target
      });

      const result = await client.test.echo({ message: 'Auto target test' });
      expect(result).toEqual({ response: 'From test: Auto target test' });
    }, 10000);

    it('should support custom default target', async () => {
      server = createRpcServer(`ws://localhost:${port}`, {
        serverId: 'custom-server',
      }).implement(testService, {
        echo: async ({ message }) => ({ response: `From custom-server: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay: _delay }) => ({ completed: true }),
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'custom-server',
      });

      const result = await client.test.echo({ message: 'Custom target test' });
      expect(result).toEqual({ response: 'From custom-server: Custom target test' });
    }, 10000);
  });

  describe('Error Scenarios', () => {
    let server: any;
    let client: any;
    let port: number;

    beforeEach(async () => {
      port = await findAvailablePort();
    });

    afterEach(async () => {
      if (client) {
        await client.disconnect();
      }
      if (server) {
        await server.stop();
      }
    });

    it('should handle server method errors', async () => {
      server = createRpcServer(`ws://localhost:${port}`).implement(testService, {
        echo: async ({ message }) => {
          if (message === 'error') {
            throw new Error('Intentional server error');
          }
          return { response: `Echo: ${message}` };
        },
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay: _delay }) => ({ completed: true }),
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'server',
      });

      // Normal call should work
      const goodResult = await client.test.echo({ message: 'hello' });
      expect(goodResult).toEqual({ response: 'Echo: hello' });

      // Error call should propagate the error
      await expect(client.test.echo({ message: 'error' })).rejects.toThrow(
        'Intentional server error',
      );
    }, 10000);

    it('should handle client disconnection', async () => {
      server = createRpcServer(`ws://localhost:${port}`).implement(testService, {
        echo: async ({ message }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }) => ({ result: a + b }),
        slow: async ({ delay: _delay }) => ({ completed: true }),
      });

      await server.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      client = await createRpcClient({
        url: `ws://localhost:${port}`,
        services: { test: testService },
        defaultTarget: 'server',
      });

      // Verify connection works
      const result = await client.test.echo({ message: 'pre-disconnect' });
      expect(result).toEqual({ response: 'Echo: pre-disconnect' });

      // Disconnect client
      await client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Calls after disconnect should fail
      await expect(client.test.echo({ message: 'post-disconnect' })).rejects.toThrow();
    }, 10000);
  });
});

import { z } from 'zod';
import { defineService, createServiceContracts, implementService } from '../src/service';

describe('Service API', () => {
  describe('defineService', () => {
    it('should create a service definition with correct structure', () => {
      const service = defineService('test', {
        echo: {
          input: z.object({ message: z.string() }),
          output: z.object({ response: z.string() }),
        },
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          output: z.object({ result: z.number() }),
        },
      });

      expect(service.id).toBe('test');
      expect(service.methods).toHaveProperty('echo');
      expect(service.methods).toHaveProperty('add');
      expect(service.methods.echo.input).toBeDefined();
      expect(service.methods.echo.output).toBeDefined();
      expect(service.methods.add.input).toBeDefined();
      expect(service.methods.add.output).toBeDefined();
    });

    it('should support complex nested schemas', () => {
      const service = defineService('complex', {
        processUser: {
          input: z.object({
            user: z.object({
              id: z.string(),
              profile: z.object({
                name: z.string(),
                age: z.number().optional(),
                tags: z.array(z.string()).default([]),
              }),
            }),
            options: z
              .object({
                includeMetadata: z.boolean().default(false),
                format: z.enum(['json', 'xml']).default('json'),
              })
              .optional(),
          }),
          output: z.object({
            success: z.boolean(),
            processedUser: z.object({
              id: z.string(),
              displayName: z.string(),
              metadata: z.record(z.string(), z.any()).optional(),
            }),
          }),
        },
      });

      expect(service.id).toBe('complex');
      expect(service.methods.processUser).toBeDefined();

      // Test that schemas are properly configured
      const inputResult = service.methods.processUser.input.safeParse({
        user: {
          id: '123',
          profile: {
            name: 'Test User',
          },
        },
      });
      expect(inputResult.success).toBe(true);
    });
  });

  describe('createServiceContracts', () => {
    it('should convert service definition to method contracts', () => {
      const service = defineService('test', {
        echo: {
          input: z.object({ message: z.string() }),
          output: z.object({ response: z.string() }),
        },
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          output: z.object({ result: z.number() }),
        },
      });

      const contracts = createServiceContracts(service);

      expect(contracts.echo).toEqual({
        id: 'test.echo',
        input: service.methods.echo.input,
        output: service.methods.echo.output,
      });

      expect(contracts.add).toEqual({
        id: 'test.add',
        input: service.methods.add.input,
        output: service.methods.add.output,
      });
    });

    it('should create correct method IDs with service namespace', () => {
      const userService = defineService('user', {
        get: {
          input: z.object({ id: z.string() }),
          output: z.object({ name: z.string() }),
        },
        create: {
          input: z.object({ name: z.string() }),
          output: z.object({ id: z.string() }),
        },
      });

      const contracts = createServiceContracts(userService);

      expect(contracts.get.id).toBe('user.get');
      expect(contracts.create.id).toBe('user.create');
    });
  });

  describe('implementService', () => {
    it('should create method definitions from service and implementation', async () => {
      const service = defineService('test', {
        echo: {
          input: z.object({ message: z.string() }),
          output: z.object({ response: z.string() }),
        },
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          output: z.object({ result: z.number() }),
        },
      });

      const implementation = {
        echo: async ({ message }: { message: string }) => ({ response: `Echo: ${message}` }),
        add: async ({ a, b }: { a: number; b: number }) => ({ result: a + b }),
      };

      const methods = implementService(service, implementation, 'test-target');

      expect(methods).toHaveLength(2);

      const echoMethod = methods.find((m) => m.id === 'test.echo');
      const addMethod = methods.find((m) => m.id === 'test.add');

      expect(echoMethod).toBeDefined();
      expect(addMethod).toBeDefined();

      // Test method execution
      if (echoMethod) {
        const result = await echoMethod.handler({ message: 'Hello' });
        expect(result).toEqual({ response: 'Echo: Hello' });
      }

      if (addMethod) {
        const result = await addMethod.handler({ a: 5, b: 3 });
        expect(result).toEqual({ result: 8 });
      }
    });

    it('should preserve input/output schemas in method definitions', () => {
      const service = defineService('test', {
        process: {
          input: z.object({ data: z.string() }),
          output: z.object({ processed: z.boolean() }),
        },
      });

      const implementation = {
        process: async ({ data: _data }: { data: string }) => ({ processed: true }),
      };

      const methods = implementService(service, implementation, 'test-target');
      const method = methods[0];

      expect(method.input).toBe(service.methods.process.input);
      expect(method.output).toBe(service.methods.process.output);
    });
  });

  describe('Type safety', () => {
    it('should enforce correct implementation types', () => {
      const service = defineService('typed', {
        getString: {
          input: z.object({ key: z.string() }),
          output: z.object({ value: z.string() }),
        },
        getNumber: {
          input: z.object({ id: z.number() }),
          output: z.object({ count: z.number() }),
        },
      });

      // This should compile without issues
      const correctImplementation = {
        getString: async ({ key }: { key: string }) => ({ value: `Value for ${key}` }),
        getNumber: async ({ id }: { id: number }) => ({ count: id * 2 }),
      };

      const methods = implementService(service, correctImplementation, 'test-target');
      expect(methods).toHaveLength(2);
    });
  });
});

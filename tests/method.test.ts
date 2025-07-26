import { z } from 'zod';
import { defineMethod, createMethodProxy, createTypedInvoker } from '../src/method';

describe('Method utilities', () => {
  describe('defineMethod', () => {
    it('should create a method definition', () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello ${input.name}` })
      });

      expect(method.id).toBe('test.method');
      expect(method.input).toBeDefined();
      expect(method.output).toBeDefined();
      expect(method.handler).toBeInstanceOf(Function);
    });

    it('should execute handler correctly', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input) => ({ greeting: `Hello ${input.name}` })
      });

      const result = await method.handler({ name: 'World' });
      expect(result).toEqual({ greeting: 'Hello World' });
    });
  });

  describe('createMethodProxy', () => {
    it('should create a proxy for multiple methods', () => {
      const getUserMethod = defineMethod({
        id: 'user.get',
        input: z.object({ id: z.string() }),
        output: z.object({ name: z.string() }),
        handler: async () => ({ name: 'Test' })
      });

      const createUserMethod = defineMethod({
        id: 'user.create',
        input: z.object({ name: z.string() }),
        output: z.object({ id: z.string() }),
        handler: async () => ({ id: '123' })
      });

      const methods = {
        getUser: getUserMethod,
        createUser: createUserMethod
      };

      const mockInvoke = jest.fn();
      const proxy = createMethodProxy(methods, mockInvoke);

      expect(proxy.getUser).toBeInstanceOf(Function);
      expect(proxy.createUser).toBeInstanceOf(Function);
    });

    it('should call invoke with correct method id', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ value: z.number() }),
        output: z.object({ result: z.number() }),
        handler: async () => ({ result: 42 })
      });

      const methods = { test: method };
      const mockInvoke = jest.fn().mockResolvedValue({ result: 42 });
      const proxy = createMethodProxy(methods, mockInvoke);

      await proxy.test({ value: 10 });

      expect(mockInvoke).toHaveBeenCalledWith('test.method', { value: 10 });
    });
  });

  describe('createTypedInvoker', () => {
    it('should create a typed invoker function', () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async () => ({ greeting: 'Hello' })
      });

      const mockInvoke = jest.fn();
      const invoker = createTypedInvoker(method, mockInvoke);

      expect(invoker).toBeInstanceOf(Function);
    });

    it('should call invoke with correct parameters', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async () => ({ greeting: 'Hello' })
      });

      const mockInvoke = jest.fn().mockResolvedValue({ greeting: 'Hello World' });
      const invoker = createTypedInvoker(method, mockInvoke);

      const result = await invoker('target-service', { name: 'World' });

      expect(mockInvoke).toHaveBeenCalledWith(
        'target-service',
        'test.method',
        { name: 'World' },
        method.input,
        method.output,
        undefined
      );
      expect(result).toEqual({ greeting: 'Hello World' });
    });

    it('should pass timeout parameter', async () => {
      const method = defineMethod({
        id: 'test.method',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async () => ({ greeting: 'Hello' })
      });

      const mockInvoke = jest.fn().mockResolvedValue({ greeting: 'Hello World' });
      const invoker = createTypedInvoker(method, mockInvoke);

      await invoker('target-service', { name: 'World' }, 5000);

      expect(mockInvoke).toHaveBeenCalledWith(
        'target-service',
        'test.method',
        { name: 'World' },
        method.input,
        method.output,
        5000
      );
    });
  });
});
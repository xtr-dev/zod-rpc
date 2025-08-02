import { z } from 'zod';
import { MethodDefinition, InferInput, InferOutput } from '../src/types';

describe('Types', () => {
  describe('InferInput', () => {
    it('should infer input type from method definition', () => {
      const _method = {
        id: 'test.method',
        targetId: 'test-target',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input: { name: string }) => ({ greeting: `Hello ${input.name}` }),
      } satisfies MethodDefinition<any, any>;

      type InputType = InferInput<typeof _method>;

      // This would be compile-time type checking
      const input: InputType = { name: 'test' };
      expect(input.name).toBe('test');
    });
  });

  describe('InferOutput', () => {
    it('should infer output type from method definition', () => {
      const _method = {
        id: 'test.method',
        targetId: 'test-target',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        handler: async (input: { name: string }) => ({ greeting: `Hello ${input.name}` }),
      } satisfies MethodDefinition<any, any>;

      type OutputType = InferOutput<typeof _method>;

      // This would be compile-time type checking
      const output: OutputType = { greeting: 'Hello test' };
      expect(output.greeting).toBe('Hello test');
    });
  });
});

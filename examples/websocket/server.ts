import { createRPCServer } from '@xtr-dev/zod-rpc';
import { userService, mathService } from './shared';

const users = new Map([
  ['1', { id: '1', name: 'Alice', email: 'alice@example.com', age: 30 }],
  ['2', { id: '2', name: 'Bob', email: 'bob@example.com', age: 25 }],
  ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35 }],
]);

let nextUserId = 4;

async function startServer(): Promise<void> {
  const server = createRPCServer('ws://localhost:8080')
    .implement(userService, {
      get: async ({ userId }: { userId: string }) => {
        const user = users.get(userId);
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }
        return user;
      },

      create: async ({ name, email, age }: { name: string; email: string; age: number }) => {
        const id = String(nextUserId++);
        const user = { id, name, email, age };
        users.set(id, user);

        console.log(`✅ Created user: ${name} (${email})`);
        return { id, success: true };
      },

      list: async ({ page, limit }: { page: number; limit: number }) => {
        const allUsers = Array.from(users.values());
        const start = (page - 1) * limit;
        const end = start + limit;
        const pageUsers = allUsers.slice(start, end);

        return {
          users: pageUsers.map(({ id, name, email }) => ({ id, name, email })),
          total: allUsers.length,
          hasMore: end < allUsers.length,
        };
      },
    } as any)
    .implement(mathService, {
      add: async ({ a, b }: { a: number; b: number }) => ({
        result: a + b,
      }),

      calculate: async ({ expression, precision }: { expression: string; precision: number }) => {
        try {
          const { evaluate } = await import('mathjs');
          const result = evaluate(expression);
          return {
            result: Number(result.toFixed(precision)),
            expression,
          };
        } catch (_error) {
          throw new Error(`Invalid expression: ${expression}`);
        }
      },
    } as any);

  await server.start();
}

if (require.main === module) {
  startServer().catch(console.error);
}

import express from 'express';
import { zodRpc, Channel } from '@xtr-dev/zod-rpc';
import { userService, mathService } from './shared';

// In-memory user storage
const users = new Map([
  ['1', { id: '1', name: 'Alice', email: 'alice@example.com', age: 30 }],
  ['2', { id: '2', name: 'Bob', email: 'bob@example.com', age: 25 }],
  ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35 }],
]);

let nextUserId = 4;

async function startExpressServer(): Promise<void> {
  const app = express();
  const port = parseInt(process.env.PORT || '3000', 10);

  // Body parser middleware for JSON
  app.use(express.json());

  // CORS middleware for browser clients
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    );

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Create channel for local method invocation
  // No transport needed - local methods bypass transport layer
  const channel = new Channel('server');

  // Implement and publish user service (simplified API)
  channel.publishService(userService, {
    get: async ({ userId }: { userId: string }) => {
      console.log(`📨 Getting user: ${userId}`);
      const user = users.get(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      return user;
    },

    create: async ({ name, email, age }: { name: string; email: string; age: number }) => {
      console.log(`📨 Creating user: ${name} (${email})`);
      const id = String(nextUserId++);
      const user = { id, name, email, age };
      users.set(id, user);
      return { id, success: true };
    },

    list: async ({ page, limit }: { page: number; limit: number }) => {
      console.log(`📨 Listing users: page ${page}, limit ${limit}`);
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
  } as any);

  // Implement and publish math service (simplified API)
  channel.publishService(mathService, {
    add: async ({ a, b }: { a: number; b: number }) => {
      console.log(`📨 Adding: ${a} + ${b}`);
      return { result: a + b };
    },

    calculate: async ({
      expression,
      precision = 2,
    }: {
      expression: string;
      precision?: number;
    }) => {
      console.log(`📨 Calculating: ${expression}`);
      try {
        // Simple expression evaluator (you might want to use a proper library like mathjs)
        const result = eval(expression);
        return {
          result: Number(result.toFixed(precision)),
          expression,
        };
      } catch (_error) {
        throw new Error(`Invalid expression: ${expression}`);
      }
    },
  } as any);

  // Mount RPC middleware at /rpc endpoint
  app.use('/rpc', zodRpc(channel));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API info endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'zod-rpc HTTP Example',
      version: '1.0.0',
      endpoints: {
        rpc: '/rpc',
        health: '/health',
      },
      services: ['user', 'math'],
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`🚀 Express server with zod-rpc running on http://localhost:${port}`);
    console.log(`📡 RPC endpoint: http://localhost:${port}/rpc`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log('📋 Available services: user, math');
  });
}

if (require.main === module) {
  startExpressServer().catch(console.error);
}

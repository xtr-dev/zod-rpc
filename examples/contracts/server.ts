import { Channel, implementContract, createWebSocketTransport } from '../../src';
import { userContracts, mathContracts } from './shared';
import WebSocket from 'ws';

// Mock user database
const users = new Map([
  ['1', { id: '1', name: 'Alice', email: 'alice@example.com', age: 30 }],
  ['2', { id: '2', name: 'Bob', email: 'bob@example.com', age: 25 }],
  ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35 }]
]);

let nextUserId = 4;

// Server implements the contracts with actual business logic
const userMethods = {
  getUser: implementContract(userContracts.getUser, async ({ userId }) => {
    const user = users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    return user;
  }),

  createUser: implementContract(userContracts.createUser, async ({ name, email, age }) => {
    const id = String(nextUserId++);
    const user = { id, name, email, age };
    users.set(id, user);
    
    console.log(`✅ Created user: ${name} (${email})`);
    return { id, success: true };
  }),

  listUsers: implementContract(userContracts.listUsers, async ({ page, limit }) => {
    const allUsers = Array.from(users.values());
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageUsers = allUsers.slice(start, end);
    
    return {
      users: pageUsers.map(({ id, name, email }) => ({ id, name, email })),
      total: allUsers.length,
      hasMore: end < allUsers.length
    };
  })
};

const mathMethods = {
  add: implementContract(mathContracts.add, async ({ a, b }) => ({
    result: a + b
  })),

  calculate: implementContract(mathContracts.calculate, async ({ expression, precision }) => {
    // Simple expression evaluator (for demo purposes)
    try {
      // WARNING: In production, use a proper expression parser
      const result = eval(expression);
      return {
        result: Number(result.toFixed(precision)),
        expression
      };
    } catch (error) {
      throw new Error(`Invalid expression: ${expression}`);
    }
  })
};

async function startServer() {
  const wss = new WebSocket.Server({ port: 8080 });
  console.log('🚀 Contract-based RPC Server starting on ws://localhost:8080');

  wss.on('connection', async (ws) => {
    console.log('📡 Client connected');
    
    const transport = createWebSocketTransport(ws as any);
    const channel = new Channel(transport, 'server');

    // Publish all methods
    channel.publishMethod(userMethods.getUser);
    channel.publishMethod(userMethods.createUser);
    channel.publishMethod(userMethods.listUsers);
    channel.publishMethod(mathMethods.add);
    channel.publishMethod(mathMethods.calculate);

    await channel.connect();
    console.log('✅ Server channel connected and methods published');

    ws.on('close', () => {
      console.log('📴 Client disconnected');
      channel.disconnect();
    });
  });

  console.log('📋 Available methods:');
  console.log('  - user.get: Get user by ID');
  console.log('  - user.create: Create new user'); 
  console.log('  - user.list: List users with pagination');
  console.log('  - math.add: Add two numbers');
  console.log('  - math.calculate: Evaluate mathematical expression');
}

if (require.main === module) {
  startServer().catch(console.error);
}
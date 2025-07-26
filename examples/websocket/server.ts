import { WebSocketServer } from 'ws';
import { z } from 'zod';
import { Channel, defineMethod, WebSocketTransport } from '../../src';

// Define the same RPC methods as the HTTP example
const getUserMethod = defineMethod({
  id: 'user.get',
  input: z.object({ 
    userId: z.string() 
  }),
  output: z.object({ 
    id: z.string(),
    name: z.string(), 
    email: z.string() 
  }),
  handler: async (input) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`
    };
  }
});

const createUserMethod = defineMethod({
  id: 'user.create',
  input: z.object({
    name: z.string(),
    email: z.string().email()
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string()
  }),
  handler: async (input) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const id = Math.random().toString(36).substr(2, 9);
    return {
      id,
      name: input.name,
      email: input.email,
      createdAt: new Date().toISOString()
    };
  }
});

const calculateMethod = defineMethod({
  id: 'math.calculate',
  input: z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }),
  output: z.object({
    result: z.number(),
    operation: z.string()
  }),
  handler: async (input) => {
    let result: number;
    
    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        break;
      case 'subtract':
        result = input.a - input.b;
        break;
      case 'multiply':
        result = input.a * input.b;
        break;
      case 'divide':
        if (input.b === 0) {
          throw new Error('Division by zero');
        }
        result = input.a / input.b;
        break;
    }
    
    return {
      result,
      operation: `${input.a} ${input.operation} ${input.b} = ${result}`
    };
  }
});

const chatMethod = defineMethod({
  id: 'chat.message',
  input: z.object({
    message: z.string(),
    username: z.string()
  }),
  output: z.object({
    id: z.string(),
    message: z.string(),
    username: z.string(),
    timestamp: z.string()
  }),
  handler: async (input) => {
    const id = Math.random().toString(36).substr(2, 9);
    return {
      id,
      message: input.message,
      username: input.username,
      timestamp: new Date().toISOString()
    };
  }
});

async function startWebSocketServer(): Promise<void> {
  const wss = new WebSocketServer({ port: 8080 });
  
  console.log('🚀 WebSocket RPC Server starting on ws://localhost:8080');
  
  wss.on('connection', async (ws) => {
    console.log('📡 New WebSocket connection established');
    
    // Create WebSocket transport for this connection
    const transport = new WebSocketTransport(ws as any, false);
    const channel = new Channel(transport, 'ws-server');
    
    // Register methods
    channel.publishMethod(getUserMethod);
    channel.publishMethod(createUserMethod);
    channel.publishMethod(calculateMethod);
    channel.publishMethod(chatMethod);
    
    try {
      await channel.connect();
      console.log('✅ Channel connected for client');
    } catch (error) {
      console.error('❌ Failed to connect channel:', error);
    }
    
    ws.on('close', async () => {
      console.log('🔌 WebSocket connection closed');
      await channel.disconnect();
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  });
  
  console.log('🎉 WebSocket RPC Server ready!');
  console.log('Available methods:');
  console.log('  - user.get: Get user by ID');
  console.log('  - user.create: Create a new user');
  console.log('  - math.calculate: Perform calculations');
  console.log('  - chat.message: Send chat messages');
  console.log('');
  console.log('Connect from browser at: http://localhost:3001/websocket.html');
}

// Start the server
startWebSocketServer().catch(console.error);
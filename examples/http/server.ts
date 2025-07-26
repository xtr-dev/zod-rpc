import { z } from 'zod';
import { Channel, defineMethod, createHTTPTransport, HTTPChannelServer, HTTPServerAdapter } from '../../src';

// Simple HTTP server adapter using Node.js built-in http module
class NodeHTTPAdapter implements HTTPServerAdapter {
  private server?: any;
  private routes = new Map<string, (body: any) => Promise<any>>();

  async start(port: number): Promise<void> {
    const http = await import('http');
    
    this.server = http.createServer(async (req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || '', `http://localhost:${port}`);
      const handler = this.routes.get(url.pathname);
      
      if (!handler) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      try {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const parsedBody = req.method === 'POST' ? JSON.parse(body) : {};
            const result = await handler(parsedBody);
            
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }));
          }
        });
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    });

    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`HTTP server listening on port ${port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  onRequest(path: string, handler: (body: any) => Promise<any>): void {
    this.routes.set(path, handler);
  }
}

// Define some example methods
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
    // Simulate database lookup
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
    // Simulate user creation
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

async function startServer(): Promise<void> {
  const adapter = new NodeHTTPAdapter();
  const httpServer = new HTTPChannelServer(adapter);
  
  // Create a custom transport for the HTTP server
  class HTTPServerTransport {
    private responseMessage: any = null;
    
    async send(message: any): Promise<void> {
      this.responseMessage = message;
    }
    
    onMessage(): void {
      // Not needed for HTTP server
    }
    
    async connect(): Promise<void> {
      // Not needed for HTTP server
    }
    
    async disconnect(): Promise<void> {
      // Not needed for HTTP server
    }
    
    isConnected(): boolean {
      return true;
    }
    
    getResponse(): any {
      return this.responseMessage;
    }
    
    clearResponse(): void {
      this.responseMessage = null;
    }
  }
  
  const serverTransport = new HTTPServerTransport();
  const channel = new Channel(serverTransport, 'http-server');
  
  // Register methods
  channel.publishMethod(getUserMethod);
  channel.publishMethod(createUserMethod);
  channel.publishMethod(calculateMethod);
  
  // Set up HTTP server to handle RPC messages
  httpServer.onMessage(async (message) => {
    // Clear any previous response
    serverTransport.clearResponse();
    
    // Process the message through the channel
    await (channel as any).handleMessage(message);
    
    // Return the response
    return serverTransport.getResponse();
  });
  
  // Start the server
  await httpServer.start(3000);
  
  console.log('🚀 RPC HTTP Server started!');
  console.log('Available endpoints:');
  console.log('  GET  http://localhost:3000/health - Health check');
  console.log('  POST http://localhost:3000/rpc    - RPC calls');
  console.log('');
  console.log('Available methods:');
  console.log('  - user.get: Get user by ID');
  console.log('  - user.create: Create a new user');
  console.log('  - math.calculate: Perform calculations');
}

// Start the server
startServer().catch(console.error);
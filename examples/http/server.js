"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const dist_1 = require("../../dist");
// Simple HTTP server adapter using Node.js built-in http module
class NodeHTTPAdapter {
    constructor() {
        this.routes = new Map();
    }
    async start(port) {
        const http = await Promise.resolve().then(() => __importStar(require('http')));
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
                    }
                    catch (error) {
                        res.writeHead(500);
                        res.end(JSON.stringify({
                            error: error instanceof Error ? error.message : 'Unknown error'
                        }));
                    }
                });
            }
            catch (error) {
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
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => resolve());
            }
            else {
                resolve();
            }
        });
    }
    onRequest(path, handler) {
        this.routes.set(path, handler);
    }
}
// Define some example methods
const getUserMethod = (0, dist_1.defineMethod)({
    id: 'user.get',
    input: zod_1.z.object({
        userId: zod_1.z.string()
    }),
    output: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string()
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
const createUserMethod = (0, dist_1.defineMethod)({
    id: 'user.create',
    input: zod_1.z.object({
        name: zod_1.z.string(),
        email: zod_1.z.string().email()
    }),
    output: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string(),
        createdAt: zod_1.z.string()
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
const calculateMethod = (0, dist_1.defineMethod)({
    id: 'math.calculate',
    input: zod_1.z.object({
        operation: zod_1.z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: zod_1.z.number(),
        b: zod_1.z.number()
    }),
    output: zod_1.z.object({
        result: zod_1.z.number(),
        operation: zod_1.z.string()
    }),
    handler: async (input) => {
        let result;
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
async function startServer() {
    const adapter = new NodeHTTPAdapter();
    const httpServer = new dist_1.HTTPChannelServer(adapter);
    // Create a dummy transport for the channel (HTTP server doesn't need real transport)
    const dummyTransport = {
        send: async () => { },
        onMessage: () => { },
        connect: async () => { },
        disconnect: async () => { },
        isConnected: () => true
    };
    const channel = new dist_1.Channel(dummyTransport, 'http-server');
    // Register methods
    channel.publishMethod(getUserMethod);
    channel.publishMethod(createUserMethod);
    channel.publishMethod(calculateMethod);
    // Set up HTTP server to handle RPC messages
    httpServer.onMessage(async (message) => {
        // Create a response handler that will send the response back via HTTP
        const originalSend = dummyTransport.send;
        let responseMessage;
        dummyTransport.send = async (msg) => {
            responseMessage = msg;
        };
        // Process the message through the channel
        await channel.handleMessage(message);
        // Restore original send method
        dummyTransport.send = originalSend;
        return responseMessage;
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
//# sourceMappingURL=server.js.map
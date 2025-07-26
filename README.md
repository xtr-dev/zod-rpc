# zod-rpc

<div align="center">

**Type-safe RPC library with Zod validation for WebSocket, WebRTC, and HTTP transports**

[![npm version](https://img.shields.io/npm/v/zod-rpc.svg)](https://www.npmjs.com/package/zod-rpc)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-92.33%25-brightgreen.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## ✨ Features

- 🔒 **Type Safety**: Full TypeScript support with compile-time type checking
- ⚡ **Runtime Validation**: Automatic input/output validation using Zod schemas
- 🌐 **Multiple Transports**: WebSocket, WebRTC DataChannel, and HTTP support
- 📡 **Real-time**: Perfect for chat apps, collaborative tools, and live updates
- 🔄 **Peer-to-Peer**: Direct WebRTC communication without servers
- 🎯 **Service Introspection**: Query available methods and services
- 📋 **Message Tracing**: Built-in tracing with `callerId`, `targetId`, and `traceId`

## 🚀 Quick Start

### Installation

```bash
npm install zod-rpc zod
```

### Basic Usage

```typescript
import { z } from 'zod';
import { defineMethod, Channel, createWebSocketTransport } from 'zod-rpc';

// Define a method with Zod schemas
const getUserMethod = defineMethod({
  id: 'user.get',
  input: z.object({ userId: z.string() }),
  output: z.object({ name: z.string(), email: z.string() }),
  handler: async (input) => ({
    name: `User ${input.userId}`,
    email: `user${input.userId}@example.com`
  })
});

// Set up WebSocket transport
const transport = createWebSocketTransport('ws://localhost:8080');
const channel = new Channel(transport, 'my-service');

// Publish method
channel.publishMethod(getUserMethod);

// Connect and start handling requests
await channel.connect();
```

### Contract-Based Development (Recommended)

For better separation between client and server code, use contracts:

```typescript
// shared/contracts.ts - Shared between client and server
import { z } from 'zod';
import { defineContract } from 'zod-rpc';

export const userContract = defineContract({
  id: 'user.get',
  input: z.object({ userId: z.string() }),
  output: z.object({ name: z.string(), email: z.string() })
});

// server.ts - Server implementation
import { implementContract } from 'zod-rpc';
import { userContract } from './shared/contracts';

const userMethod = implementContract(userContract, async (input) => ({
  name: `User ${input.userId}`,
  email: `user${input.userId}@example.com`
}));

channel.publishMethod(userMethod);

// client.ts - Type-safe client calls
import { createTypedInvoker } from 'zod-rpc';
import { userContract } from './shared/contracts';

const getUser = createTypedInvoker(userContract, channel.invoke.bind(channel));
const user = await getUser('server-id', { userId: '123' }); // Fully typed!
```

### Service Introspection

Query available methods and services programmatically:

```typescript
// Get all connected services
const services = channel.getConnectedServices();
console.log(services); // [{ id: 'user-service', methods: [...] }]

// Get methods for a specific service
const methods = channel.getAvailableMethods('user-service');
console.log(methods); // [{ id: 'user.get', name: 'get' }, ...]

// Use this to build service discovery, method routing, or admin interfaces
```

## 📚 Examples

### Interactive Examples Dashboard
```bash
# Start the development server and visit the examples dashboard
npm run example:dev
# Visit: http://localhost:3001/examples/
```

### Contract-Based Development
```bash
# Terminal 1: Start contract server
npm run example:contracts:server

# Terminal 2: Run contract client  
npm run example:contracts:client
```

### WebSocket Real-time Communication
```bash
# Start server
npm run example:websocket:server

# Open browser client
npm run dev
# Visit: http://localhost:3001/websocket/client.html
```

### WebRTC Peer-to-Peer
```bash
# Start development server
npm run dev

# Open two browser tabs:
# Peer 1: http://localhost:3001/webrtc/peer1.html
# Peer 2: http://localhost:3001/webrtc/peer2.html
```

### HTTP API
```bash
# Start HTTP server
npm run example:http:server

# Open browser client
npm run example:dev
# Visit: http://localhost:3001/http/client.html
```

## 🏗️ Architecture

zod-rpc provides a unified RPC interface across different transport protocols:

- **Method Definition**: Type-safe method definitions with Zod validation
- **Channel**: Central communication hub for method calls and responses  
- **Transports**: Pluggable transport layer (WebSocket/WebRTC/HTTP)
- **Service Introspection**: APIs to query available methods and connected services
- **Error Handling**: Comprehensive error types with proper propagation

## 📖 Documentation

- [WebSocket Example](./examples/websocket/README.md) - Real-time communication
- [WebRTC Example](./examples/webrtc/README.md) - Peer-to-peer communication  
- [HTTP Example](./examples/http/README.md) - Traditional REST-like APIs

## 🧪 Testing

The library has **92.33% test coverage** with comprehensive unit and integration tests:

```bash
npm test                # Run tests
npx jest --coverage     # Run with coverage report
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

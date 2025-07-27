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

## Core Concepts

**zod-rpc** is built around a few core concepts:

- **Methods**: These are the remote procedures that you can call. They are defined with Zod schemas for input and output validation.
- **Contracts**: Contracts define the shape of your methods, without the implementation. This allows you to share the contract between the client and server, ensuring type safety.
- **Transports**: Transports are responsible for sending and receiving messages. zod-rpc comes with built-in transports for WebSocket, WebRTC, and HTTP.
- **Channels**: Channels are the central communication hub. They manage the connection, and allow you to publish methods and invoke remote methods.
- **Services**: A service is a collection of methods. You can use services to group related methods together.

## 🚀 Quick Start

### Prerequisites

Make sure you have Node.js version 16 or higher installed.



### Getting Started

1.  **Initialize your project**

    ```bash
    npm init -y
    npm install typescript zod zod-rpc
    npx tsc --init
    ```

2.  **Create a `server.ts` file**

    ```typescript
    // server.ts
    import { z } from 'zod';
    import { defineMethod, Channel, createWebSocketTransport } from 'zod-rpc';

    const getUserMethod = defineMethod({
      id: 'user.get',
      input: z.object({ userId: z.string() }),
      output: z.object({ name: z.string(), email: z.string() }),
      handler: async (input) => ({
        name: `User ${input.userId}`,
        email: `user${input.userId}@example.com`
      })
    });

    const transport = createWebSocketTransport('ws://localhost:8080');
    const channel = new Channel(transport, 'my-service');

    channel.publishMethod(getUserMethod);

    channel.connect();
    ```

3.  **Create a `client.ts` file**

    ```typescript
    // client.ts
    import { z } from 'zod';
    import { createTypedInvoker, Channel, createWebSocketTransport } from 'zod-rpc';
    import { userContract } from './shared/contracts'; // Assuming you have a shared contract

    const transport = createWebSocketTransport('ws://localhost:8080');
    const channel = new Channel(transport, 'my-client');

    const getUser = createTypedInvoker(userContract, channel.invoke.bind(channel));

    async function main() {
      await channel.connect();
      const user = await getUser('my-service', { userId: '123' });
      console.log(user);
    }

    main();
    ```

4.  **Create a `shared/contracts.ts` file**

    ```typescript
    // shared/contracts.ts
    import { z } from 'zod';
    import { defineContract } from 'zod-rpc';

    export const userContract = defineContract({
      id: 'user.get',
      input: z.object({ userId: z.string() }),
      output: z.object({ name: z.string(), email: z.string() })
    });
    ```

5.  **Update your `tsconfig.json`**

    ```json
    {
      "compilerOptions": {
        "outDir": "./dist"
      }
    }
    ```

6.  **Run your server and client**

    ```bash
    npx tsc
    node dist/server.js
    node dist/client.js
    ```

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





## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

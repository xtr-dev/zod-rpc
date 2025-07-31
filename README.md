# zod-rpc

<div align="center">

**Type-safe RPC library with Zod validation for WebSocket, WebRTC, and HTTP transports**

> ⚠️ **Development Notice**: This project is under active development and the API may change before the first major release (1.0.0). Use with caution in production environments.

[![npm version](https://img.shields.io/npm/v/@xtr-dev/zod-rpc.svg)](https://www.npmjs.com/package/@xtr-dev/zod-rpc)
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

## Core Concepts

**zod-rpc** is built around a few core concepts:

- **Methods**: These are the remote procedures that you can call. They are defined with Zod schemas for input and output validation.
- **Contracts**: Contracts define the shape of your methods, without the implementation. This allows you to share the contract between the client and server, ensuring type safety.
- **Transports**: Transports are responsible for sending and receiving messages. zod-rpc comes with built-in transports for WebSocket, WebRTC, and HTTP.
- **Channels**: Channels are the central communication hub. They manage the connection, and allow you to publish methods and invoke remote methods.
- **Services**: A service is a collection of methods. You can use services to group related methods together.

## 🚀 Quick Start

### Installation

```bash
npm install @xtr-dev/zod-rpc zod
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

### Service Organization

Services help organize related methods under a common namespace. Methods are grouped by using dotted method IDs:

```typescript
// shared/contracts.ts - Define service contracts
import { z } from 'zod';
import { defineContract } from 'zod-rpc';

// User service contracts
export const userService = {
  getUser: defineContract({
    id: 'user.get',
    input: z.object({ userId: z.string() }),
    output: z.object({ id: z.string(), name: z.string(), email: z.string() })
  }),

  createUser: defineContract({
    id: 'user.create',
    input: z.object({ name: z.string(), email: z.string() }),
    output: z.object({ id: z.string(), success: z.boolean() })
  }),

  listUsers: defineContract({
    id: 'user.list',
    input: z.object({ page: z.number().min(1), limit: z.number().min(1).max(100) }),
    output: z.object({ 
      users: z.array(z.object({ id: z.string(), name: z.string() })),
      total: z.number() 
    })
  })
};

// Math service contracts
export const mathService = {
  add: defineContract({
    id: 'math.add',
    input: z.object({ a: z.number(), b: z.number() }),
    output: z.object({ result: z.number() })
  }),

  multiply: defineContract({
    id: 'math.multiply',
    input: z.object({ a: z.number(), b: z.number() }),
    output: z.object({ result: z.number() })
  })
};

// server.ts - Implement service methods
import { implementContract, Channel, createWebSocketTransport } from 'zod-rpc';
import { userService, mathService } from './shared/contracts';

const userMethods = {
  getUser: implementContract(userService.getUser, async ({ userId }) => {
    // Implementation logic
    return { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` };
  }),

  createUser: implementContract(userService.createUser, async ({ name, email }) => {
    // Implementation logic
    const id = Math.random().toString(36);
    return { id, success: true };
  }),

  listUsers: implementContract(userService.listUsers, async ({ page, limit }) => {
    // Implementation logic
    return { users: [], total: 0 };
  })
};

const mathMethods = {
  add: implementContract(mathService.add, async ({ a, b }) => ({
    result: a + b
  })),

  multiply: implementContract(mathService.multiply, async ({ a, b }) => ({
    result: a * b
  }))
};

// Set up server channel and publish all service methods
const transport = createWebSocketTransport('ws://localhost:8080');
const channel = new Channel(transport, 'my-server');

// Publish user service methods
channel.publishMethod(userMethods.getUser);
channel.publishMethod(userMethods.createUser);
channel.publishMethod(userMethods.listUsers);

// Publish math service methods
channel.publishMethod(mathMethods.add);
channel.publishMethod(mathMethods.multiply);

await channel.connect();

// client.ts - Create typed service clients
import { createServiceClient, createBoundServiceClient } from 'zod-rpc';
import { userService, mathService } from './shared/contracts';

// Option 1: Create service clients that require target ID for each call
const userClient = createServiceClient(userService, channel.invoke.bind(channel));
const mathClient = createServiceClient(mathService, channel.invoke.bind(channel));

// Use with target ID for each call
const user = await userClient.getUser('server-id', { userId: '123' });
const result = await mathClient.add('server-id', { a: 5, b: 3 });

// Option 2: Create bound service clients pre-configured with target ID
const boundUserClient = createBoundServiceClient(userService, 'server-id', channel.invoke.bind(channel));
const boundMathClient = createBoundServiceClient(mathService, 'server-id', channel.invoke.bind(channel));

// Use without repeating target ID (much cleaner!)
const user2 = await boundUserClient.getUser({ userId: '456' });
const result2 = await boundMathClient.add({ a: 10, b: 20 });
const userList = await boundUserClient.listUsers({ page: 1, limit: 10 });

// Get available methods for connected services
const services = channel.getConnectedServices();
const userMethods = channel.getAvailableMethods('server-id').filter(m => m.id.startsWith('user.'));
```

## 📄 License

Public Domain

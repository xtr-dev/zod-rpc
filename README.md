# zod-rpc

<div align="center">

**Type-safe RPC library with Zod validation for WebSocket, WebRTC, and HTTP transports**

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

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

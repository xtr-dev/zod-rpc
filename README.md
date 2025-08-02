# zod-rpc

<div align="center">

**Simple, type-safe RPC library with Zod validation**

[![npm version](https://img.shields.io/npm/v/@xtr-dev/zod-rpc.svg)](https://www.npmjs.com/package/@xtr-dev/zod-rpc)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📖 **[View API Documentation](https://xtr-dev.github.io/zod-rpc/)**

</div>

## ✨ Features

- 🎯 **Simple API**: Define once, use everywhere with minimal boilerplate
- 🔒 **Type Safety**: Full TypeScript support with automatic type inference
- ⚡ **Runtime Validation**: Automatic input/output validation using Zod schemas
- 🌐 **Multiple Transports**: WebSocket, HTTP, and WebRTC support
- 📡 **Real-time**: Perfect for chat apps, collaborative tools, and live updates
- ✨ **Single Source of Truth**: Zod schemas define validation, TypeScript types, and documentation all at once

## 🚀 Quick Start

### Installation

```bash
npm install @xtr-dev/zod-rpc zod
```

### Usage

Creating type-safe RPC services is incredibly simple:

#### 1. Define your service (shared between client and server)

```typescript
// shared/services.ts
import { z } from 'zod';
import { defineService } from '@xtr-dev/zod-rpc';

export const userService = defineService('user', {
  get: {
    input: z.object({ 
      userId: z.string().describe('Unique identifier for the user to retrieve')
    }),
    output: z.object({ 
      name: z.string().describe('Full name of the user'),
      email: z.string().email().describe('Email address of the user'),
      age: z.number().min(0).max(120).describe('Age of the user in years')
    })
  },
  create: {
    input: z.object({ 
      name: z.string().min(1).describe('Full name of the new user'),
      email: z.string().email().describe('Email address for the new user'),
      age: z.number().min(0).max(120).describe('Age of the user in years')
    }),
    output: z.object({ 
      id: z.string().describe('Unique identifier assigned to the new user'),
      success: z.boolean().describe('Whether the user was created successfully')
    })
  }
});
```

#### 2. Create your server

```typescript
// server.ts
import { createRPCServer } from '@xtr-dev/zod-rpc';
import { userService } from './shared/services';

const server = createRPCServer('ws://localhost:8080')
  .implement(userService, {
    get: async ({ userId }) => ({
      name: `User ${userId}`,
      email: `user${userId}@example.com`,
      age: Math.floor(Math.random() * 50) + 18
    }),
    create: async ({ name, email, age }) => ({
      id: Math.random().toString(36),
      success: true
    })
  });

await server.start();
```

#### 3. Create your client

```typescript
// client.ts
import { createRPCClient } from '@xtr-dev/zod-rpc';
import { userService } from './shared/services';

const client = await createRPCClient({
  url: 'ws://localhost:8080',
  services: { user: userService }
});

// Fully typed method calls with automatic target resolution
const user = await client.user.get({ userId: '123' });
const newUser = await client.user.create({ 
  name: 'Alice', 
  email: 'alice@example.com', 
  age: 30 
});

// TypeScript automatically infers:
// - user: { name: string; email: string; age: number }
// - newUser: { id: string; success: boolean }

// Plus you get automatic validation and documentation from the same schemas!
```

### The Power of Single Source of Truth

With zod-rpc, your Zod schemas serve multiple purposes simultaneously:

```typescript
const userService = defineService('user', {
  get: {
    input: z.object({ 
      userId: z.string().describe('Unique identifier for the user to retrieve')
    }),
    output: z.object({ 
      name: z.string().describe('Full name of the user'),
      email: z.string().email().describe('Email address of the user'),
      age: z.number().min(0).max(120).describe('Age of the user in years')
    })
  }
});

// This single schema definition provides:
// ✅ Runtime validation (invalid data is caught automatically)
// ✅ TypeScript types (full IntelliSense support)  
// ✅ API documentation (descriptions show up in generated docs)
// ✅ Input constraints (email format, age ranges, etc.)
// ✅ Error messages (descriptive validation failures)
```

**No more maintaining separate:**
- TypeScript interface files
- Validation schemas  
- API documentation
- Error handling logic

### Advanced Usage Options

#### Fluent Builder Pattern

For more complex configurations, use the fluent builder pattern:

```typescript
// Client with builder pattern
const client = await connect('ws://localhost:8080')
  .withId('my-client')
  .withTimeout(10000)
  .withServices({ user: userService, math: mathService })
  .build();

// Server with builder pattern
const server = createServer('ws://localhost:8080')
  .withId('my-server')
  .withTimeout(15000)
  .implement(userService, userImplementation)
  .implement(mathService, mathImplementation)
  .build();

await server.start();
```

#### Custom Target and Options

```typescript
// Override automatic target resolution for specific calls
// Useful in multi-server environments or microservices
const user = await client.user.get({ userId: '123' }, { 
  target: 'user-service-east',  // Route to specific server instance
  timeout: 5000                // Custom timeout for this call
});

// Set default target for all calls from this client
// Useful when connecting to a specific server cluster
client.setDefaultTarget('production-cluster');
```

#### Understanding Target Resolution

```typescript
// By default, zod-rpc uses the service ID as the target
defineService('user', { ... })  // Automatically targets 'user'
defineService('math', { ... })  // Automatically targets 'math'

// You can override this behavior:
const client = await createRPCClient({
  url: 'ws://localhost:8080',
  services: { user: userService },
  defaultTarget: 'auto'      // Use service ID (default)
  // defaultTarget: 'server'  // Send all requests to 'server'
});
```

## Key Benefits

- **Single source of truth** - Zod schemas provide validation, types, and documentation in one place
- **Automatic type inference** - No manual type definitions needed
- **Runtime safety** - Zod validation catches errors early
- **Self-documenting APIs** - Schema descriptions become your API docs automatically
- **Simple mental model** - RPC calls work like local function calls
- **Multiple transport support** - Same API for WebSocket, HTTP, WebRTC, and more
- **Minimal boilerplate** - Focus on business logic, not RPC infrastructure

## Examples

Check out the `/examples/` directory for complete working examples:

- **`/examples/websocket/`** - WebSocket client/server with real-time communication
- **`/examples/http/`** - HTTP/Express middleware integration with REST-like patterns

## 📄 License

Public Domain

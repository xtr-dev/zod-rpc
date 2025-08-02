# HTTP/Express Middleware Examples

This directory contains examples showing how to use **zod-rpc** with Express.js using the `zodRpc()` middleware.

## Overview

Unlike WebSocket transport which maintains persistent connections, HTTP transport works with request/response cycles. The zod-rpc HTTP implementation provides Express middleware that can be easily integrated into your Express applications.

## Examples Included

### 1. Express Server (`express-server.ts`)
Demonstrates integration with Express.js using `zodRpc()` middleware with local Channel:

```typescript
import express from 'express';
import { zodRpc, Channel, implementService } from '@xtr-dev/zod-rpc';

const app = express();
app.use(express.json());

// Create channel for local method invocation (no transport needed)
const channel = new Channel('server');

// Implement services with targetId
const userMethods = implementService(userService, {
  get: async ({ userId }) => ({ id: userId, name: 'John' }),
  create: async ({ name, email }) => ({ id: '123', success: true })
}, 'server');

// Publish methods to channel
userMethods.forEach(method => channel.publishMethod(method));

// Mount middleware at /rpc endpoint
app.use('/rpc', zodRpc(channel));
```

### 2. Client (`client.ts`)
Demonstrates how to create HTTP clients and make RPC calls:

```typescript
import { createRPCClient } from '@xtr-dev/zod-rpc';

const client = await createRPCClient({
  url: 'http://localhost:3000',
  services: { user: userService }
});

const user = await client.user.get({ userId: '123' });
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Navigate to the HTTP examples directory:
```bash
cd examples/http
```

2. Install dependencies:
```bash
npm install
```

### Running the Examples

#### Option 1: Express Server (Port 3000)

1. **Start the Express server:**
```bash
npm start
# or for development with auto-reload:
npm run dev
```

2. **In another terminal, run the client:**
```bash
npm run client
```


### Testing the API

#### Health Check
```bash
curl http://localhost:3000/health
```

#### Direct RPC Call
```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "curl-client",
    "targetId": "user", 
    "traceId": "test-123",
    "methodId": "user.get",
    "payload": {"userId": "1"},
    "type": "request"
  }'
```

#### Browser Example
```bash
npm run client:browser
```

## Key Features Demonstrated

### 🔧 **Middleware Integration**
- Express.js integration with `zodRpc()` middleware
- Local method execution without transport overhead
- Proper error handling and response formatting

### 🌐 **HTTP Transport**
- Request/response cycle handling
- JSON payload processing
- CORS support for browser clients
- Health check endpoints

### 🛡️ **Type Safety**
- Full TypeScript support
- Zod schema validation
- Automatic type inference

### 📡 **Service Architecture**
- Multiple services (user, math)
- Clean service separation
- Scalable handler pattern

## API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | API information |
| `/health` | GET | Health check |
| `/rpc` | POST | RPC calls |

## Service Methods

### User Service
- `user.get(userId)` - Get user by ID
- `user.create(name, email, age)` - Create new user  
- `user.list(page, limit)` - List users with pagination

### Math Service
- `math.add(a, b)` - Add two numbers
- `math.calculate(expression, precision)` - Evaluate mathematical expression

## Browser Integration

The HTTP transport works great with browser clients:

```javascript
// Browser-compatible RPC call
const response = await fetch('http://localhost:3000/rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callerId: 'browser',
    targetId: 'user',
    traceId: 'trace-' + Date.now(),
    methodId: 'user.get',
    payload: { userId: '1' },
    type: 'request'
  })
});

const result = await response.json();
console.log(result.payload); // User data
```

## Production Considerations

### Security
- Add authentication middleware before RPC middleware
- Validate and sanitize inputs
- Implement rate limiting
- Use HTTPS in production

### Performance
- Consider connection pooling for client
- Add request/response compression
- Implement caching where appropriate
- Monitor performance metrics

### Error Handling
- Implement proper error logging
- Return appropriate HTTP status codes
- Handle timeouts gracefully
- Provide meaningful error messages

## Comparison with WebSocket

| Feature | HTTP | WebSocket |
|---------|------|-----------|
| **Connection** | Request/Response | Persistent |
| **Real-time** | No | Yes |
| **Browser Support** | Excellent | Good |
| **Caching** | HTTP caching | None |
| **Load Balancing** | Easy | Complex |
| **Firewall Friendly** | Yes | Sometimes |

Choose HTTP for:
- RESTful APIs
- Stateless operations  
- Simple request/response patterns
- Better caching support
- Easier load balancing

Choose WebSocket for:
- Real-time applications
- Persistent connections
- Lower latency requirements
- Bidirectional communication

## Next Steps

- Explore the WebSocket examples in `../websocket/`
- Check out the main documentation in the project root
- Try integrating with other HTTP frameworks (Fastify, Koa, etc.)
- Experiment with different transport configurations
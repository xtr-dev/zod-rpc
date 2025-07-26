# HTTP RPC Example

This example demonstrates how to use zod-rpc with HTTP transport for building type-safe RPC APIs.

## Overview

The example includes:
- **Server**: HTTP server that exposes RPC methods via REST endpoints
- **Client**: HTTP client that makes type-safe RPC calls to the server

## Available Methods

### `user.get`
Get user information by ID.
- **Input**: `{ userId: string }`
- **Output**: `{ id: string, name: string, email: string }`

### `user.create`
Create a new user.
- **Input**: `{ name: string, email: string }`
- **Output**: `{ id: string, name: string, email: string, createdAt: string }`

### `math.calculate`
Perform mathematical calculations.
- **Input**: `{ operation: 'add'|'subtract'|'multiply'|'divide', a: number, b: number }`
- **Output**: `{ result: number, operation: string }`

## Running the Example

### 1. Build the project
```bash
npm run build
```

### 2. Start the server
```bash
npm run example:http:server
```

The server will start on `http://localhost:3000` with the following endpoints:
- `GET /health` - Health check endpoint
- `POST /rpc` - RPC method calls

### 3. Run the client (in another terminal)
```bash
npm run example:http:client
```

## API Usage

### Direct HTTP Calls

You can also make direct HTTP requests to test the API:

```bash
# Health check
curl http://localhost:3000/health

# Get user
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "test-client",
    "targetId": "http-server", 
    "traceId": "test-123",
    "methodId": "user.get",
    "payload": {"userId": "123"},
    "type": "request"
  }'

# Create user
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "test-client",
    "targetId": "http-server",
    "traceId": "test-456", 
    "methodId": "user.create",
    "payload": {"name": "John Doe", "email": "john@example.com"},
    "type": "request"
  }'

# Calculate
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "callerId": "test-client",
    "targetId": "http-server",
    "traceId": "test-789",
    "methodId": "math.calculate", 
    "payload": {"operation": "add", "a": 10, "b": 5},
    "type": "request"
  }'
```

## Key Features Demonstrated

1. **Type Safety**: Full TypeScript support with compile-time type checking
2. **Runtime Validation**: Zod schemas validate input/output at runtime
3. **Error Handling**: Proper error propagation with detailed error messages
4. **CORS Support**: Server includes CORS headers for browser compatibility
5. **Health Checks**: Built-in health check endpoint
6. **Flexible Clients**: Both typed invokers and direct channel calls supported

## Code Structure

### Server (`server.ts`)
- Custom HTTP server adapter using Node.js built-in `http` module
- Method definitions with Zod schemas and handlers
- Channel setup with method registration
- HTTP endpoint routing for RPC calls

### Client (`client.ts`)
- HTTP transport configuration
- Type-safe method calling using `createTypedInvoker`
- Direct channel invoke examples
- Error handling and connection management
- Server health checking

## Extending the Example

To add new methods:

1. Define the method with Zod schemas:
```typescript
const newMethod = defineMethod({
  id: 'namespace.methodName',
  input: z.object({ /* input schema */ }),
  output: z.object({ /* output schema */ }),
  handler: async (input) => {
    // Implementation
    return output;
  }
});
```

2. Register it on the server:
```typescript
channel.publishMethod(newMethod);
```

3. Create a typed invoker on the client:
```typescript
const callNewMethod = createTypedInvoker(newMethod, channel.invoke.bind(channel));
// Usage: await callNewMethod('target-service-id', inputData);
```

This example shows how zod-rpc can be used to build traditional HTTP APIs with the benefits of type safety and runtime validation.
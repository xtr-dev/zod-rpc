# WebSocket zod-rpc Example

This example demonstrates the WebSocket transport of zod-rpc, showing how to create type-safe real-time RPC services.

## Files

- `shared.ts` - Service definitions shared between client and server
- `server.ts` - Server implementation using the simplified API
- `client.ts` - Client usage with automatic type safety

## Key Features Demonstrated

1. **Service Definition**: Define services once, use everywhere
2. **Automatic Type Safety**: Full TypeScript support without manual type annotations
3. **Simple Client Creation**: One function call to create a fully-typed client
4. **Easy Server Setup**: Fluent API for server configuration
5. **No Target ID Needed**: Automatic target resolution for most use cases

## Running the Example

1. Start the server:
```bash
npm run build:examples
node dist/examples/websocket/server.js
```

2. In another terminal, run the client:
```bash
node dist/examples/websocket/client.js
```

## API Comparison

### Before (Complex)
```typescript
// Define contracts
const getUserContract = defineContract({
  id: 'user.get',
  input: z.object({ userId: z.string() }),
  output: z.object({ name: z.string(), email: z.string() })
});

// Create transport and channel
const transport = createWebSocketTransport('ws://localhost:8080');
const channel = new Channel('client');
await channel.connect(transport);

// Create typed invoker
const getUser = createTypedInvoker(getUserContract, channel.invoke.bind(channel));

// Use with target ID
const user = await getUser('server', { userId: '123' });
```

### After (Simple)
```typescript
// Define service
const userService = defineService('user', {
  get: {
    input: z.object({ userId: z.string() }),
    output: z.object({ name: z.string(), email: z.string() })
  }
});

// Create client
const client = await createRPCClient({
  url: 'ws://localhost:8080',
  services: { user: userService }
});

// Use directly - no target ID needed!
const user = await client.user.get({ userId: '123' });
```
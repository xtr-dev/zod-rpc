# WebSocket RPC Example

This example demonstrates real-time RPC communication using WebSockets with zod-rpc.

## Overview

- **Server**: WebSocket server that handles RPC method calls
- **Client**: Browser-based client with interactive UI hosted by Vite

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

### `chat.message`
Send chat messages (WebSocket-specific feature).
- **Input**: `{ message: string, username: string }`
- **Output**: `{ id: string, message: string, username: string, timestamp: string }`

## Running the Example

### 1. Start the WebSocket server
```bash
npm run example:websocket:server
```

The server will start on `ws://localhost:8080`

### 2. Start the Vite development server (in another terminal)
```bash
npm run dev
```

The web client will be available at: `http://localhost:3001/websocket/client.html`

### 3. Open the WebSocket client
Navigate to `http://localhost:3001/websocket/client.html` in your browser and:

1. Click "Connect" to establish WebSocket connection
2. Try the different RPC methods:
   - **Get User**: Retrieve user information
   - **Create User**: Create new users with validation
   - **Calculator**: Perform real-time calculations
   - **Chat**: Send messages (demonstrates WebSocket's real-time nature)

## Key Features Demonstrated

1. **Real-time Communication**: Instant bidirectional communication
2. **Type Safety**: Full TypeScript support with runtime validation
3. **Interactive UI**: User-friendly browser interface
4. **Connection Management**: Automatic reconnection and state management
5. **Error Handling**: Comprehensive error display and handling
6. **WebSocket-specific Features**: Real-time chat functionality

## Code Structure

### Server (`examples/websocket/server.ts`)
- WebSocket server using the `ws` library
- Method registration and handling
- Connection management for multiple clients

### Client (`examples/websocket/client.html`)
- Browser-based client with HTML/CSS/JavaScript
- WebSocket connection management
- Interactive forms for testing RPC methods
- Real-time results display

## Extending the Example

To add new methods:

1. Define the method on the server:
```typescript
const newMethod = defineMethod({
  id: 'namespace.method',
  input: z.object({ /* schema */ }),
  output: z.object({ /* schema */ }),
  handler: async (input) => {
    // Implementation
    return result;
  }
});

channel.publishMethod(newMethod);
```

2. Add the method schema to the client and create a typed invoker:
```javascript
const newMethodSchema = {
  id: 'namespace.method',
  input: z.object({ /* same schema */ }),
  output: z.object({ /* same schema */ }),
  handler: async () => { throw new Error('Client-side handler'); }
};

const callNewMethod = createTypedInvoker(newMethodSchema, channel.invoke.bind(channel));
```

3. Add UI elements and call the method:
```javascript
const result = await callNewMethod('ws-server', inputData);
```

This example showcases how WebSockets enable real-time, low-latency RPC communication perfect for interactive applications, chat systems, and live data updates.
# WebRTC RPC Example

This example demonstrates peer-to-peer RPC communication using WebRTC DataChannels with zod-rpc.

## Overview

- **Peer 1 (Caller)**: Creates offers and initiates the WebRTC connection
- **Peer 2 (Answerer)**: Receives offers and responds with answers
- **Direct P2P**: No server required once connection is established

## Available Methods

### Peer 1 can call on Peer 2:
- `user.info`: Get user information
- `message.send`: Send messages with echo response
- `math.operation`: Perform add/multiply operations

### Peer 2 can call on Peer 1:
- `ping`: Send ping messages with pong response

## Running the Example

### 1. Start the Vite development server
```bash
npm run dev
```

### 2. Open two browser tabs/windows
- **Peer 1**: `http://localhost:3001/webrtc/peer1.html`
- **Peer 2**: `http://localhost:3001/webrtc/peer2.html`

### 3. Establish WebRTC Connection

**On Peer 1:**
1. Click "Create Offer"
2. Copy the generated offer (JSON)

**On Peer 2:**
1. Paste the offer in the "Remote Offer" field
2. Click "Set Offer"
3. Click "Create Answer"
4. Copy the generated answer (JSON)

**Back on Peer 1:**
1. Paste the answer in the "Remote Answer" field
2. Click "Set Answer"

**Connection should establish automatically!**

### 4. Test RPC Methods

Once connected, try the RPC methods:

**On Peer 1:**
- Get user info from Peer 2
- Send messages to Peer 2
- Perform calculations on Peer 2

**On Peer 2:**
- Ping Peer 1
- Check connection status

## WebRTC Signaling Process

```
Peer 1 (Caller)           Peer 2 (Answerer)
      |                          |
      |  1. Create Offer         |
      |------------------------->|
      |                          |
      |  2. Set Offer & Create   |
      |     Answer               |
      |<-------------------------|
      |                          |
      |  3. Set Answer           |
      |                          |
      |  4. DataChannel Opens    |
      |<========RPC Calls=======>|
```

## Key Features Demonstrated

1. **Peer-to-Peer**: Direct communication without servers
2. **WebRTC Signaling**: Manual offer/answer exchange
3. **DataChannel RPC**: RPC over WebRTC DataChannels
4. **Bidirectional**: Both peers can call methods on each other
5. **Type Safety**: Full TypeScript support with validation
6. **Connection Management**: Real-time connection state monitoring

## Code Structure

### Peer 1 (`examples/webrtc/peer1.html`)
- Creates WebRTC offers
- Implements ping method for Peer 2 to call
- Can call user.info, message.send, math.operation on Peer 2

### Peer 2 (`examples/webrtc/peer2.html`)
- Handles WebRTC offers and creates answers
- Implements user.info, message.send, math.operation methods
- Can call ping method on Peer 1

## Production Considerations

For production use, consider:

1. **Signaling Server**: Implement a proper signaling server (WebSocket/Socket.IO)
2. **STUN/TURN Servers**: Configure ICE servers for NAT traversal
3. **Error Handling**: Add comprehensive error handling and reconnection logic
4. **Security**: Implement authentication and encryption
5. **Connection Management**: Handle connection failures and reconnection

## Extending the Example

To add new methods:

1. Define the method on the peer that will handle it:
```javascript
channel.publishMethod(defineMethod({
  id: 'custom.method',
  input: z.object({ /* schema */ }),
  output: z.object({ /* schema */ }),
  handler: async (input) => {
    // Implementation
    return result;
  }
}));
```

2. Create a typed invoker on the calling peer:
```javascript
const customMethod = {
  id: 'custom.method',
  input: z.object({ /* same schema */ }),
  output: z.object({ /* same schema */ }),
  handler: async () => { throw new Error('Client-side handler'); }
};

const callCustomMethod = createTypedInvoker(customMethod, channel.invoke.bind(channel));
```

3. Use the method:
```javascript
const result = await callCustomMethod('peer2', inputData);
```

This example demonstrates how WebRTC enables direct peer-to-peer RPC communication, perfect for real-time applications, gaming, file sharing, and collaborative tools without requiring a central server.

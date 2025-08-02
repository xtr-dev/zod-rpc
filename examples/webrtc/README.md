# WebRTC Example

This example demonstrates peer-to-peer communication using Zod RPC over WebRTC DataChannels. It includes two HTML pages that can connect directly to each other without a server.

## Features

- **Direct P2P Connection**: Uses WebRTC for direct browser-to-browser communication
- **Type-Safe RPC**: All communication is validated using Zod schemas
- **Real-time Messaging**: Send and receive chat messages instantly
- **File Transfer**: Send files directly between peers with progress tracking
- **Ping/Pong**: Test connection latency with ping functionality
- **Beautiful UI**: Clean, responsive interface with beach theme colors

## Quick Start

1. **Build the TypeScript files:**
   ```bash
   npm install
   npm run build
   ```

2. **Start the development server:**
   ```bash
   npm run serve
   ```

3. **Open the example:**
   - Open `http://localhost:8080/offerer.html` in one browser tab/window
   - Open `http://localhost:8080/answerer.html` in another browser tab/window (or different browser/device)

## How to Use

### Setting Up Connection

1. **On the Offerer page:**
   - Click "Create Offer"
   - Copy the generated offer JSON

2. **On the Answerer page:**
   - Paste the offer JSON in the text area
   - Click "Set Offer & Create Answer"
   - Copy the generated answer JSON

3. **Back on the Offerer page:**
   - Paste the answer JSON
   - Click "Set Answer"
   - Wait for connection to be established

### Once Connected

Both pages will show the communication sections where you can:

- **Send Messages**: Type in the message input and press Enter or click Send
- **Test Latency**: Click "Send Ping" to measure connection latency  
- **Transfer Files**: Select a file and click "Send File" to transfer it to the peer

## Architecture

The example uses:

- **WebRTC DataChannels** for peer-to-peer communication
- **Zod RPC** for type-safe method calls and notifications
- **Shared Services** defined in `shared.ts`:
  - `chatService`: For messaging and ping/pong
  - `fileService`: For file transfer with chunking

## Services

### Chat Service

```typescript
chatService.sendMessage(message, timestamp) → { success, messageId }
chatService.ping(timestamp) → { pong }
```

### File Service

```typescript
fileService.transfer(filename, size, chunk, chunkIndex, totalChunks) → { received, nextChunk }
```

## Network Requirements

- **STUN Server**: Uses Google's public STUN server for NAT traversal
- **Firewall**: May require firewall configuration for some network setups
- **TURN Server**: For restrictive networks, you may need to configure a TURN server

## Troubleshooting

- **Connection Issues**: Check browser console for WebRTC-related errors
- **Firewall Problems**: Try from different networks or configure port forwarding
- **HTTPS Required**: Some browsers require HTTPS for WebRTC (use `https://localhost` for testing)

## Browser Support

This example works in all modern browsers that support:
- WebRTC DataChannels
- ES2022 modules
- Modern JavaScript APIs

Tested in Chrome, Firefox, Safari, and Edge.
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'examples',
  build: {
    outDir: '../dist/examples',
    rollupOptions: {
      input: {
        websocket: resolve(__dirname, 'examples/websocket/client.html'),
        webrtc_peer1: resolve(__dirname, 'examples/webrtc/peer1.html'),
        webrtc_peer2: resolve(__dirname, 'examples/webrtc/peer2.html'),
      }
    }
  },
  server: {
    port: 3001,
    host: true
  },
  resolve: {
    alias: {
      'zod-rpc': resolve(__dirname, 'src/index.ts')
    }
  }
});
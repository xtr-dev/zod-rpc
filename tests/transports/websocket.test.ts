import { WebSocketTransport, createWebSocketTransport } from '../../src/transports/websocket';
import { TransportError } from '../../src/errors';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.CONNECTING;
  public url: string;
  public protocols?: string | string[];
  private eventListeners: { [key: string]: Function[] } = {};

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent('open', {});
    }, 10);
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(listener);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => listener(data));
    }
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Echo back the message for testing
    setTimeout(() => {
      this.dispatchEvent('message', { data });
    }, 10);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      this.dispatchEvent('close', {});
    }, 10);
  }

  // Test helper methods
  simulateError(): void {
    this.dispatchEvent('error', new Error('WebSocket error'));
  }

  simulateMessage(data: string): void {
    this.dispatchEvent('message', { data });
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent('close', {});
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocket Transport', () => {
  describe('WebSocketTransport', () => {
    let mockWebSocket: MockWebSocket;
    let transport: WebSocketTransport;

    beforeEach(() => {
      mockWebSocket = new MockWebSocket('ws://localhost:8080');
      transport = new WebSocketTransport(mockWebSocket as any);
    });

    it('should create WebSocketTransport with WebSocket', () => {
      expect(transport).toBeInstanceOf(WebSocketTransport);
    });

    describe('connect', () => {
      it('should connect successfully when WebSocket opens', async () => {
        const connectPromise = transport.connect();
        
        // WebSocket should auto-connect in mock
        await expect(connectPromise).resolves.not.toThrow();
        expect(transport.isConnected()).toBe(true);
      });

      it('should resolve immediately if already connected', async () => {
        // Wait for initial connection
        await transport.connect();
        
        // Second connection should resolve immediately
        await expect(transport.connect()).resolves.not.toThrow();
      });

      it('should reject on WebSocket error', async () => {
        const connectPromise = transport.connect();
        
        // Simulate error before connection
        mockWebSocket.readyState = MockWebSocket.CONNECTING;
        mockWebSocket.simulateError();
        
        await expect(connectPromise).rejects.toThrow(TransportError);
      });
    });

    describe('disconnect', () => {
      it('should disconnect WebSocket', async () => {
        await transport.connect();
        
        const disconnectPromise = transport.disconnect();
        mockWebSocket.simulateClose();
        
        await expect(disconnectPromise).resolves.not.toThrow();
        expect(transport.isConnected()).toBe(false);
      });

      it('should resolve immediately if already disconnected', async () => {
        await expect(transport.disconnect()).resolves.not.toThrow();
      });
    });

    describe('send', () => {
      beforeEach(async () => {
        await transport.connect();
      });

      it('should send RPC message successfully', async () => {
        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        const sendSpy = jest.spyOn(mockWebSocket, 'send');
        
        await expect(transport.send(message)).resolves.not.toThrow();
        expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
      });

      it('should throw error when not connected', async () => {
        mockWebSocket.readyState = MockWebSocket.CLOSED;
        
        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });

      it('should handle send errors', async () => {
        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        jest.spyOn(mockWebSocket, 'send').mockImplementation(() => {
          throw new Error('Send failed');
        });

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });
    });

    describe('onMessage', () => {
      it('should handle incoming messages', async () => {
        await transport.connect();
        
        const messageHandler = jest.fn();
        transport.onMessage(messageHandler);

        const message = {
          callerId: 'server',
          targetId: 'client',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { result: 'success' },
          type: 'response'
        };

        mockWebSocket.simulateMessage(JSON.stringify(message));

        expect(messageHandler).toHaveBeenCalledWith(message);
      });

      it('should handle invalid JSON messages', async () => {
        await transport.connect();
        
        const messageHandler = jest.fn();
        transport.onMessage(messageHandler);
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockWebSocket.simulateMessage('invalid json');

        expect(messageHandler).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });

    describe('isConnected', () => {
      it('should return true when connected', async () => {
        await transport.connect();
        expect(transport.isConnected()).toBe(true);
      });

      it('should return false when not connected', () => {
        mockWebSocket.readyState = MockWebSocket.CLOSED;
        expect(transport.isConnected()).toBe(false);
      });
    });

    describe('reconnection', () => {
      it('should set up reconnection logic when autoReconnect is true', () => {
        const transport = new WebSocketTransport(mockWebSocket as any, true);
        
        // Verify that the transport is created without errors
        expect(transport).toBeInstanceOf(WebSocketTransport);
        
        // Note: Full reconnection testing would require more complex mocking
        // This test verifies the basic setup
      });
    });
  });

  describe('createWebSocketTransport', () => {
    it('should create WebSocketTransport instance', () => {
      const transport = createWebSocketTransport('ws://localhost:8080');
      expect(transport).toBeInstanceOf(WebSocketTransport);
    });

    it('should create WebSocketTransport with protocols', () => {
      const transport = createWebSocketTransport('ws://localhost:8080', ['protocol1', 'protocol2']);
      expect(transport).toBeInstanceOf(WebSocketTransport);
    });

    it('should create WebSocketTransport with autoReconnect option', () => {
      const transport = createWebSocketTransport('ws://localhost:8080', undefined, false);
      expect(transport).toBeInstanceOf(WebSocketTransport);
    });
  });
});
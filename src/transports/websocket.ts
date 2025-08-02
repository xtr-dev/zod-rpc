import { Transport, RPCMessage } from '../types';
import { TransportError } from '../errors';

/**
 * WebSocket transport implementation for real-time RPC communication.
 * Supports automatic reconnection and handles connection lifecycle management.
 *
 * @example
 * ```typescript
 * // For client connections
 * const transport = createWebSocketTransport('ws://localhost:8080');
 *
 * // For server connections with existing WebSocket
 * const transport = createWebSocketTransport(ws, false); // No auto-reconnect
 * ```
 *
 * @group Transport Layer
 */
export class WebSocketTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private websocket: WebSocket,
    private autoReconnect = true,
  ) {
    if (!websocket) {
      throw new Error('WebSocket instance is required');
    }
    this.setupEventHandlers();
  }

  async send(message: RPCMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new TransportError('WebSocket is not connected');
    }

    try {
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      throw new TransportError(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  onMessage(handler: (message: RPCMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      const onOpen = (): void => {
        this.reconnectAttempts = 0;
        this.websocket.removeEventListener('open', onOpen);
        this.websocket.removeEventListener('error', onError);
        resolve();
      };

      const onError = (_event: Event): void => {
        this.websocket.removeEventListener('open', onOpen);
        this.websocket.removeEventListener('error', onError);
        reject(new TransportError('Failed to connect to WebSocket'));
      };

      this.websocket.addEventListener('open', onOpen);
      this.websocket.addEventListener('error', onError);
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve();
        return;
      }

      const onClose = (): void => {
        this.websocket.removeEventListener('close', onClose);
        resolve();
      };

      this.websocket.addEventListener('close', onClose);
      this.websocket.close();
    });
  }

  isConnected(): boolean {
    return this.websocket.readyState === WebSocket.OPEN;
  }

  private setupEventHandlers(): void {
    this.websocket.addEventListener('message', (event) => {
      try {
        const message: RPCMessage = JSON.parse(event.data);
        this.messageHandler?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.websocket.addEventListener('close', () => {
      if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(
          () => {
            this.attemptReconnect();
          },
          this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
        );
      }
    });

    this.websocket.addEventListener('error', (event) => {
      console.error('WebSocket error:', event);
    });
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    try {
      await this.connect();
    } catch (error) {
      console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
    }
  }
}

/**
 * Create a WebSocket transport for RPC communication.
 * Supports both URL strings (for clients) and existing WebSocket instances (for servers).
 *
 * @example
 * ```typescript
 * // Client usage with URL
 * const transport = createWebSocketTransport('ws://localhost:8080');
 *
 * // Server usage with existing WebSocket
 * const transport = createWebSocketTransport(ws, false);
 * ```
 *
 * @group Transport Layer
 */
export function createWebSocketTransport(
  url: string,
  protocols?: string | string[],
  autoReconnect?: boolean,
): WebSocketTransport;

// Overload for WebSocket instance
export function createWebSocketTransport(
  websocket: WebSocket,
  autoReconnect?: boolean,
): WebSocketTransport;

// Implementation
export function createWebSocketTransport(
  urlOrWebSocket: string | WebSocket,
  protocolsOrAutoReconnect?: string | string[] | boolean,
  autoReconnect = true,
): WebSocketTransport {
  if (typeof urlOrWebSocket === 'string') {
    // URL string case
    const url = urlOrWebSocket;
    const protocols =
      typeof protocolsOrAutoReconnect === 'boolean' ? undefined : protocolsOrAutoReconnect;
    const shouldAutoReconnect =
      typeof protocolsOrAutoReconnect === 'boolean' ? protocolsOrAutoReconnect : autoReconnect;

    if (!url) {
      throw new Error('WebSocket URL is required');
    }

    try {
      const websocket = new WebSocket(url, protocols);
      return new WebSocketTransport(websocket, shouldAutoReconnect);
    } catch (error) {
      throw new Error(
        `Failed to create WebSocket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  } else {
    // WebSocket instance case
    const websocket = urlOrWebSocket;
    const shouldAutoReconnect =
      typeof protocolsOrAutoReconnect === 'boolean' ? protocolsOrAutoReconnect : true;

    if (!websocket) {
      throw new Error('WebSocket instance is required');
    }

    return new WebSocketTransport(websocket, shouldAutoReconnect);
  }
}

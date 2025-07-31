import { Transport, RPCMessage } from '../types';
import { TransportError } from '../errors';

export class WebSocketTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(
    private websocket: WebSocket,
    private autoReconnect = true,
  ) {
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

export function createWebSocketTransport(
  url: string,
  protocols?: string | string[],
  autoReconnect = true,
): WebSocketTransport {
  const websocket = new WebSocket(url, protocols);
  return new WebSocketTransport(websocket, autoReconnect);
}

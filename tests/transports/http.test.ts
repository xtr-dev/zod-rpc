import { HTTPTransport, HTTPChannelServer, createHTTPTransport } from '../../src/transports/http';
import { TransportError } from '../../src/errors';

// Mock fetch for testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HTTP Transport', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('HTTPTransport', () => {
    it('should create HTTPTransport with config', () => {
      const transport = new HTTPTransport({
        baseUrl: 'http://localhost:3000'
      });

      expect(transport).toBeInstanceOf(HTTPTransport);
    });

    it('should throw error if fetch is not available', () => {
      const originalFetch = global.fetch;
      delete (global as any).fetch;

      expect(() => {
        new HTTPTransport({ baseUrl: 'http://localhost:3000' });
      }).toThrow(TransportError);

      global.fetch = originalFetch;
    });

    it('should use provided fetch implementation', () => {
      const customFetch = jest.fn();
      const transport = new HTTPTransport({
        baseUrl: 'http://localhost:3000',
        fetch: customFetch
      });

      expect(transport).toBeInstanceOf(HTTPTransport);
    });

    describe('connect', () => {
      it('should connect successfully when health check passes', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok' })
        });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await expect(transport.connect()).resolves.not.toThrow();
        expect(transport.isConnected()).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/health',
          expect.objectContaining({
            method: 'GET'
          })
        );
      });

      it('should fail to connect when health check fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Service Unavailable'
        });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await expect(transport.connect()).rejects.toThrow(TransportError);
        expect(transport.isConnected()).toBe(false);
      });

      it('should handle network errors during connect', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await expect(transport.connect()).rejects.toThrow(TransportError);
        expect(transport.isConnected()).toBe(false);
      });
    });

    describe('disconnect', () => {
      it('should disconnect transport', async () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await transport.disconnect();
        expect(transport.isConnected()).toBe(false);
      });
    });

    describe('send', () => {
      it('should send RPC message successfully', async () => {
        const responseMessage = {
          callerId: 'server',
          targetId: 'client',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { result: 'success' },
          type: 'response'
        };

        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: true,
            json: async () => responseMessage
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await transport.connect();

        const messageHandler = jest.fn();
        transport.onMessage(messageHandler);

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        await transport.send(message);

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3000/rpc',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(message)
          })
        );

        expect(messageHandler).toHaveBeenCalledWith(responseMessage);
      });

      it('should throw error when not connected', async () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

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

      it('should handle HTTP errors', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error'
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await transport.connect();

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

      it('should handle network errors during send', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockRejectedValueOnce(new Error('Network error'));

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        await transport.connect();

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

      it('should include custom headers', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({})
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
          headers: {
            'Authorization': 'Bearer token123',
            'X-Custom': 'value'
          }
        });

        await transport.connect();

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        await transport.send(message);

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3000/rpc',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer token123',
              'X-Custom': 'value'
            }
          })
        );
      });
    });

    describe('onMessage', () => {
      it('should set message handler', () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000'
        });

        const handler = jest.fn();
        expect(() => transport.onMessage(handler)).not.toThrow();
      });
    });
  });

  describe('createHTTPTransport', () => {
    it('should create HTTPTransport instance', () => {
      const transport = createHTTPTransport({
        baseUrl: 'http://localhost:3000'
      });

      expect(transport).toBeInstanceOf(HTTPTransport);
    });
  });

  describe('HTTPChannelServer', () => {
    const mockAdapter = {
      start: jest.fn(),
      stop: jest.fn(),
      onRequest: jest.fn()
    };

    beforeEach(() => {
      mockAdapter.start.mockClear();
      mockAdapter.stop.mockClear();
      mockAdapter.onRequest.mockClear();
    });

    it('should create HTTPChannelServer with adapter', () => {
      const server = new HTTPChannelServer(mockAdapter);
      expect(server).toBeInstanceOf(HTTPChannelServer);
    });

    it('should start server', async () => {
      const server = new HTTPChannelServer(mockAdapter);
      await server.start(3000);
      
      expect(mockAdapter.start).toHaveBeenCalledWith(3000);
    });

    it('should stop server', async () => {
      const server = new HTTPChannelServer(mockAdapter);
      await server.stop();
      
      expect(mockAdapter.stop).toHaveBeenCalled();
    });

    it('should register message handler', () => {
      const server = new HTTPChannelServer(mockAdapter);
      const handler = jest.fn();
      
      server.onMessage(handler);
      
      expect(mockAdapter.onRequest).toHaveBeenCalledWith('/rpc', expect.any(Function));
      expect(mockAdapter.onRequest).toHaveBeenCalledWith('/health', expect.any(Function));
    });
  });
});
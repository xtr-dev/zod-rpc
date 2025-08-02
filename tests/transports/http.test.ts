import { HTTPTransport, createHTTPTransport, zodRpc } from '../../dist/transports/http';
import { TransportError } from '../../dist/errors';

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
        baseUrl: 'http://localhost:3000',
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
        fetch: customFetch,
      });

      expect(transport).toBeInstanceOf(HTTPTransport);
    });

    describe('connect', () => {
      it('should connect successfully when health check passes', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok' }),
        });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        await expect(transport.connect()).resolves.not.toThrow();
        expect(transport.isConnected()).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3000/health',
          expect.objectContaining({
            method: 'GET',
          }),
        );
      });

      it('should fail to connect when health check fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          statusText: 'Service Unavailable',
        });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        await expect(transport.connect()).rejects.toThrow(TransportError);
        expect(transport.isConnected()).toBe(false);
      });

      it('should handle network errors during connect', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        await expect(transport.connect()).rejects.toThrow(TransportError);
        expect(transport.isConnected()).toBe(false);
      });
    });

    describe('disconnect', () => {
      it('should disconnect transport', async () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
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
          type: 'response',
        };

        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: true,
            json: async () => responseMessage,
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
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
          type: 'request' as const,
        };

        await transport.send(message);

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3000/rpc',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          }),
        );

        expect(messageHandler).toHaveBeenCalledWith(responseMessage);
      });

      it('should throw error when not connected', async () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const,
        };

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });

      it('should handle HTTP errors', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        await transport.connect();

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const,
        };

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });

      it('should handle network errors during send', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockRejectedValueOnce(new Error('Network error'));

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        await transport.connect();

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const,
        };

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });

      it('should include custom headers', async () => {
        mockFetch
          .mockResolvedValueOnce({ ok: true }) // Health check
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({}),
          });

        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
          headers: {
            Authorization: 'Bearer token123',
            'X-Custom': 'value',
          },
        });

        await transport.connect();

        const message = {
          callerId: 'client',
          targetId: 'server',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const,
        };

        await transport.send(message);

        expect(mockFetch).toHaveBeenLastCalledWith(
          'http://localhost:3000/rpc',
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer token123',
              'X-Custom': 'value',
            },
          }),
        );
      });
    });

    describe('onMessage', () => {
      it('should set message handler', () => {
        const transport = new HTTPTransport({
          baseUrl: 'http://localhost:3000',
        });

        const handler = jest.fn();
        expect(() => transport.onMessage(handler)).not.toThrow();
      });
    });
  });

  describe('createHTTPTransport', () => {
    it('should create HTTPTransport instance', () => {
      const transport = createHTTPTransport({
        baseUrl: 'http://localhost:3000',
      });

      expect(transport).toBeInstanceOf(HTTPTransport);
    });
  });

  describe('zodRpc Middleware', () => {
    it('should create zodRpc middleware function', () => {
      const mockChannel = {
        invoke: jest.fn().mockResolvedValue({ result: 'success' }),
      };

      const middleware = zodRpc(mockChannel);
      expect(typeof middleware).toBe('function');
    });

    it('should handle RPC calls through channel', async () => {
      const mockChannel = {
        invoke: jest.fn().mockResolvedValue({ result: 'success' }),
      };

      const middleware = zodRpc(mockChannel);

      const mockReq = {
        method: 'POST',
        body: {
          callerId: 'client',
          targetId: 'server',
          traceId: 'test-trace',
          methodId: 'test.method',
          payload: { data: 'test' },
          type: 'request',
        },
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockChannel.invoke).toHaveBeenCalledWith('server', 'test.method', { data: 'test' });
      expect(mockRes.json).toHaveBeenCalledWith({
        callerId: 'server',
        targetId: 'client',
        traceId: 'test-trace',
        methodId: 'test.method',
        payload: { result: 'success' },
        type: 'response',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() for non-POST requests', async () => {
      const mockChannel = {
        invoke: jest.fn(),
      };
      const middleware = zodRpc(mockChannel);

      const mockReq = { method: 'GET', body: undefined };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockChannel.invoke).not.toHaveBeenCalled();
    });

    it('should handle invalid RPC messages', async () => {
      const mockChannel = {
        invoke: jest.fn(),
      };
      const middleware = zodRpc(mockChannel);

      const mockReq = {
        method: 'POST',
        body: {
          // Missing required fields
          payload: { data: 'test' },
        },
      };

      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      const mockNext = jest.fn();

      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid RPC message',
        message: 'Missing required fields: methodId, traceId, callerId, targetId',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockChannel.invoke).not.toHaveBeenCalled();
    });
  });
});

// Test that all exports are available
import * as zodRpc from '../src/index';

describe('Index exports', () => {
  it('should export Channel', () => {
    expect(zodRpc.Channel).toBeDefined();
  });

  it('should export defineMethod', () => {
    expect(zodRpc.defineMethod).toBeDefined();
  });

  it('should export createMethodProxy', () => {
    expect(zodRpc.createMethodProxy).toBeDefined();
  });

  it('should export createTypedInvoker', () => {
    expect(zodRpc.createTypedInvoker).toBeDefined();
  });

  it('should export error classes', () => {
    expect(zodRpc.RPCError).toBeDefined();
    expect(zodRpc.ValidationError).toBeDefined();
    expect(zodRpc.TransportError).toBeDefined();
    expect(zodRpc.MethodNotFoundError).toBeDefined();
    expect(zodRpc.TimeoutError).toBeDefined();
  });

  it('should export transport classes', () => {
    expect(zodRpc.WebSocketTransport).toBeDefined();
    expect(zodRpc.WebRTCTransport).toBeDefined();
    expect(zodRpc.WebRTCPeerConnection).toBeDefined();
    expect(zodRpc.HTTPTransport).toBeDefined();
    expect(zodRpc.HTTPChannelServer).toBeDefined();
  });

  it('should export transport factory functions', () => {
    expect(zodRpc.createWebSocketTransport).toBeDefined();
    expect(zodRpc.createWebRTCTransport).toBeDefined();
    expect(zodRpc.createHTTPTransport).toBeDefined();
  });
});
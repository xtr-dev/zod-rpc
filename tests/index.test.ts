// Test that all exports are available
import * as zodRpc from '../src/index';

describe('Index exports', () => {
  it('should export simplified API functions', () => {
    expect(zodRpc.defineService).toBeDefined();
    expect(zodRpc.createRpcClient).toBeDefined();
    expect(zodRpc.createRpcServer).toBeDefined();
    expect(zodRpc.connect).toBeDefined();
    expect(zodRpc.createServer).toBeDefined();
    expect(zodRpc.RpcServer).toBeDefined();
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
    // HTTPChannelServer was removed as unused
  });

  it('should export transport factory functions', () => {
    expect(zodRpc.createWebSocketTransport).toBeDefined();
    expect(zodRpc.createWebRTCTransport).toBeDefined();
    expect(zodRpc.createHTTPTransport).toBeDefined();
  });
});

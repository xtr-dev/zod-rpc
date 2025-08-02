// Simplified API
export {
  defineService,
  type ServiceDefinition,
  type ServiceClient,
  type ServiceImplementation,
  implementService,
} from './service';
export { createRPCClient, connect, type RPCClient, type RPCClientConfig } from './client';
export { createRPCServer, createServer, RPCServer } from './server';
export { Channel } from './channel';

// Backward compatibility aliases
export {
  createRPCClient as createRpcClient,
  type RPCClient as RpcClient,
  type RPCClientConfig as RpcClientConfig,
} from './client';
export { createRPCServer as createRpcServer, RPCServer as RpcServer } from './server';

// Core types and errors
export * from './types';
export * from './errors';
export * from './transports';

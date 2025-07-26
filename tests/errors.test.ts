import {
  RPCError,
  ValidationError,
  TransportError,
  MethodNotFoundError,
  TimeoutError
} from '../src/errors';

describe('RPC Errors', () => {
  describe('RPCError', () => {
    it('should create an RPCError with correct properties', () => {
      const error = new RPCError('TEST_CODE', 'Test message', 'trace-123');
      
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.traceId).toBe('trace-123');
      expect(error.name).toBe('RPCError');
    });

    it('should create an RPCError without traceId', () => {
      const error = new RPCError('TEST_CODE', 'Test message');
      
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.traceId).toBeUndefined();
    });

    it('should serialize to JSON correctly', () => {
      const error = new RPCError('TEST_CODE', 'Test message', 'trace-123');
      const json = error.toJSON();
      
      expect(json).toEqual({
        name: 'RPCError',
        code: 'TEST_CODE',
        message: 'Test message',
        traceId: 'trace-123'
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct properties', () => {
      const error = new ValidationError('Validation failed', 'trace-123');
      
      expect(error).toBeInstanceOf(RPCError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Validation failed');
      expect(error.traceId).toBe('trace-123');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('TransportError', () => {
    it('should create a TransportError with correct properties', () => {
      const error = new TransportError('Transport failed', 'trace-123');
      
      expect(error).toBeInstanceOf(RPCError);
      expect(error.code).toBe('TRANSPORT_ERROR');
      expect(error.message).toBe('Transport failed');
      expect(error.traceId).toBe('trace-123');
      expect(error.name).toBe('TransportError');
    });
  });

  describe('MethodNotFoundError', () => {
    it('should create a MethodNotFoundError with correct properties', () => {
      const error = new MethodNotFoundError('user.get', 'trace-123');
      
      expect(error).toBeInstanceOf(RPCError);
      expect(error.code).toBe('METHOD_NOT_FOUND');
      expect(error.message).toBe("Method 'user.get' not found");
      expect(error.traceId).toBe('trace-123');
      expect(error.name).toBe('MethodNotFoundError');
    });
  });

  describe('TimeoutError', () => {
    it('should create a TimeoutError with correct properties', () => {
      const error = new TimeoutError('Request timed out', 'trace-123');
      
      expect(error).toBeInstanceOf(RPCError);
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.message).toBe('Request timed out');
      expect(error.traceId).toBe('trace-123');
      expect(error.name).toBe('TimeoutError');
    });
  });
});
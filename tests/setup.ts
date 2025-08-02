// Test setup file to suppress noisy console output during tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress specific noisy console.error messages during tests
  console.error = (message: any, ...args: any[]) => {
    // Only suppress transport-related error messages
    if (
      typeof message === 'string' &&
      (message.includes('WebSocket error:') || message.includes('WebRTC DataChannel error:'))
    ) {
      return; // Suppress these specific messages
    }
    originalConsoleError(message, ...args);
  };

  // Suppress console.log messages during tests to reduce noise
  console.log = (message: any, ...args: any[]) => {
    // Suppress server-related console.log messages during tests
    if (
      typeof message === 'string' &&
      (message.includes('🚀 RPC Server starting') ||
        message.includes('📡 Client connected') ||
        message.includes('📴 Client disconnected') ||
        message.includes('✅ Server channel connected') ||
        message.includes('📋 Available services') ||
        message.includes('🛑 Server stopped') ||
        message.includes('📦') ||
        message.startsWith('  📦') ||
        message.startsWith('    -'))
    ) {
      return; // Suppress server logging during tests
    }
    // Allow other console.log messages to pass through for debugging
    originalConsoleLog(message, ...args);
  };
});

afterAll(async () => {
  // Add a small delay to allow async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Restore original console methods
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

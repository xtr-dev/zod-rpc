// Test setup file to suppress noisy console output during tests
const originalConsoleError = console.error;

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
});

afterAll(() => {
  // Restore original console.error
  console.error = originalConsoleError;
});

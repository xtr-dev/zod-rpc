"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const dist_1 = require("../../dist");
// Define the same method schemas as the server (in a real app, these would be shared)
const getUserMethod = (0, dist_1.defineMethod)({
    id: 'user.get',
    input: zod_1.z.object({
        userId: zod_1.z.string()
    }),
    output: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string()
    }),
    handler: async () => { throw new Error('Client-side handler'); }
});
const createUserMethod = (0, dist_1.defineMethod)({
    id: 'user.create',
    input: zod_1.z.object({
        name: zod_1.z.string(),
        email: zod_1.z.string().email()
    }),
    output: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string(),
        createdAt: zod_1.z.string()
    }),
    handler: async () => { throw new Error('Client-side handler'); }
});
const calculateMethod = (0, dist_1.defineMethod)({
    id: 'math.calculate',
    input: zod_1.z.object({
        operation: zod_1.z.enum(['add', 'subtract', 'multiply', 'divide']),
        a: zod_1.z.number(),
        b: zod_1.z.number()
    }),
    output: zod_1.z.object({
        result: zod_1.z.number(),
        operation: zod_1.z.string()
    }),
    handler: async () => { throw new Error('Client-side handler'); }
});
async function runClient() {
    // Create HTTP transport
    const transport = (0, dist_1.createHTTPTransport)({
        baseUrl: 'http://localhost:3000',
        timeout: 10000
    });
    // Create channel
    const channel = new dist_1.Channel(transport, 'http-client');
    // Connect to server
    try {
        await channel.connect();
        console.log('✅ Connected to HTTP RPC server');
    }
    catch (error) {
        console.error('❌ Failed to connect to server:', error);
        return;
    }
    // Create typed invokers for type-safe method calls
    const getUser = (0, dist_1.createTypedInvoker)(getUserMethod, channel.invoke.bind(channel));
    const createUser = (0, dist_1.createTypedInvoker)(createUserMethod, channel.invoke.bind(channel));
    const calculate = (0, dist_1.createTypedInvoker)(calculateMethod, channel.invoke.bind(channel));
    try {
        console.log('\n🔍 Testing user.get method...');
        const user = await getUser({ userId: '123' });
        console.log('User:', user);
        console.log('\n👤 Testing user.create method...');
        const newUser = await createUser({
            name: 'Alice Johnson',
            email: 'alice@example.com'
        });
        console.log('Created user:', newUser);
        console.log('\n🧮 Testing math.calculate method...');
        const addition = await calculate({
            operation: 'add',
            a: 15,
            b: 27
        });
        console.log('Addition result:', addition);
        const division = await calculate({
            operation: 'divide',
            a: 100,
            b: 4
        });
        console.log('Division result:', division);
        console.log('\n❌ Testing error handling...');
        try {
            await calculate({
                operation: 'divide',
                a: 10,
                b: 0
            });
        }
        catch (error) {
            console.log('Expected error caught:', error);
        }
        console.log('\n✅ All tests completed successfully!');
    }
    catch (error) {
        console.error('❌ Error during method calls:', error);
    }
    finally {
        await channel.disconnect();
        console.log('🔌 Disconnected from server');
    }
}
// Add a simple method to test direct channel.invoke calls
async function testDirectInvoke() {
    console.log('\n🔧 Testing direct channel.invoke calls...');
    const transport = (0, dist_1.createHTTPTransport)({
        baseUrl: 'http://localhost:3000',
        timeout: 10000
    });
    const channel = new dist_1.Channel(transport, 'direct-client');
    try {
        await channel.connect();
        // Direct invoke without type checking (less safe but more flexible)
        const result = await channel.invoke('http-server', // target service ID
        'user.get', // method ID
        { userId: '456' } // input
        );
        console.log('Direct invoke result:', result);
    }
    catch (error) {
        console.error('Direct invoke error:', error);
    }
    finally {
        await channel.disconnect();
    }
}
// Check if server is running before starting client
async function checkServerHealth() {
    try {
        const response = await fetch('http://localhost:3000/health');
        return response.ok;
    }
    catch {
        return false;
    }
}
async function main() {
    console.log('🚀 Starting HTTP RPC Client Example');
    // Check if server is running
    const isServerRunning = await checkServerHealth();
    if (!isServerRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   npm run build && node dist/examples/http/server.js');
        return;
    }
    await runClient();
    await testDirectInvoke();
}
// Run the client
main().catch(console.error);
//# sourceMappingURL=client.js.map
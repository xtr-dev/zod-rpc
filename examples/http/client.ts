import { createRPCClient } from '@xtr-dev/zod-rpc';
import { userService, mathService } from './shared';

async function runHttpClient(): Promise<void> {
  console.log('🔗 Connecting to HTTP RPC server...');

  // Create client that connects to HTTP server
  const client = (await createRPCClient({
    url: 'http://localhost:' + (process.env.PORT || '3000'),
    services: {
      user: userService,
      math: mathService,
    },
    defaultTarget: 'server', // Must match the targetId used in server implementation
  })) as any;

  console.log('✅ Connected to HTTP server');

  try {
    console.log('\n📋 Testing User Operations via HTTP:');

    console.log('1️⃣ Listing users...');
    const userList = await client.user.list({ page: 1, limit: 5 });
    console.log(`   Found ${userList.total} users (showing ${userList.users.length})`);
    userList.users.forEach((user: any) => {
      console.log(`   - ${user.name} (${user.email})`);
    });

    console.log('\n2️⃣ Getting user by ID...');
    const user = await client.user.get({ userId: '1' });
    console.log(`   User details: ${user.name}, ${user.email}, age ${user.age}`);

    console.log('\n3️⃣ Creating new user...');
    const newUser = await client.user.create({
      name: 'Diana Prince',
      email: 'diana@example.com',
      age: 28,
    });
    console.log(`   Created user with ID: ${newUser.id}, success: ${newUser.success}`);

    console.log('\n4️⃣ Fetching newly created user...');
    const createdUser = await client.user.get({ userId: newUser.id });
    console.log(`   New user: ${createdUser.name} (${createdUser.email})`);

    console.log('\n🧮 Testing Math Operations via HTTP:');

    console.log('5️⃣ Adding numbers...');
    const sum = await client.math.add({ a: 15, b: 27 });
    console.log(`   15 + 27 = ${sum.result}`);

    console.log('\n6️⃣ Evaluating expression...');
    const calc = await client.math.calculate({
      expression: '(10 + 5) * 2 - 8',
      precision: 1,
    });
    console.log(`   ${calc.expression} = ${calc.result}`);

    console.log('\n7️⃣ Testing with custom timeout...');
    const quickSum = await client.math.add({ a: 1, b: 2 }, { timeout: 5000 });
    console.log(`   1 + 2 = ${quickSum.result} (with 5s timeout)`);

    console.log('\n8️⃣ Testing error handling...');
    try {
      await client.user.get({ userId: 'nonexistent' });
    } catch (error) {
      console.log(`   ❌ Expected error: ${error}`);
    }

    console.log('\n✨ All HTTP operations completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('📴 Disconnected from HTTP server');
  }
}

async function main(): Promise<void> {
  await runHttpClient();
}

if (require.main === module) {
  main().catch(console.error);
}

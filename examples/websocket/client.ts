import { createRPCClient } from '@xtr-dev/zod-rpc';
import { userService, mathService } from './shared';

async function runClient(): Promise<void> {
  console.log('🔗 Connecting to RPC server...');

  const client = (await createRPCClient({
    url: 'ws://localhost:8080',
    services: {
      user: userService,
      math: mathService,
    },
  })) as any;

  console.log('✅ Connected to server');

  try {
    console.log('\n📋 Testing User Operations:');

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

    console.log('\n🧮 Testing Math Operations:');

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
    const quickSum = await client.math.add({ a: 1, b: 2 }, { timeout: 1000 });
    console.log(`   1 + 2 = ${quickSum.result} (with 1s timeout)`);

    console.log('\n✨ All operations completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.disconnect();
    console.log('📴 Disconnected from server');
  }
}

if (require.main === module) {
  runClient().catch(console.error);
}

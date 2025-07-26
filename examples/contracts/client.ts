import { Channel, createWebSocketTransport, createTypedInvoker } from '../../src';
import { userContracts, mathContracts } from './shared';

async function runClient() {
  console.log('🔗 Connecting to contract-based RPC server...');

  const transport = createWebSocketTransport('ws://localhost:8080');
  const channel = new Channel(transport, 'client');
  
  await channel.connect();
  console.log('✅ Connected to server');

  // Create type-safe invokers from contracts
  const getUser = createTypedInvoker(userContracts.getUser, channel.invoke.bind(channel));
  const createUser = createTypedInvoker(userContracts.createUser, channel.invoke.bind(channel));
  const listUsers = createTypedInvoker(userContracts.listUsers, channel.invoke.bind(channel));
  const addNumbers = createTypedInvoker(mathContracts.add, channel.invoke.bind(channel));
  const calculate = createTypedInvoker(mathContracts.calculate, channel.invoke.bind(channel));

  try {
    console.log('\n📋 Testing User Operations:');
    
    // List existing users
    console.log('1️⃣ Listing users...');
    const userList = await listUsers('server', { page: 1, limit: 5 });
    console.log(`   Found ${userList.total} users (showing ${userList.users.length})`);
    userList.users.forEach(user => {
      console.log(`   - ${user.name} (${user.email})`);
    });

    // Get specific user
    console.log('\n2️⃣ Getting user by ID...');
    const user = await getUser('server', { userId: '1' });
    console.log(`   User details: ${user.name}, ${user.email}, age ${user.age}`);

    // Create new user
    console.log('\n3️⃣ Creating new user...');
    const newUser = await createUser('server', {
      name: 'Diana Prince',
      email: 'diana@example.com',
      age: 28
    });
    console.log(`   Created user with ID: ${newUser.id}, success: ${newUser.success}`);

    // Verify new user was created
    console.log('\n4️⃣ Fetching newly created user...');
    const createdUser = await getUser('server', { userId: newUser.id });
    console.log(`   New user: ${createdUser.name} (${createdUser.email})`);

    console.log('\n🧮 Testing Math Operations:');
    
    // Simple addition
    console.log('5️⃣ Adding numbers...');
    const sum = await addNumbers('server', { a: 15, b: 27 });
    console.log(`   15 + 27 = ${sum.result}`);

    // Complex calculation
    console.log('\n6️⃣ Evaluating expression...');
    const calc = await calculate('server', { 
      expression: '(10 + 5) * 2 - 8', 
      precision: 1 
    });
    console.log(`   ${calc.expression} = ${calc.result}`);

    console.log('\n✨ All operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await channel.disconnect();
    console.log('📴 Disconnected from server');
  }
}

if (require.main === module) {
  runClient().catch(console.error);
}
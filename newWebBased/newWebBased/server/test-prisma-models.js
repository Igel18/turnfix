const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('Available Prisma models:');
console.log(Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$')));

// Test accessing one of the models directly
console.log('\nTesting tfx_sport model access...');
console.log('tfx_sport exists?', 'tfx_sport' in prisma);

// Try to list available methods on the client
const methods = Object.getOwnPropertyNames(prisma);
console.log('\nPrisma client methods/properties:');
console.log(methods.filter(m => m.startsWith('tfx')).slice(0, 10));

process.exit(0);

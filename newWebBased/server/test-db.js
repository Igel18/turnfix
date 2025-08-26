const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Simple connectivity test
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test querying data
    const clubCount = await prisma.club.count();
    console.log(`📊 Total clubs in database: ${clubCount}`);
    
    const eventCount = await prisma.competition.count();
    console.log(`📊 Total competitions in database: ${eventCount}`);
    
    // List first few clubs
    const clubs = await prisma.club.findMany({ take: 3 });
    console.log('📋 First 3 clubs:', clubs);
    
    await prisma.$disconnect();
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
  } finally {
    process.exit(0);
  }
}

testConnection();

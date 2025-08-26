import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    ` as Array<{table_name: string}>;
    
    console.log('📋 Tables in database:');
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    return tables;
  } catch (error) {
    console.error('❌ Error listing tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTables();

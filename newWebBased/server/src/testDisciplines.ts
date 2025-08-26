import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDisciplines() {
  try {
    console.log('Testing disciplines table...');
    
    const result = await prisma.$queryRawUnsafe('SELECT * FROM tfx_disziplinen LIMIT 5');
    console.log('Sample disciplines:', JSON.stringify(result, null, 2));
    
    const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) as total FROM tfx_disziplinen');
    console.log('Total disciplines:', count);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDisciplines();

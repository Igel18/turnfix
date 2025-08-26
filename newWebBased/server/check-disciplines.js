const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDisciplines() {
  try {
    console.log('Checking tfx_disziplinen table structure...');
    
    const result = await prisma.$queryRaw`SELECT * FROM tfx_disziplinen LIMIT 3`;
    
    if (result.length > 0) {
      console.log('Available columns:', Object.keys(result[0]));
      console.log('\nSample records:');
      result.forEach((record, index) => {
        console.log(`${index + 1}. ${record.var_name} (${record.var_kurz1}, ${record.var_kurz2})`);
      });
    } else {
      console.log('No records found in tfx_disziplinen');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDisciplines();

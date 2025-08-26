const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompetitionDisciplinesTable() {
  try {
    console.log('Checking tfx_wettkaempfe_x_disziplinen table structure...');
    
    const result = await prisma.$queryRaw`SELECT * FROM tfx_wettkaempfe_x_disziplinen LIMIT 1`;
    
    if (result[0]) {
      console.log('Available columns:', Object.keys(result[0]));
      console.log('Sample record:', result[0]);
    } else {
      console.log('No records found in tfx_wettkaempfe_x_disziplinen');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompetitionDisciplinesTable();

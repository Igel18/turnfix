// Simple test to check if competition number is saved
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCompetitionNumber() {
  try {
    console.log('🔍 Checking competition number in database...');
    
    // Get competition 837 directly from database
    const competition = await prisma.$queryRaw`
      SELECT int_wettkaempfeid, var_nummer, var_name 
      FROM tfx_wettkaempfe 
      WHERE int_wettkaempfeid = 837
    `;
    
    if (competition.length > 0) {
      const comp = competition[0];
      console.log(`Competition ID: ${comp.int_wettkaempfeid}`);
      console.log(`Name: ${comp.var_name}`);
      console.log(`Number (var_nummer): "${comp.var_nummer || '(null/empty)'}"`);
      
      if (comp.var_nummer === '0815') {
        console.log('✅ SUCCESS: Number "0815" is saved in database!');
      } else {
        console.log(`❌ ISSUE: Expected "0815", but found "${comp.var_nummer}"`);
      }
    } else {
      console.log('❌ Competition 837 not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompetitionNumber();

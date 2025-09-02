// Check existing competition numbers from imports
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExistingNumbers() {
  try {
    console.log('🔍 Checking existing competition numbers in database...');
    
    // Get all competitions with numbers
    const competitionsWithNumbers = await prisma.$queryRaw`
      SELECT int_wettkaempfeid, var_nummer, var_name, int_veranstaltungenid
      FROM tfx_wettkaempfe 
      WHERE var_nummer IS NOT NULL AND var_nummer != ''
      ORDER BY int_veranstaltungenid DESC, int_wettkaempfeid DESC
      LIMIT 20
    `;
    
    if (competitionsWithNumbers.length > 0) {
      console.log(`✅ Found ${competitionsWithNumbers.length} competitions with numbers:`);
      competitionsWithNumbers.forEach((comp, index) => {
        console.log(`  ${index + 1}. Event ${comp.int_veranstaltungenid} - "${comp.var_name}"`);
        console.log(`     Number: "${comp.var_nummer}" (ID: ${comp.int_wettkaempfeid})`);
        console.log('');
      });
    } else {
      console.log('❌ No competitions with numbers found');
    }
    
    // Get total count
    const totalWithNumbers = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM tfx_wettkaempfe 
      WHERE var_nummer IS NOT NULL AND var_nummer != ''
    `;
    
    console.log(`📊 Total competitions with numbers: ${totalWithNumbers[0].count}`);
    
    // Get total competitions
    const totalCompetitions = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM tfx_wettkaempfe
    `;
    
    console.log(`📊 Total competitions: ${totalCompetitions[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingNumbers();

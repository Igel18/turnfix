const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumnInfo() {
  try {
    console.log('🔍 Checking var_nummer column constraints...');
    
    const columnInfo = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'tfx_wettkaempfe' 
      AND column_name = 'var_nummer'
    `;
    
    console.log('Column info:', columnInfo);
    
    // Also test with a shorter value
    console.log('\n🧪 Testing with short value...');
    
    const testCompetition = await prisma.tfx_wettkaempfe.findFirst({
      where: { 
        int_veranstaltungenid: 87,
        var_nummer: '0113'
      }
    });
    
    if (testCompetition) {
      console.log(`Found competition ID ${testCompetition.int_wettkaempfeid} with number ${testCompetition.var_nummer}`);
      
      // Test with a 4-character value (same length as current)
      const originalNumber = testCompetition.var_nummer;
      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid },
        data: { var_nummer: '9999' }
      });
      
      const afterUpdate = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid }
      });
      
      console.log(`Updated to: ${afterUpdate.var_nummer}`);
      
      // Restore original
      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid },
        data: { var_nummer: originalNumber }
      });
      
      console.log(`Restored to: ${originalNumber}`);
      console.log('✅ Short value update works');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumnInfo();

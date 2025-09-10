const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDirectAssignment() {
  try {
    console.log('🧪 Testing direct database assignment...');
    
    // First check current state
    console.log('1️⃣ Checking current state of participant 808...');
    const before = await prisma.$queryRawUnsafe(`
      SELECT w.int_teilnehmerid, w.var_riege, wk.var_name
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 808 AND wk.int_veranstaltungenid = 9025
      LIMIT 3
    `);
    console.log('Before assignment:', before);
    
    // Assign to squad
    console.log('2️⃣ Assigning participant 808 to squad "S1" (short name)...');
    const updateResult = await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = 'S1'
      WHERE int_teilnehmerid = 808 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = 9025
        )
    `);
    console.log('Update result:', updateResult);
    
    // Check after assignment
    console.log('3️⃣ Checking state after assignment...');
    const after = await prisma.$queryRawUnsafe(`
      SELECT w.int_teilnehmerid, w.var_riege, wk.var_name
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 808 AND wk.int_veranstaltungenid = 9025
      LIMIT 3
    `);
    console.log('After assignment:', after);
    
    // Query for squads using the same logic as the API
    console.log('4️⃣ Querying for squads using API logic...');
    const squadQuery = `
      SELECT DISTINCT w.var_riege, COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 9025 AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
    `;
    const squads = await prisma.$queryRawUnsafe(squadQuery);
    console.log('Found squads:', squads);
    
    // Clean up - reset participant to unassigned
    console.log('5️⃣ Cleaning up - resetting participant to unassigned...');
    await prisma.$queryRawUnsafe(`
      UPDATE tfx_wertungen 
      SET var_riege = ''
      WHERE int_teilnehmerid = 808 
        AND int_wettkaempfeid IN (
          SELECT int_wettkaempfeid 
          FROM tfx_wettkaempfe 
          WHERE int_veranstaltungenid = 9025
        )
    `);
    console.log('✅ Test completed and cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectAssignment();

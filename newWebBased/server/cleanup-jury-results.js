// Cleanup script to remove jury results with wrong wertungenId
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    console.log('🧹 Cleaning up jury results with participantId instead of wertungenId...');
    
    // Delete entries where wertungenId = 100 (this is the participantId, not the real wertungenId)
    const result = await prisma.$executeRaw`
      DELETE FROM tfx_jury_results 
      WHERE int_wertungenid = 100
    `;
    
    console.log(`✅ Deleted ${result} incorrect jury result entries`);
    
    // Also show what's left
    const remaining = await prisma.$queryRaw`
      SELECT jr.*, df.var_name 
      FROM tfx_jury_results jr
      LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
      WHERE jr.int_wertungenid IN (100, 116)
      ORDER BY jr.int_wertungenid, df.int_sortierung
    `;
    
    console.log('\n📊 Remaining jury results for wertungenId 100 and 116:');
    console.table(remaining);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

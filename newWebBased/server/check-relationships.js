const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRelationshipTables() {
  try {
    console.log('🔍 Checking relationship tables for CompetitionEntry mapping...\n');
    
    await prisma.$connect();
    
    // Check likely tables for competition entries/registrations
    const relationshipTables = [
      'tfx_gruppen_x_teilnehmer',
      'tfx_man_x_teilnehmer', 
      'tfx_wettkaempfe_x_disziplinen',
      'tfx_mannschaften'
    ];
    
    for (const tableName of relationshipTables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}" LIMIT 1`);
        const count = parseInt(result[0].count);
        console.log(`✅ ${tableName}: ${count} records`);
        
        // Get a sample record to understand structure
        if (count > 0) {
          const sample = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 1`);
          console.log(`   Sample record:`, sample[0]);
        }
        console.log();
      } catch (error) {
        console.log(`❌ ${tableName}: Error - ${error.message}\n`);
      }
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRelationshipTables();

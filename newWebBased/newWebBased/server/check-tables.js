const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...\n');
    
    const tables = [
      { model: 'User', table: 'users' },
      { model: 'RefreshToken', table: 'refresh_tokens' },
      { model: 'Club', table: 'tfx_vereine' },
      { model: 'Participant', table: 'participants' },
      { model: 'Competition', table: 'competitions' },
      { model: 'Discipline', table: 'disciplines' },
      { model: 'CompetitionEntry', table: 'competition_entries' },
      { model: 'Result', table: 'results' },
      { model: 'AuditLog', table: 'audit_logs' }
    ];

    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    const existingTables = [];
    const missingTables = [];

    for (const { model, table } of tables) {
      try {
        // Try to query the table to see if it exists
        const query = `SELECT COUNT(*) as count FROM "${table}" LIMIT 1`;
        const result = await prisma.$queryRawUnsafe(query);
        const count = parseInt(result[0].count);
        console.log(`✅ ${model} (${table}): Found - ${count} records`);
        existingTables.push({ model, table, count });
      } catch (error) {
        console.log(`❌ ${model} (${table}): Not found - ${error.code || error.message}`);
        missingTables.push({ model, table, error: error.code || error.message });
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`✅ Existing tables: ${existingTables.length}`);
    console.log(`❌ Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n🚨 Missing tables that need to be created or mapped:');
      missingTables.forEach(({ model, table, error }) => {
        console.log(`   - ${model} (expected: ${table}) - Error: ${error}`);
      });
    }

    if (existingTables.length > 0) {
      console.log('\n✅ Working tables:');
      existingTables.forEach(({ model, table, count }) => {
        console.log(`   - ${model} -> ${table} (${count} records)`);
      });
    }

    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();

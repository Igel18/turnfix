const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAllTables() {
  try {
    console.log('🔍 Listing all existing tables in the database...\n');
    
    await prisma.$connect();
    
    // Query to get all table names from the database
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    console.log('📋 Existing tables in the database:');
    result.forEach((row, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${row.table_name}`);
    });
    
    console.log(`\n📊 Total tables found: ${result.length}`);
    
    // Let's also check for tables that might be related to our models
    console.log('\n🔍 Looking for potential legacy table mappings:');
    const legacyMappings = [
      { model: 'User', patterns: ['user', 'benutzer', 'person'] },
      { model: 'Participant', patterns: ['participant', 'turner', 'athlete', 'teilnehmer'] },
      { model: 'Competition', patterns: ['competition', 'wettkampf', 'event', 'veranstaltung'] },
      { model: 'Result', patterns: ['result', 'ergebnis', 'score', 'wertung'] },
      { model: 'Discipline', patterns: ['discipline', 'disziplin', 'gerat'] }
    ];
    
    legacyMappings.forEach(({ model, patterns }) => {
      const matches = result.filter(row => 
        patterns.some(pattern => row.table_name.toLowerCase().includes(pattern))
      );
      if (matches.length > 0) {
        console.log(`${model}:`);
        matches.forEach(match => console.log(`  - ${match.table_name}`));
      }
    });
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

listAllTables();

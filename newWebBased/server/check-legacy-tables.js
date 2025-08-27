const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkLegacyTables() {
    try {
        console.log('Checking for legacy tables...');
        
        // Check for legacy German table names
        const legacyTableNames = [
            'tfx_disziplinen',
            'tfx_gaue', 
            'tfx_verbaende',
            'tfx_veranstaltungen',
            'tfx_teilnehmer',
            'tfx_vereine',
            'tfx_bereiche',
            'tfx_sport'
        ];
        
        for (const tableName of legacyTableNames) {
            try {
                const count = await prisma.$queryRaw`
                    SELECT COUNT(*) as count 
                    FROM information_schema.tables 
                    WHERE table_name = ${tableName} 
                    AND table_schema = 'public'
                `;
                
                if (count[0].count > 0) {
                    console.log(`✅ Found table: ${tableName}`);
                    
                    // Get sample data count
                    const dataCount = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${tableName}`);
                    console.log(`   Records: ${dataCount[0].count}`);
                    
                    // Show first few records
                    const samples = await prisma.$queryRawUnsafe(`SELECT * FROM ${tableName} LIMIT 3`);
                    console.log(`   Sample data:`, samples);
                } else {
                    console.log(`❌ Table not found: ${tableName}`);
                }
            } catch (error) {
                console.log(`❌ Error checking ${tableName}:`, error.message);
            }
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkLegacyTables();

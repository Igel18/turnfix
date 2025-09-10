const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllTables() {
    try {
        console.log('=== CHECKING ALL TABLES ===');
        
        // Get all tables in database
        const allTables = await prisma.$queryRaw`
            SELECT table_name, table_schema
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        `;
        
        console.log('\n📋 All tables in database:');
        for (const table of allTables) {
            console.log(`  ${table.table_schema}.${table.table_name}`);
            
            // Get record count for each table
            try {
                const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.table_schema}"."${table.table_name}"`);
                console.log(`    Records: ${count[0].count}`);
                
                // Show sample data if there are records
                if (count[0].count > 0) {
                    const sample = await prisma.$queryRawUnsafe(`SELECT * FROM "${table.table_schema}"."${table.table_name}" LIMIT 2`);
                    console.log(`    Sample:`, sample);
                }
            } catch (error) {
                console.log(`    Error getting count: ${error.message}`);
            }
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkAllTables();

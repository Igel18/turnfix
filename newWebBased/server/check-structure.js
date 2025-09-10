const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTableStructure() {
    try {
        console.log('Checking table structure...');
        
        // Get all tables
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `;
        
        console.log('\n📋 Available tables:');
        for (const table of tables) {
            console.log(`\n🔍 Table: ${table.table_name}`);
            
            // Get columns for each table
            const columns = await prisma.$queryRaw`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = ${table.table_name}
                AND table_schema = 'public'
                ORDER BY ordinal_position
            `;
            
            columns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
            });
        }
        
        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkTableStructure();

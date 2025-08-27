const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvents() {
    try {
        console.log('🔍 Checking events table structure...');
        
        // Check if table exists and get some sample data
        const events = await prisma.$queryRaw`
            SELECT * FROM tfx_veranstaltungen 
            LIMIT 5
        `;
        
        console.log('📋 Sample events:');
        console.log(JSON.stringify(events, null, 2));
        
        if (events.length > 0) {
            console.log('🔑 Available fields:');
            console.log(Object.keys(events[0]));
        }
        
        // Also get count
        const count = await prisma.$queryRaw`
            SELECT COUNT(*) as total FROM tfx_veranstaltungen
        `;
        console.log('📊 Total events:', count[0].total);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkEvents();

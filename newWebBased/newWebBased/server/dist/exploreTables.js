"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function exploreTables() {
    try {
        // Try to find table names in different ways
        console.log('=== Exploring Database Tables ===');
        // Check if tfx_bereiche exists
        try {
            const bereiche = await prisma.$queryRawUnsafe('SELECT * FROM tfx_bereiche LIMIT 5');
            console.log('tfx_bereiche sample:', JSON.stringify(bereiche, null, 2));
        }
        catch (error) {
            console.log('tfx_bereiche does not exist or is empty');
        }
        // Check for sports table
        try {
            const sports = await prisma.$queryRawUnsafe('SELECT * FROM tfx_sports LIMIT 5');
            console.log('tfx_sports sample:', JSON.stringify(sports, null, 2));
        }
        catch (error) {
            console.log('tfx_sports table not found');
        }
        // Get unique apparatus/equipment from disciplines
        try {
            const apparatus = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT var_einheit as apparatus, COUNT(*) as count 
        FROM tfx_disziplinen 
        WHERE var_einheit IS NOT NULL 
        GROUP BY var_einheit 
        ORDER BY var_einheit
      `);
            console.log('Unique apparatus from disciplines:', JSON.stringify(apparatus, null, 2));
        }
        catch (error) {
            console.log('Error getting apparatus:', error.message);
        }
        // Check for participants table to understand age structure
        try {
            const participants = await prisma.$queryRawUnsafe('SELECT * FROM tfx_personen LIMIT 3');
            console.log('tfx_personen sample:', JSON.stringify(participants, null, 2));
        }
        catch (error) {
            console.log('tfx_personen table not found, trying other names...');
            try {
                const participants2 = await prisma.$queryRawUnsafe('SELECT * FROM tfx_teilnehmer LIMIT 3');
                console.log('tfx_teilnehmer sample:', JSON.stringify(participants2, null, 2));
            }
            catch (error2) {
                console.log('No participants table found with tfx_teilnehmer');
            }
        }
        // Now examine disciplines in detail
        try {
            console.log('\n=== DISCIPLINES DETAILED ANALYSIS ===');
            // First, let's see what columns exist
            const disciplinesSchema = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'tfx_disziplinen'
        ORDER BY ordinal_position
      `);
            console.log('tfx_disziplinen columns:', JSON.stringify(disciplinesSchema, null, 2));
            // Get a sample of disciplines with all available columns
            const disciplinesSample = await prisma.$queryRawUnsafe(`
        SELECT * FROM tfx_disziplinen 
        ORDER BY var_name
        LIMIT 5
      `);
            console.log('Disciplines sample (all columns):', JSON.stringify(disciplinesSample, null, 2));
        }
        catch (error) {
            console.log('Error in detailed disciplines analysis:', error.message);
        }
    }
    catch (error) {
        console.error('Error exploring tables:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
exploreTables();
//# sourceMappingURL=exploreTables.js.map
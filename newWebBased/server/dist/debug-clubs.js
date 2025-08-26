"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkClubsTable() {
    try {
        console.log('Checking tfx_vereine table structure...');
        const columns = await prisma.$queryRaw `
      SELECT column_name, data_type, is_nullable, column_default, ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'tfx_vereine' 
      ORDER BY ordinal_position;
    `;
        console.log('\nTable structure:');
        console.log(JSON.stringify(columns, null, 2));
        const sampleData = await prisma.$queryRaw `SELECT * FROM tfx_vereine LIMIT 3`;
        console.log('\nSample data:');
        console.log(JSON.stringify(sampleData, null, 2));
        // Check regions table too
        const regions = await prisma.$queryRaw `SELECT * FROM tfx_gaue LIMIT 5`;
        console.log('\nRegions (tfx_gaue):');
        console.log(JSON.stringify(regions, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkClubsTable();
//# sourceMappingURL=debug-clubs.js.map
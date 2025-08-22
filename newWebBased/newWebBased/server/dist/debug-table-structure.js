"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkTableStructure() {
    try {
        console.log('Checking database structure...');
        // Check countries
        const countries = await prisma.$queryRaw `
      SELECT * FROM tfx_laender ORDER BY int_laenderid;
    `;
        console.log('\nCountries:');
        console.log(JSON.stringify(countries, null, 2));
        // Check existing associations
        const associations = await prisma.$queryRaw `
      SELECT * FROM tfx_verbaende LIMIT 5;
    `;
        console.log('\nExisting associations:');
        console.log(JSON.stringify(associations, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkTableStructure();
//# sourceMappingURL=debug-table-structure.js.map
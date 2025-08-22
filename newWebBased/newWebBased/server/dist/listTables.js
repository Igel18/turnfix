"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function listTables() {
    try {
        const tables = await prisma.$queryRaw `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
        console.log('📋 Tables in database:');
        tables.forEach(table => {
            console.log(`   - ${table.table_name}`);
        });
        return tables;
    }
    catch (error) {
        console.error('❌ Error listing tables:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
listTables();
//# sourceMappingURL=listTables.js.map
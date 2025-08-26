"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function checkTableStructure() {
    try {
        console.log('🔍 Checking tfx_vereine table structure:');
        const columns = await prisma.$queryRaw `
      SELECT column_name, is_nullable, column_default, data_type
      FROM information_schema.columns 
      WHERE table_name = 'tfx_vereine' 
      ORDER BY ordinal_position
    `;
        columns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : 'optional'} ${col.column_default ? `[default: ${col.column_default}]` : ''}`);
        });
        console.log('\n🔍 Checking tfx_gaue table structure:');
        const gaueColumns = await prisma.$queryRaw `
      SELECT column_name, is_nullable, column_default, data_type
      FROM information_schema.columns 
      WHERE table_name = 'tfx_gaue' 
      ORDER BY ordinal_position
    `;
        gaueColumns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '* REQUIRED' : 'optional'} ${col.column_default ? `[default: ${col.column_default}]` : ''}`);
        });
    }
    catch (error) {
        console.error('❌ Error checking table structure:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
checkTableStructure();
//# sourceMappingURL=checkTables.js.map
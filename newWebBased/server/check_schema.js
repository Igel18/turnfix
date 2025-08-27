const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('=== tfx_wertungen columns ===');
    const wertungen = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tfx_wertungen' ORDER BY ordinal_position;`);
    console.log(wertungen);
    
    console.log('\n=== tfx_wertungen_details columns ===');
    const details = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tfx_wertungen_details' ORDER BY ordinal_position;`);
    console.log(details);
    
    console.log('\n=== tfx_wertungen_x_disziplinen columns ===');
    const xdisz = await prisma.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tfx_wertungen_x_disziplinen' ORDER BY ordinal_position;`);
    console.log(xdisz);
    
    console.log('\n=== Sample data from tfx_wertungen (first 2 rows) ===');
    const sampleWertungen = await prisma.$queryRawUnsafe('SELECT * FROM tfx_wertungen LIMIT 2;');
    console.log(sampleWertungen);
    
    console.log('\n=== Sample data from tfx_wertungen_details (first 2 rows) ===');
    const sampleDetails = await prisma.$queryRawUnsafe('SELECT * FROM tfx_wertungen_details LIMIT 2;');
    console.log(sampleDetails);
    
    console.log('\n=== Sample data from tfx_wertungen_x_disziplinen (first 2 rows) ===');
    const sampleXDisz = await prisma.$queryRawUnsafe('SELECT * FROM tfx_wertungen_x_disziplinen LIMIT 2;');
    console.log(sampleXDisz);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

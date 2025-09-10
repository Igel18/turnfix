const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRelationships() {
  try {
    console.log('=== Check sample relationships ===');
    const sample = await prisma.$queryRawUnsafe(`
      SELECT 
        w.int_wertungenid,
        w.int_wettkaempfeid,
        w.int_teilnehmerid,
        wd.int_disziplinenid as detail_discipline,
        xd.int_disziplinenid as junction_discipline,
        wd.rel_leistung
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wertungen_x_disziplinen xd ON w.int_wertungenid = xd.int_wertungenid
      WHERE w.int_wertungenid IN (SELECT int_wertungenid FROM tfx_wertungen_details LIMIT 3)
      ORDER BY w.int_wertungenid, wd.int_disziplinenid
      LIMIT 10
    `);
    console.log(sample);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRelationships();

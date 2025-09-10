console.log('Testing wertungenId lookup for participant 1175 in event 50...');

const query = `
  SELECT w.int_wertungenid, w.int_teilnehmerid, w.int_wettkaempfeid, wk.int_veranstaltungenid
  FROM tfx_wertungen w
  INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
  WHERE w.int_teilnehmerid = 1175
  AND wk.int_veranstaltungenid = 50
  ORDER BY w.int_wertungenid DESC
`;

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRawUnsafe(query);
    console.log('Query result:', result);
    
    // Also show what happens without event filter
    const queryAll = `
      SELECT w.int_wertungenid, w.int_teilnehmerid, w.int_wettkaempfeid, wk.int_veranstaltungenid
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 1175
      ORDER BY w.int_wertungenid DESC
    `;
    
    const resultAll = await prisma.$queryRawUnsafe(queryAll);
    console.log('All wertungen for participant 1175:', resultAll);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();

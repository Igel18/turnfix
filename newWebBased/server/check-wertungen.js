const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wertungen = await prisma.$queryRaw`
    SELECT w.int_wertungenid, w.int_teilnehmerid, w.int_wettkaempfeid, wk.var_name
    FROM tfx_wertungen w
    INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    WHERE w.int_teilnehmerid = 1175 AND wk.int_veranstaltungenid = 50
  `;
  console.log(JSON.stringify(wertungen, null, 2));
}

main().catch(console.error).finally(() => process.exit());

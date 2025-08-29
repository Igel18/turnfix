const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getTotalScores() {
  try {
    const totalResult = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM tfx_wertungen w LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid WHERE wk.int_veranstaltungenid = $1',
      49
    );
    
    console.log('Total scores for event 49:', totalResult[0].count);
    
    // Now check where Michael Blüm's scores would appear in the ordered list
    const orderedQuery = `
      SELECT 
        w.int_wertungenid as id,
        w.int_teilnehmerid as participantId,
        wd.int_disziplinenid as disciplineId,
        wd.rel_leistung as score,
        t.var_vorname,
        t.var_nachname,
        d.var_name as discipline_name,
        ROW_NUMBER() OVER (ORDER BY w.int_wettkaempfeid, wd.int_disziplinenid, w.int_teilnehmerid) as row_num
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid  
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.int_teilnehmerid = $2
      ORDER BY w.int_wettkaempfeid, wd.int_disziplinenid, w.int_teilnehmerid
    `;
    
    const michaelResults = await prisma.$queryRawUnsafe(orderedQuery, 49, 1535);
    console.log('Michael Blüm scores positions:');
    michaelResults.forEach(result => {
      console.log(`  Row ${result.row_num}: ${result.discipline_name} = ${result.score}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTotalScores();

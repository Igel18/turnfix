const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMichaelBlumScore() {
  try {
    console.log('Checking score for Michael Blüm (ID 1535) for Boden discipline...\n');
    
    // Check Michael Blüm's details
    const participant = await prisma.$queryRaw`
      SELECT 
        t.int_teilnehmerid as id,
        t.var_vorname as firstName,
        t.var_nachname as lastName,
        w.var_riege as squadName
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE t.int_teilnehmerid = 1535 AND wk.int_veranstaltungenid = 49
      LIMIT 1
    `;

    if (participant.length > 0) {
      console.log(`Participant: ${participant[0].firstname} ${participant[0].lastname}, Squad: ${participant[0].squadname}`);
    } else {
      console.log('Participant 1535 not found in event 49');
      return;
    }

    // Check scores for Michael Blüm using the same query structure as the scores API
    const scores = await prisma.$queryRaw`
      SELECT DISTINCT
        w.int_teilnehmerid as participantId,
        wxd.int_disziplinid as disciplineId,
        wd.dec_wert as score,
        d.var_name as disciplineName
      FROM tfx_wertungen w
      INNER JOIN tfx_wertungen_details wd ON w.int_wertungid = wd.int_wertungid
      INNER JOIN tfx_wertungen_x_disziplinen wxd ON w.int_wertungid = wxd.int_wertungid
      INNER JOIN tfx_disziplinen d ON wxd.int_disziplinid = d.int_disziplinid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 1535 AND wk.int_veranstaltungenid = 49
      ORDER BY wxd.int_disziplinid
    `;

    console.log(`\nFound ${scores.length} scores for Michael Blüm:`);
    scores.forEach(score => {
      console.log(`  Discipline ${score.disciplineid} (${score.disciplinename}): ${score.score}`);
    });

    // Check specifically for Boden (discipline 74)
    const bodenScore = scores.find(s => s.disciplineid === 74);
    if (bodenScore) {
      console.log(`\n✓ Boden score found: ${bodenScore.score}`);
    } else {
      console.log(`\n✗ No Boden (discipline 74) score found`);
      console.log('Available disciplines:');
      scores.forEach(score => {
        console.log(`  - Discipline ${score.disciplineid}: ${score.disciplinename}`);
      });
    }

    // Check what discipline "Boden" actually is
    const bodenDiscipline = await prisma.$queryRaw`
      SELECT int_disziplinid as id, var_name as name
      FROM tfx_disziplinen 
      WHERE LOWER(var_name) LIKE '%boden%'
    `;

    console.log(`\nSearching for "Boden" disciplines:`);
    bodenDiscipline.forEach(d => {
      console.log(`  Discipline ${d.id}: ${d.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMichaelBlumScore();

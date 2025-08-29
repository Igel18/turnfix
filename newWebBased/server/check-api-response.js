const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAPIResponse() {
  try {
    console.log('Simulating the API query for eventId=49...');
    
    // This mimics the exact query from scores.ts
    const scoresQuery = `
      SELECT 
        w.int_wertungenid as id,
        w.int_teilnehmerid as participantId,
        wd.int_disziplinenid as disciplineId,
        w.int_wettkaempfeid as competitionId,
        wd.rel_leistung as score,
        wd.int_versuch as attempt,
        w.var_comment as notes,
        CASE 
          WHEN wd.rel_leistung IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as status,
        t.var_vorname,
        t.var_nachname,
        d.var_name as discipline_name,
        wk.var_name as competition_name
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON wd.int_disziplinenid = d.int_disziplinenid  
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
      ORDER BY w.int_wettkaempfeid, wd.int_disziplinenid, w.int_teilnehmerid
      LIMIT $2 OFFSET $3
    `;
    
    const results = await prisma.$queryRawUnsafe(scoresQuery, 49, 100, 0);
    
    console.log(`API would return ${results.length} results`);
    
    // Look specifically for Michael Blüm's scores
    const michaelScores = results.filter(r => 
      r.var_vorname === 'Michael' && r.var_nachname === 'Blüm'
    );
    
    console.log(`\nMichael Blüm's scores from API query:`);
    michaelScores.forEach(score => {
      console.log(`  - ID: ${score.id}, ParticipantID: ${score.participantid}, DisciplineID: ${score.disciplineid}, Score: ${score.score}, Discipline: ${score.discipline_name}`);
    });
    
    // Check specifically for Boden scores
    const bodenScores = results.filter(r => r.discipline_name === 'Boden');
    console.log(`\nAll Boden scores (first 10):`);
    bodenScores.slice(0, 10).forEach(score => {
      console.log(`  - ParticipantID: ${score.participantid}, Score: ${score.score}, Name: ${score.var_vorname} ${score.var_nachname}`);
    });

    // Check for participant ID 1535 specifically
    const participant1535Scores = results.filter(r => r.participantid === 1535);
    console.log(`\nParticipant 1535 scores:`);
    participant1535Scores.forEach(score => {
      console.log(`  - DisciplineID: ${score.disciplineid}, Score: ${score.score}, Discipline: ${score.discipline_name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAPIResponse();

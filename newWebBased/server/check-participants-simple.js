// Simple check for participants in event 50
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParticipantsSimple() {
  try {
    console.log('=== Checking participants in event 50 ===');
    
    // Find participants in event 50 with simpler query
    const participants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT 
        t.int_teilnehmerid as participantId,
        t.var_vorname || ' ' || t.var_nachname as name,
        t.var_nachname,
        t.var_vorname,
        w.int_wertungenid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid  
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 50
      ORDER BY t.var_nachname, t.var_vorname
    `);
    
    console.log(`Found ${participants.length} participants in event 50:`);
    
    // Look for specific participants and check their scores
    for (const participant of participants) {
      console.log(`\n--- ${participant.name} (ID: ${participant.participantId}, wertungenId: ${participant.int_wertungenid}) ---`);
      
      // Check for any scores for this participant
      const scores = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as score_count
        FROM tfx_jury_results jr
        WHERE jr.int_wertungenid = $1
      `, participant.int_wertungenid);
      
      console.log(`  Scores: ${scores[0].score_count}`);
      
      if (participant.name.includes('Albrecht') || participant.name.includes('Merkl') || participant.name.includes('Münsch')) {
        console.log(`  ⭐ This is one of the participants shown in the jury portal!`);
        
        // Get detailed scores
        const detailScores = await prisma.$queryRawUnsafe(`
          SELECT jr.*, df.var_disziplinenfeldbez as field_name
          FROM tfx_jury_results jr
          INNER JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
          WHERE jr.int_wertungenid = $1
          ORDER BY jr.int_disziplinen_felderid, jr.int_versuch
        `, participant.int_wertungenid);
        
        if (detailScores.length > 0) {
          console.log(`  📊 Detailed scores:`);
          detailScores.forEach(score => {
            console.log(`    - ${score.field_name}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParticipantsSimple();

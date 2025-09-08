// Check if scores exist in wrong wertungenIds for event 50 participants
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWrongScores() {
  try {
    console.log('=== Checking for scores in wrong wertungenIds ===');
    
    // Get all participants in event 50
    const event50ParticipantIds = [1775, 1299, 1178, 1175, 1774, 1480, 1536]; // From previous query
    
    for (const participantId of event50ParticipantIds) {
      console.log(`\n--- Checking participant ${participantId} ---`);
      
      // Find ALL wertungenIds for this participant (across all events)
      const allWertungenIds = await prisma.$queryRawUnsafe(`
        SELECT w.int_wertungenid, wk.int_veranstaltungenid as event_id, wk.int_wettkaempfeid as competition_id
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        WHERE w.int_teilnehmerid = $1
        ORDER BY w.int_wertungenid
      `, participantId);
      
      console.log(`  Found ${allWertungenIds.length} wertungen records:`);
      
      for (const wertung of allWertungenIds) {
        const scoreCount = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM tfx_jury_results WHERE int_wertungenid = $1
        `, wertung.int_wertungenid);
        
        const eventMarker = wertung.event_id === 50 ? '✅ EVENT 50' : `❌ EVENT ${wertung.event_id}`;
        console.log(`    wertungenId ${wertung.int_wertungenid} (${eventMarker}): ${scoreCount[0].count} scores`);
        
        if (scoreCount[0].count > 0 && wertung.event_id !== 50) {
          console.log(`      🚨 FOUND SCORES IN WRONG EVENT! These should be migrated to event 50.`);
          
          // Show sample scores
          const scores = await prisma.$queryRawUnsafe(`
            SELECT int_disziplinen_felderid, rel_leistung, int_versuch, int_kp
            FROM tfx_jury_results 
            WHERE int_wertungenid = $1 
            ORDER BY int_disziplinen_felderid, int_versuch
          `, wertung.int_wertungenid);
          
          scores.forEach(score => {
            console.log(`        Field ${score.int_disziplinen_felderid}: ${score.rel_leistung} (attempt ${score.int_versuch}, type ${score.int_kp})`);
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

checkWrongScores();

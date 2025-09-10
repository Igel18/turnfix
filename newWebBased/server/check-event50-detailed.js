// Check participants and scores more carefully
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvent50Participants() {
  try {
    console.log('=== Checking all participants in event 50 ===');
    
    // Get participants without DISTINCT to avoid issues
    const participants = await prisma.$queryRawUnsafe(`
      SELECT 
        t.int_teilnehmerid as participantId,
        t.var_vorname,
        t.var_nachname,
        t.var_vorname || ' ' || t.var_nachname as fullName,
        w.int_wertungenid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid  
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 50
      ORDER BY t.var_nachname, t.var_vorname
    `);
    
    console.log(`Found ${participants.length} participant-wertungen combinations in event 50:`);
    
    for (const p of participants) {
      console.log(`\n${p.fullname} (ID: ${p.participantid}, wertungenId: ${p.int_wertungenid})`);
      
      // Count scores for this wertungenId
      const scoreCount = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM tfx_jury_results WHERE int_wertungenid = $1
      `, p.int_wertungenid);
      
      console.log(`  📊 Total scores: ${scoreCount[0].count}`);
      
      // If this is one of our target participants, get more details
      if (p.fullname && (p.fullname.includes('Albrecht') || p.fullname.includes('Merkl') || p.fullname.includes('Münsch'))) {
        console.log(`  ⭐ TARGET PARTICIPANT FROM JURY PORTAL!`);
        
        if (scoreCount[0].count > 0) {
          // Get sample scores
          const scores = await prisma.$queryRawUnsafe(`
            SELECT int_disziplinen_felderid, rel_leistung, int_versuch 
            FROM tfx_jury_results 
            WHERE int_wertungenid = $1 
            LIMIT 5
          `, p.int_wertungenid);
          
          console.log(`  📋 Sample scores:`);
          scores.forEach(s => {
            console.log(`    Field ${s.int_disziplinen_felderid}: ${s.rel_leistung} (attempt ${s.int_versuch})`);
          });
        } else {
          console.log(`  ❌ NO SCORES - This explains why jury portal shows 'Wartend'`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvent50Participants();

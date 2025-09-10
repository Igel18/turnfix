// Find Mirja Baretti specifically
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMirjaBaretti() {
  try {
    console.log('=== Finding Mirja Baretti ===\n');
    
    // Check if Mirja exists at all
    const mirjaExists = await prisma.$queryRawUnsafe(`
      SELECT int_teilnehmerid, var_nachname, var_vorname 
      FROM tfx_teilnehmer 
      WHERE var_nachname LIKE '%Baretti%' OR var_vorname LIKE '%Mirja%'
    `);
    
    if (mirjaExists.length > 0) {
      console.log('✅ Found participants matching Baretti/Mirja:');
      mirjaExists.forEach(p => {
        console.log(`   ${p.var_vorname} ${p.var_nachname} (ID: ${p.int_teilnehmerid})`);
      });
      
      // For each Mirja/Baretti, find their events
      for (const person of mirjaExists) {
        console.log(`\n🔍 Checking events for ${person.var_vorname} ${person.var_nachname} (ID: ${person.int_teilnehmerid}):`);
        
        const events = await prisma.$queryRawUnsafe(`
          SELECT DISTINCT
            wk.int_veranstaltungenid as event_id,
            w.int_wertungenid,
            wk.int_wettkaempfeid as competition_id
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE w.int_teilnehmerid = $1
          ORDER BY wk.int_veranstaltungenid
        `, person.int_teilnehmerid);
        
        if (events.length > 0) {
          console.log(`   Participates in ${events.length} events:`);
          
          for (const event of events) {
            console.log(`     Event ${event.event_id}, Competition ${event.competition_id}, WertungenId: ${event.int_wertungenid}`);
            
            // Check scores
            const scores = await prisma.$queryRawUnsafe(`
              SELECT 
                int_disziplinen_felderid,
                rel_leistung,
                int_versuch
              FROM tfx_jury_results
              WHERE int_wertungenid = $1
              ORDER BY int_disziplinen_felderid, int_versuch
            `, event.int_wertungenid);
            
            if (scores.length > 0) {
              console.log(`       ✅ ${scores.length} scores found:`);
              scores.forEach(score => {
                console.log(`         Field ${score.int_disziplinen_felderid}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
              });
            } else {
              console.log(`       ❌ No scores found`);
            }
          }
        } else {
          console.log(`   ❌ No events found for this participant`);
        }
      }
      
    } else {
      console.log('❌ No participants found matching Baretti or Mirja');
      
      // Let's search more broadly
      console.log('\n🔍 Searching for similar names...');
      
      const similarNames = await prisma.$queryRawUnsafe(`
        SELECT int_teilnehmerid, var_nachname, var_vorname 
        FROM tfx_teilnehmer 
        WHERE var_nachname LIKE '%Bar%' OR var_nachname LIKE '%etti%'
        LIMIT 10
      `);
      
      console.log(`Found ${similarNames.length} participants with similar names:`);
      similarNames.forEach(p => {
        console.log(`   ${p.var_vorname} ${p.var_nachname} (ID: ${p.int_teilnehmerid})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMirjaBaretti();

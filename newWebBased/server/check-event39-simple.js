// Simple check for Event 39 participants and scores
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvent39Simple() {
  try {
    console.log('=== Simple Event 39 Check ===\n');
    
    // First, let's just find all participants in Event 39
    console.log('🔍 Looking for all participants in Event 39...');
    
    const participants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.var_nachname,
        t.var_vorname,
        w.int_wertungenid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 39
      ORDER BY t.var_nachname, t.var_vorname
    `);
    
    console.log(`📊 Found ${participants.length} participants in Event 39:`);
    
    for (const p of participants) {
      console.log(`\n👤 ${p.var_vorname} ${p.var_nachname} (ID: ${p.int_teilnehmerid}, WertungenId: ${p.int_wertungenid})`);
      
      // Check for any scores
      const scores = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM tfx_jury_results
        WHERE int_wertungenid = $1
      `, p.int_wertungenid);
      
      console.log(`   📊 Scores in wertungenId ${p.int_wertungenid}: ${scores[0].count}`);
      
      // If there are scores, show them
      if (parseInt(scores[0].count) > 0) {
        const detailScores = await prisma.$queryRawUnsafe(`
          SELECT 
            int_disziplinen_felderid,
            rel_leistung,
            int_versuch
          FROM tfx_jury_results
          WHERE int_wertungenid = $1
          ORDER BY int_disziplinen_felderid, int_versuch
        `, p.int_wertungenid);
        
        console.log(`   ✅ Score details:`);
        detailScores.forEach(score => {
          console.log(`      Field ${score.int_disziplinen_felderid}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
        });
      }
    }
    
    // Also check for Mirja Baretti specifically across ALL events
    console.log('\n\n🎯 Checking for Mirja Baretti across ALL events...');
    
    const mirjaAll = await prisma.$queryRawUnsafe(`
      SELECT 
        t.int_teilnehmerid,
        t.var_nachname,
        t.var_vorname,
        w.int_wertungenid,
        wk.int_veranstaltungenid as event_id,
        wk.str_bezeichnung as competition_name
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE t.var_nachname LIKE '%Baretti%'
      ORDER BY wk.int_veranstaltungenid
    `);
    
    if (mirjaAll.length > 0) {
      console.log(`✅ Found Mirja Baretti in ${mirjaAll.length} competitions:`);
      
      for (const entry of mirjaAll) {
        console.log(`\n📍 Event ${entry.event_id}: ${entry.competition_name}`);
        console.log(`   Participant ID: ${entry.int_teilnehmerid}, WertungenId: ${entry.int_wertungenid}`);
        
        // Check scores for this wertungenId
        const scores = await prisma.$queryRawUnsafe(`
          SELECT 
            int_disziplinen_felderid,
            rel_leistung,
            int_versuch
          FROM tfx_jury_results
          WHERE int_wertungenid = $1
          ORDER BY int_disziplinen_felderid, int_versuch
        `, entry.int_wertungenid);
        
        if (scores.length > 0) {
          console.log(`   ✅ Found ${scores.length} scores:`);
          scores.forEach(score => {
            console.log(`      Field ${score.int_disziplinen_felderid}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
          });
        } else {
          console.log(`   ❌ No scores found`);
        }
      }
    } else {
      console.log('❌ Mirja Baretti not found in any event');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvent39Simple();

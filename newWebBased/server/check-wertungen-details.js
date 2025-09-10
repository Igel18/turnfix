// Check tfx_wertungen_details for scores
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWertungenDetails() {
  try {
    console.log('=== Checking tfx_wertungen_details for scores ===\n');
    
    // First, let's look at the structure of tfx_wertungen_details
    console.log('🔍 Checking tfx_wertungen_details structure...');
    
    const sampleDetails = await prisma.$queryRawUnsafe(`
      SELECT * FROM tfx_wertungen_details LIMIT 5
    `);
    
    console.log('📊 Sample tfx_wertungen_details structure:');
    if (sampleDetails.length > 0) {
      console.log('Columns:', Object.keys(sampleDetails[0]));
      sampleDetails.forEach((row, i) => {
        console.log(`Sample ${i + 1}:`, row);
      });
    }
    
    // Now check for Mirja Baretti in Event 49 (39. Schüler- und Jugendbestenkämpfe)
    console.log('\n🎯 Checking for Mirja Baretti scores in Event 49...');
    
    // Mirja Baretti ID: 1007, WertungenId: 3750 (from Event 49)
    const mirjaDetails = await prisma.$queryRawUnsafe(`
      SELECT * FROM tfx_wertungen_details 
      WHERE int_wertungenid = 3750
      ORDER BY int_disziplinenid, int_versuch
    `);
    
    if (mirjaDetails.length > 0) {
      console.log(`✅ Found ${mirjaDetails.length} records in tfx_wertungen_details for Mirja (WertungenId: 3750):`);
      mirjaDetails.forEach(detail => {
        console.log(`   Discipline ${detail.int_disziplinenid}: ${detail.rel_leistung || detail.var_leistung || 'No score'} (attempt ${detail.int_versuch || 1})`);
        console.log(`   Full record:`, detail);
      });
    } else {
      console.log(`❌ No records found in tfx_wertungen_details for WertungenId 3750`);
    }
    
    // Let's also check all participants in Event 49 for scores in wertungen_details
    console.log('\n📊 Checking all Event 49 participants for scores in tfx_wertungen_details...');
    
    const event49Participants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.var_nachname,
        t.var_vorname,
        w.int_wertungenid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 49
      ORDER BY t.var_nachname, t.var_vorname
      LIMIT 10
    `);
    
    for (const participant of event49Participants) {
      const details = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM tfx_wertungen_details 
        WHERE int_wertungenid = $1
      `, participant.int_wertungenid);
      
      const count = parseInt(details[0].count);
      console.log(`   ${participant.var_vorname} ${participant.var_nachname} (WertungenId: ${participant.int_wertungenid}): ${count} scores in wertungen_details`);
      
      if (count > 0 && participant.var_nachname && participant.var_nachname.includes('Baretti')) {
        // Show detailed scores for Mirja
        const detailedScores = await prisma.$queryRawUnsafe(`
          SELECT * FROM tfx_wertungen_details 
          WHERE int_wertungenid = $1
          ORDER BY int_disziplinenid, int_versuch
        `, participant.int_wertungenid);
        
        console.log(`     🏆 Detailed scores for ${participant.var_vorname} ${participant.var_nachname}:`);
        detailedScores.forEach(score => {
          console.log(`       Discipline ${score.int_disziplinenid}: ${score.rel_leistung || score.var_leistung || 'No score'} (attempt ${score.int_versuch || 1})`);
        });
      }
    }
    
    // Check what discipline 73 (Balken/Beam) corresponds to
    console.log('\n🔧 Checking discipline information...');
    
    const disciplines = await prisma.$queryRawUnsafe(`
      SELECT int_disziplinenid, var_name, var_kurz1, var_kurz2
      FROM tfx_disziplinen 
      WHERE int_disziplinenid IN (73, 74, 46, 68, 71, 72, 31, 50)
      ORDER BY int_disziplinenid
    `);
    
    console.log('📋 Relevant disciplines:');
    disciplines.forEach(d => {
      console.log(`   Discipline ${d.int_disziplinenid}: ${d.var_name} (${d.var_kurz1}, ${d.var_kurz2})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWertungenDetails();

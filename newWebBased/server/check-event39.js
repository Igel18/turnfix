// Check Event 39 - Schüler- und Jugendbestenkämpfe
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEvent39() {
  try {
    console.log('=== Checking Event 39: Schüler- und Jugendbestenkämpfe ===\n');
    
    // Find Event 39
    const event39 = await prisma.$queryRawUnsafe(`
      SELECT * FROM tfx_veranstaltungen WHERE int_veranstaltungenid = 39
    `);
    
    if (event39.length === 0) {
      console.log('❌ Event 39 not found');
      return;
    }
    
    console.log('📅 Event 39:', event39[0].str_titel);
    console.log('');
    
    // Find participants in Event 39, specifically in squad "wBlau" for discipline "Balken"
    console.log('🔍 Looking for participants in Event 39...');
    
    const participants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.str_nachname,
        t.str_vorname,
        v.str_name as verein,
        w.int_wertungenid,
        wk.str_bezeichnung as wettkaempfe_name,
        wk.int_wettkaempfeid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      WHERE wk.int_veranstaltungenid = 39
      ORDER BY t.str_nachname, t.str_vorname
    `);
    
    console.log(`📊 Found ${participants.length} participants in Event 39:`);
    
    for (const p of participants) {
      console.log(`\n👤 ${p.str_vorname} ${p.str_nachname} (ID: ${p.int_teilnehmerid})`);
      console.log(`   Verein: ${p.verein}`);
      console.log(`   WertungenId: ${p.int_wertungenid}`);
      console.log(`   Wettkampf: ${p.wettkaempfe_name} (ID: ${p.int_wettkaempfeid})`);
      
      // Check for scores in this wertungenId
      const scores = await prisma.$queryRawUnsafe(`
        SELECT 
          jr.int_juryresultsid,
          jr.int_disziplinen_felderid,
          jr.rel_leistung,
          jr.int_versuch,
          df.str_bezeichnung as field_name
        FROM tfx_jury_results jr
        LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
        WHERE jr.int_wertungenid = $1
        ORDER BY jr.int_disziplinen_felderid, jr.int_versuch
      `, p.int_wertungenid);
      
      if (scores.length > 0) {
        console.log(`   ✅ Found ${scores.length} scores:`);
        scores.forEach(score => {
          console.log(`      Field ${score.int_disziplinen_felderid} (${score.field_name || 'Unknown'}): ${score.rel_leistung} (attempt ${score.int_versuch})`);
        });
      } else {
        console.log(`   ❌ No scores found for wertungenId ${p.int_wertungenid}`);
      }
    }
    
    // Specifically look for Mirja Baretti
    console.log('\n🎯 Specifically checking for Mirja Baretti...');
    
    const mirja = await prisma.$queryRawUnsafe(`
      SELECT 
        t.int_teilnehmerid,
        t.str_nachname,
        t.str_vorname,
        w.int_wertungenid,
        wk.int_wettkaempfeid,
        wk.str_bezeichnung as wettkaempfe_name
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE t.str_nachname LIKE '%Baretti%' 
      AND wk.int_veranstaltungenid = 39
    `);
    
    if (mirja.length > 0) {
      const m = mirja[0];
      console.log(`✅ Found Mirja Baretti (ID: ${m.int_teilnehmerid}, WertungenId: ${m.int_wertungenid})`);
      
      // Check all scores for Mirja in any wertungenId
      const allMirjaScores = await prisma.$queryRawUnsafe(`
        SELECT 
          jr.int_juryresultsid,
          jr.int_wertungenid,
          jr.int_disziplinen_felderid,
          jr.rel_leistung,
          jr.int_versuch,
          df.str_bezeichnung as field_name,
          wk.int_veranstaltungenid,
          wk.str_bezeichnung as event_name
        FROM tfx_jury_results jr
        INNER JOIN tfx_wertungen w ON jr.int_wertungenid = w.int_wertungenid
        INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        LEFT JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
        WHERE w.int_teilnehmerid = $1
        ORDER BY wk.int_veranstaltungenid, jr.int_disziplinen_felderid, jr.int_versuch
      `, m.int_teilnehmerid);
      
      console.log(`\n📊 All scores for Mirja Baretti across all events:`);
      
      if (allMirjaScores.length > 0) {
        allMirjaScores.forEach(score => {
          console.log(`   Event ${score.int_veranstaltungenid} (${score.event_name}), WertungenId ${score.int_wertungenid}:`);
          console.log(`      Field ${score.int_disziplinen_felderid} (${score.field_name || 'Unknown'}): ${score.rel_leistung} (attempt ${score.int_versuch})`);
        });
      } else {
        console.log('   ❌ No scores found for Mirja Baretti in any event');
      }
    } else {
      console.log('❌ Mirja Baretti not found in Event 39');
    }
    
    // Check what discipline fields are used in Event 39
    console.log('\n🔧 Checking discipline fields for Event 39...');
    
    const disciplineFields = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT
        df.int_disziplinen_felderid,
        df.str_bezeichnung,
        d.str_bezeichnung as discipline_name
      FROM tfx_disziplinen_felder df
      INNER JOIN tfx_disziplinen d ON df.int_disziplineid = d.int_disziplineid
      INNER JOIN tfx_wettkaempfe_disziplinen wd ON d.int_disziplineid = wd.int_disziplineid
      INNER JOIN tfx_wettkaempfe wk ON wd.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 39
      ORDER BY df.int_disziplinen_felderid
    `);
    
    console.log(`Found ${disciplineFields.length} discipline fields in Event 39:`);
    disciplineFields.forEach(field => {
      console.log(`   Field ${field.int_disziplinen_felderid}: ${field.str_bezeichnung} (${field.discipline_name})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEvent39();

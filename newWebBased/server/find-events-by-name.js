// Find events by name containing "39" or "Schüler"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findEventsByName() {
  try {
    console.log('=== Finding Events by Name ===\n');
    
    // First, let's see all events to understand the structure
    console.log('🔍 Looking for events with "39" or "Schüler" in the name...');
    
    const events = await prisma.$queryRawUnsafe(`
      SELECT 
        int_veranstaltungenid as event_id,
        var_name as event_name,
        str_titel as event_title
      FROM tfx_veranstaltungen 
      WHERE 
        var_name LIKE '%39%' OR 
        var_name LIKE '%Schüler%' OR 
        var_name LIKE '%Jugend%' OR
        str_titel LIKE '%39%' OR 
        str_titel LIKE '%Schüler%' OR 
        str_titel LIKE '%Jugend%'
      ORDER BY int_veranstaltungenid
    `);
    
    if (events.length > 0) {
      console.log(`✅ Found ${events.length} events matching the criteria:`);
      
      for (const event of events) {
        console.log(`\n📅 Event ID: ${event.event_id}`);
        console.log(`   Name: ${event.event_name || 'NULL'}`);
        console.log(`   Title: ${event.event_title || 'NULL'}`);
        
        // Now find participants in this event
        const participants = await prisma.$queryRawUnsafe(`
          SELECT DISTINCT
            t.int_teilnehmerid,
            t.var_nachname,
            t.var_vorname,
            w.int_wertungenid
          FROM tfx_teilnehmer t
          INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
          ORDER BY t.var_nachname, t.var_vorname
        `, event.event_id);
        
        console.log(`   👥 ${participants.length} participants`);
        
        // Check specifically for Mirja Baretti
        const mirjaInEvent = participants.find(p => 
          p.var_nachname && p.var_nachname.includes('Baretti') && 
          p.var_vorname && p.var_vorname.includes('Mirja')
        );
        
        if (mirjaInEvent) {
          console.log(`   🎯 ✅ Mirja Baretti found! (ID: ${mirjaInEvent.int_teilnehmerid}, WertungenId: ${mirjaInEvent.int_wertungenid})`);
          
          // Check her scores in this event
          const scores = await prisma.$queryRawUnsafe(`
            SELECT 
              int_disziplinen_felderid,
              rel_leistung,
              int_versuch
            FROM tfx_jury_results
            WHERE int_wertungenid = $1
            ORDER BY int_disziplinen_felderid, int_versuch
          `, mirjaInEvent.int_wertungenid);
          
          if (scores.length > 0) {
            console.log(`   🏆 Mirja has ${scores.length} scores in this event:`);
            scores.forEach(score => {
              console.log(`      Field ${score.int_disziplinen_felderid}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
            });
          } else {
            console.log(`   ❌ Mirja has no scores in this event`);
          }
        } else {
          console.log(`   ❌ Mirja Baretti not found in this event`);
        }
      }
    } else {
      console.log('❌ No events found with "39", "Schüler", or "Jugend" in name/title');
      
      // Let's see some sample event names to understand the pattern
      console.log('\n📋 Sample event names from database:');
      const sampleEvents = await prisma.$queryRawUnsafe(`
        SELECT 
          int_veranstaltungenid as event_id,
          var_name as event_name,
          str_titel as event_title
        FROM tfx_veranstaltungen 
        ORDER BY int_veranstaltungenid
        LIMIT 20
      `);
      
      sampleEvents.forEach(event => {
        console.log(`   Event ${event.event_id}: "${event.event_name || 'NULL'}" / "${event.event_title || 'NULL'}"`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findEventsByName();

// Check participant IDs and scores for the participants shown in the jury portal
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParticipantsInEvent50() {
  try {
    console.log('=== Checking participants in event 50 for Reck discipline ===');
    
    // Find participants in event 50
    const participants = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT 
        t.int_teilnehmerid as participantId,
        t.var_vorname || ' ' || t.var_nachname as name,
        v.var_vereinsname as club,
        w.int_wertungenid
      FROM tfx_teilnehmer t
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid  
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_vereine v ON t.int_vereinid = v.int_vereinid
      WHERE wk.int_veranstaltungenid = 50
      ORDER BY t.var_nachname, t.var_vorname
    `);
    
    console.log('Found participants:', participants.length);
    
    // Look for Benjamin Albrecht, Thomas Merkl, Manfred Münsch
    const targetNames = ['Benjamin Albrecht', 'Thomas Merkl', 'Manfred Münsch'];
    
    for (const participant of participants) {
      if (targetNames.some(name => participant.name.includes(name.split(' ')[1]))) {
        console.log(`\n--- ${participant.name} (ID: ${participant.participantId}, wertungenId: ${participant.int_wertungenid}) ---`);
        
        // Check for any scores for this participant
        const scores = await prisma.$queryRawUnsafe(`
          SELECT jr.*, df.var_disziplinenfeldbez as field_name
          FROM tfx_jury_results jr
          INNER JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
          WHERE jr.int_wertungenid = $1
          ORDER BY jr.int_disziplinen_felderid, jr.int_versuch
        `, participant.int_wertungenid);
        
        if (scores.length > 0) {
          console.log(`✅ Has ${scores.length} scores:`);
          scores.forEach(score => {
            console.log(`  - ${score.field_name}: ${score.rel_leistung} (attempt ${score.int_versuch})`);
          });
        } else {
          console.log('❌ No scores found');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkParticipantsInEvent50();

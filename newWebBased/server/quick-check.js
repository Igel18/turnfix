const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickCheck() {
  console.log('🔍 Quick check of event 91 participant distribution...');
  
  try {
    // Get competition participant counts for event 91
    const competitionCounts = await prisma.$queryRawUnsafe(`
      SELECT 
        w.int_wettkaempfeid,
        w.var_name,
        w.yer_von,
        w.yer_bis,
        w.int_bereicheid,
        COUNT(wert.int_teilnehmerid) as participant_count
      FROM tfx_wettkaempfe w
      LEFT JOIN tfx_wertungen wert ON w.int_wettkaempfeid = wert.int_wettkaempfeid
      WHERE w.int_veranstaltungenid = 91
      GROUP BY w.int_wettkaempfeid, w.var_name, w.yer_von, w.yer_bis, w.int_bereicheid
      ORDER BY participant_count DESC, w.var_name
    `);

    console.log('\n📊 Competition participation in Event 91:');
    for (const comp of competitionCounts) {
      console.log(`  🏅 ${comp.var_name}`);
      console.log(`     Age: ${comp.yer_von}-${comp.yer_bis}, Bereich: ${comp.int_bereicheid}, Participants: ${comp.participant_count}`);
    }

    // Check if participants are distributed across competitions
    const nonEmptyCompetitions = competitionCounts.filter(c => c.participant_count > 0);
    console.log(`\n📈 Summary: ${nonEmptyCompetitions.length} competitions have participants out of ${competitionCounts.length} total`);

    if (nonEmptyCompetitions.length === 1) {
      console.log('❌ PROBLEM: All participants are still in just one competition!');
      console.log('🔧 The assignment logic needs to be tested with a new import.');
    } else {
      console.log('✅ GOOD: Participants are distributed across multiple competitions!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

quickCheck();

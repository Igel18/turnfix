const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDistribution() {
  try {
    // Get latest event
    const latestEvent = await prisma.tfx_veranstaltungen.findFirst({
      orderBy: { int_veranstaltungenid: 'desc' }
    });
    
    console.log('Latest event:', latestEvent?.var_name, 'ID:', latestEvent?.int_veranstaltungenid);
    
    if (!latestEvent) {
      console.log('No events found');
      return;
    }

    // Get competitions for this event
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: latestEvent.int_veranstaltungenid }
    });
    
    console.log('\nCompetitions:');
    competitions.forEach(c => {
      console.log(` - ${c.var_name} (Number: ${c.var_nummer}, ID: ${c.int_wettkaempfeid})`);
    });

    // Check participant distribution
    const scores = await prisma.$queryRawUnsafe(`
      SELECT 
        w.int_wettkaempfeid, 
        wk.var_name as competition_name, 
        wk.var_nummer, 
        COUNT(*) as participant_count 
      FROM tfx_wertungen w 
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid 
      WHERE wk.int_veranstaltungenid = $1 
      GROUP BY w.int_wettkaempfeid, wk.var_name, wk.var_nummer 
      ORDER BY wk.var_nummer
    `, latestEvent.int_veranstaltungenid);
    
    console.log('\nParticipant distribution:');
    if (scores.length === 0) {
      console.log('  No participants assigned yet');
    } else {
      scores.forEach(s => {
        console.log(`  - ${s.competition_name} (#${s.var_nummer}): ${s.participant_count} participants`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDistribution();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function redistributeParticipants() {
  try {
    console.log('🎯 Starting participant redistribution based on XML assignment logic...');
    
    // Get the latest event
    const latestEvent = await prisma.tfx_veranstaltungen.findFirst({
      orderBy: { int_veranstaltungenid: 'desc' }
    });
    
    if (!latestEvent) {
      console.log('No events found');
      return;
    }
    
    console.log(`📊 Working on event: ${latestEvent.var_name} (ID: ${latestEvent.int_veranstaltungenid})`);
    
    // Get all competitions for this event
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: latestEvent.int_veranstaltungenid },
      orderBy: { int_wettkaempfeid: 'asc' }
    });
    
    console.log(`🏆 Found ${competitions.length} competitions`);
    
    // Get all participants currently assigned to any competition in this event
    const currentAssignments = await prisma.$queryRawUnsafe(`
      SELECT w.int_teilnehmerid, w.int_wettkaempfeid, t.var_vorname, t.var_nachname, 
             t.dat_geburtstag, t.int_geschlecht, wk.var_name as competition_name
      FROM tfx_wertungen w
      JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
    `, latestEvent.int_veranstaltungenid);
    
    console.log(`👥 Found ${currentAssignments.length} participant assignments`);
    
    // Simulate redistribution based on age and gender
    let redistributed = 0;
    const targetCompetitions = {
      'female_youth': competitions.filter(c => c.var_name.toLowerCase().includes('w') && 
                                            (c.var_name.includes('7-8') || c.var_name.includes('9-10'))),
      'male_youth': competitions.filter(c => c.var_name.toLowerCase().includes('m') && 
                                          (c.var_name.includes('7-8') || c.var_name.includes('9-10'))),
      'female_older': competitions.filter(c => c.var_name.toLowerCase().includes('w') && 
                                            (c.var_name.includes('11-12') || c.var_name.includes('13-14'))),
      'male_older': competitions.filter(c => c.var_name.toLowerCase().includes('m') && 
                                          (c.var_name.includes('11-12') || c.var_name.includes('13-14')))
    };
    
    console.log('🎯 Target competition groups:');
    Object.keys(targetCompetitions).forEach(key => {
      console.log(`  ${key}: ${targetCompetitions[key].length} competitions`);
    });
    
    for (const assignment of currentAssignments) {
      // Calculate age
      const birthDate = new Date(assignment.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const gender = assignment.int_geschlecht;
      
      // Determine target competition group
      let targetGroup = null;
      if (gender === 2) { // Female
        if (age >= 7 && age <= 10) {
          targetGroup = targetCompetitions.female_youth;
        } else if (age >= 11 && age <= 14) {
          targetGroup = targetCompetitions.female_older;
        }
      } else if (gender === 1) { // Male
        if (age >= 7 && age <= 10) {
          targetGroup = targetCompetitions.male_youth;
        } else if (age >= 11 && age <= 14) {
          targetGroup = targetCompetitions.male_older;
        }
      }
      
      if (targetGroup && targetGroup.length > 0) {
        // Pick a competition from the target group (rotate for distribution)
        const targetCompetition = targetGroup[redistributed % targetGroup.length];
        
        if (targetCompetition.int_wettkaempfeid !== assignment.int_wettkaempfeid) {
          // Update assignment
          await prisma.$executeRaw`
            UPDATE tfx_wertungen 
            SET int_wettkaempfeid = ${targetCompetition.int_wettkaempfeid}
            WHERE int_teilnehmerid = ${assignment.int_teilnehmerid} 
            AND int_wettkaempfeid = ${assignment.int_wettkaempfeid}
          `;
          
          console.log(`  ↻ ${assignment.var_vorname} ${assignment.var_nachname} (age ${age}, gender ${gender}) → ${targetCompetition.var_name}`);
          redistributed++;
        }
      }
    }
    
    console.log(`✅ Redistributed ${redistributed} participants`);
    
    // Show new distribution
    const newDistribution = await prisma.$queryRawUnsafe(`
      SELECT wk.var_name as competition_name, wk.var_nummer, COUNT(*) as participant_count 
      FROM tfx_wertungen w 
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid 
      WHERE wk.int_veranstaltungenid = $1 
      GROUP BY w.int_wettkaempfeid, wk.var_name, wk.var_nummer 
      ORDER BY participant_count DESC
    `, latestEvent.int_veranstaltungenid);
    
    console.log('\n📊 New participant distribution:');
    newDistribution.forEach(d => {
      console.log(`  - ${d.competition_name}: ${d.participant_count} participants`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

redistributeParticipants();

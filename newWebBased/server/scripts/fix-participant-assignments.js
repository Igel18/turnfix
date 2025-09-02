const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixParticipantAssignments() {
  try {
    console.log('🔧 Starting participant assignment fix for Event 87...');
    
    // Get all competitions in Event 87
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      orderBy: { int_wettkaempfeid: 'asc' }
    });
    
    console.log(`Found ${competitions.length} competitions in Event 87:`);
    competitions.forEach(comp => {
      console.log(`  - ${comp.var_name} (ID: ${comp.int_wettkaempfeid})`);
    });
    
    // Get all misplaced participants from competition 828
    const misplacedWertungen = await prisma.tfx_wertungen.findMany({
      where: {
        int_wettkaempfeid: 828,
        int_teilnehmerid: { not: null }
      },
      include: {
        tfx_teilnehmer: true
      }
    });
    
    console.log(`\n📊 Found ${misplacedWertungen.length} misplaced participants`);
    
    // Create mapping of competition names to IDs for easier assignment
    const competitionMap = {};
    competitions.forEach(comp => {
      competitionMap[comp.var_name] = comp.int_wettkaempfeid;
    });
    
    let reassignments = [];
    
    // Process each misplaced participant
    for (const wertung of misplacedWertungen) {
      const participant = wertung.tfx_teilnehmer;
      const birthDate = new Date(participant.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const isMale = participant.int_geschlecht === 1;
      const genderPrefix = isMale ? 'm' : 'w';
      
      // Determine correct age group
      let ageGroup;
      if (age <= 6) ageGroup = '1-6Jahre';
      else if (age <= 8) ageGroup = '7-8Jahre';
      else if (age <= 10) ageGroup = '9-10Jahre';
      else if (age <= 12) ageGroup = '11-12Jahre';
      else if (age <= 14) ageGroup = '13-14Jahre';
      else if (age <= 16) ageGroup = '15-16Jahre';
      else ageGroup = '17-18Jahre'; // 17+ goes to oldest group
      
      // Find the correct competition
      let targetCompetition = null;
      const expectedName1 = `Gerätvierkampf ${genderPrefix} (${ageGroup})`;
      const expectedName2 = `Gerätsechskampf ${genderPrefix} (${ageGroup})`;
      
      if (competitionMap[expectedName1]) {
        targetCompetition = competitionMap[expectedName1];
      } else if (competitionMap[expectedName2]) {
        targetCompetition = competitionMap[expectedName2];
      }
      
      if (targetCompetition && targetCompetition !== 828) {
        reassignments.push({
          wertungId: wertung.int_wertungenid,
          participantName: `${participant.var_vorname} ${participant.var_nachname}`,
          age,
          gender: isMale ? 'male' : 'female',
          fromCompetition: 828,
          toCompetition: targetCompetition,
          expectedName: expectedName1 + ' or ' + expectedName2
        });
      }
    }
    
    console.log(`\n📋 Reassignment plan (${reassignments.length} participants):`);
    
    // Group by target competition for summary
    const byTarget = {};
    reassignments.forEach(r => {
      if (!byTarget[r.toCompetition]) byTarget[r.toCompetition] = [];
      byTarget[r.toCompetition].push(r);
    });
    
    Object.keys(byTarget).forEach(compId => {
      const comp = competitions.find(c => c.int_wettkaempfeid == compId);
      console.log(`  To "${comp.var_name}" (${compId}): ${byTarget[compId].length} participants`);
    });
    
    // Ask for confirmation
    console.log(`\n⚠️  This will reassign ${reassignments.length} participants.`);
    console.log('🔍 First 5 examples:');
    reassignments.slice(0, 5).forEach(r => {
      console.log(`  - ${r.participantName} (${r.gender}, age ${r.age}) -> Competition ${r.toCompetition}`);
    });
    
    console.log('\n🚀 Executing reassignments...');
    
    // Execute the reassignments
    let successCount = 0;
    for (const reassignment of reassignments) {
      try {
        await prisma.tfx_wertungen.update({
          where: { int_wertungenid: reassignment.wertungId },
          data: { int_wettkaempfeid: reassignment.toCompetition }
        });
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to reassign ${reassignment.participantName}:`, error.message);
      }
    }
    
    console.log(`\n✅ Successfully reassigned ${successCount} participants!`);
    
    // Verify the results
    console.log('\n📊 Final competition participant counts:');
    for (const comp of competitions) {
      const count = await prisma.tfx_wertungen.count({
        where: {
          int_wettkaempfeid: comp.int_wettkaempfeid,
          int_teilnehmerid: { not: null }
        }
      });
      console.log(`  ${comp.var_name}: ${count} participants`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixParticipantAssignments();

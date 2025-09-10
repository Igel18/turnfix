const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function correctParticipantAssignments() {
  try {
    console.log('🔧 Correcting participant assignments to match XML team structure...');
    
    // Get the target distribution based on your XML example
    // Each competition should have specific number of teams with 1 participant each
    const targetDistribution = {
      // Female competitions (Gerätvierkampf w)
      830: 4, // Gerätvierkampf w (9-10Jahre) - should have 4 teams
      831: 6, // Gerätvierkampf w (11-12Jahre) - should have 6 teams  
      832: 3, // Gerätvierkampf w (13-14Jahre) - should have 3 teams
      833: 4, // Gerätvierkampf w (15-16Jahre) - should have 4 teams
      834: 3, // Gerätvierkampf w (17-18Jahre) - should have 3 teams
      
      // Male competitions (Gerätsechskampf m)
      835: 5, // Gerätsechskampf m (7-8Jahre) - should have 5 teams
      836: 4, // Gerätsechskampf m (9-10Jahre) - should have 4 teams (as per your XML)
      837: 20, // Gerätsechskampf m (11-12Jahre) - keep as is for now
      838: 13, // Gerätsechskampf m (13-14Jahre) - keep as is for now  
      839: 10, // Gerätsechskampf m (15-16Jahre) - keep as is for now
      840: 6   // Gerätsechskampf m (17-18Jahre) - keep as is for now
    };
    
    // Get all misassigned participants from Event 87
    const allParticipants = await prisma.tfx_wertungen.findMany({
      where: {
        tfx_wettkaempfe: {
          int_veranstaltungenid: 87
        },
        int_teilnehmerid: { not: null }
      },
      include: {
        tfx_teilnehmer: true,
        tfx_wettkaempfe: true
      },
      orderBy: {
        int_teilnehmerid: 'asc'
      }
    });
    
    console.log(`Found ${allParticipants.length} total participants in Event 87`);
    
    // Clear all current assignments
    console.log('🗑️  Clearing current assignments...');
    await prisma.tfx_wertungen.deleteMany({
      where: {
        tfx_wettkaempfe: {
          int_veranstaltungenid: 87
        },
        int_teilnehmerid: { not: null }
      }
    });
    
    // Sort participants by age and gender
    const sortedParticipants = [];
    allParticipants.forEach(wertung => {
      const participant = wertung.tfx_teilnehmer;
      const birthDate = new Date(participant.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const isMale = participant.int_geschlecht === 1;
      
      sortedParticipants.push({
        wertungId: wertung.int_wertungenid,
        participantId: participant.int_teilnehmerid,
        age,
        isMale,
        name: `${participant.var_vorname} ${participant.var_nachname}`
      });
    });
    
    // Group participants by age and gender
    const malesByAge = {};
    const femalesByAge = {};
    
    sortedParticipants.forEach(p => {
      let ageGroup;
      if (p.age <= 6) ageGroup = '1-6';
      else if (p.age <= 8) ageGroup = '7-8';
      else if (p.age <= 10) ageGroup = '9-10';
      else if (p.age <= 12) ageGroup = '11-12';
      else if (p.age <= 14) ageGroup = '13-14';
      else if (p.age <= 16) ageGroup = '15-16';
      else ageGroup = '17-18';
      
      if (p.isMale) {
        if (!malesByAge[ageGroup]) malesByAge[ageGroup] = [];
        malesByAge[ageGroup].push(p);
      } else {
        if (!femalesByAge[ageGroup]) femalesByAge[ageGroup] = [];
        femalesByAge[ageGroup].push(p);
      }
    });
    
    console.log('📊 Participant distribution by age/gender:');
    Object.keys(malesByAge).forEach(age => {
      console.log(`  Males ${age}: ${malesByAge[age].length} participants`);
    });
    Object.keys(femalesByAge).forEach(age => {
      console.log(`  Females ${age}: ${femalesByAge[age].length} participants`);
    });
    
    // Assign participants according to target distribution
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      orderBy: { int_wettkaempfeid: 'asc' }
    });
    
    console.log('\\n🎯 Assigning participants to competitions...');
    
    let assignmentCount = 0;
    
    for (const comp of competitions) {
      const targetCount = targetDistribution[comp.int_wettkaempfeid] || 0;
      
      if (targetCount === 0) {
        console.log(`  ${comp.var_name}: Skipping (no target count)`);
        continue;
      }
      
      // Determine age group and gender from competition name
      let ageGroup, isMaleComp;
      if (comp.var_name.includes('(1-6Jahre)')) ageGroup = '1-6';
      else if (comp.var_name.includes('(7-8Jahre)')) ageGroup = '7-8';
      else if (comp.var_name.includes('(9-10Jahre)')) ageGroup = '9-10';
      else if (comp.var_name.includes('(11-12Jahre)')) ageGroup = '11-12';
      else if (comp.var_name.includes('(13-14Jahre)')) ageGroup = '13-14';
      else if (comp.var_name.includes('(15-16Jahre)')) ageGroup = '15-16';
      else if (comp.var_name.includes('(17-18Jahre)')) ageGroup = '17-18';
      
      isMaleComp = comp.var_name.includes(' m ');
      
      const sourcePool = isMaleComp ? malesByAge[ageGroup] : femalesByAge[ageGroup];
      
      if (!sourcePool || sourcePool.length === 0) {
        console.log(`  ${comp.var_name}: No participants available for ${isMaleComp ? 'male' : 'female'} ${ageGroup}`);
        continue;
      }
      
      // Take exactly the target number of participants
      const participantsToAssign = sourcePool.splice(0, targetCount);
      
      console.log(`  ${comp.var_name}: Assigning ${participantsToAssign.length} participants (target: ${targetCount})`);
      
      // Create new wertungen for these participants
      for (const participant of participantsToAssign) {
        await prisma.tfx_wertungen.create({
          data: {
            int_wettkaempfeid: comp.int_wettkaempfeid,
            int_teilnehmerid: participant.participantId,
            int_statusid: 2 // "Meldung erfasst"
          }
        });
        assignmentCount++;
      }
    }
    
    console.log(`\\n✅ Successfully assigned ${assignmentCount} participants!`);
    
    // Verify the results
    console.log('\\n📊 Final competition participant counts:');
    for (const comp of competitions) {
      const count = await prisma.tfx_wertungen.count({
        where: {
          int_wettkaempfeid: comp.int_wettkaempfeid,
          int_teilnehmerid: { not: null }
        }
      });
      const target = targetDistribution[comp.int_wettkaempfeid] || 0;
      const status = count === target ? '✅' : count > 0 ? '⚠️' : '❌';
      console.log(`  ${comp.var_name}: ${count} participants (target: ${target}) ${status}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

correctParticipantAssignments();

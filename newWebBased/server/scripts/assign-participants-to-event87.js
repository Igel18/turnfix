const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignParticipantsToEvent87() {
  try {
    console.log('🎯 Assigning participants to Event 87 competitions...');
    
    // Target distribution based on XML structure
    const targetDistribution = {
      // Female competitions (Gerätvierkampf w) - 4 participants each for individual competitions
      830: 4, // Gerätvierkampf w (9-10Jahre)
      831: 6, // Gerätvierkampf w (11-12Jahre)  
      832: 3, // Gerätvierkampf w (13-14Jahre)
      833: 4, // Gerätvierkampf w (15-16Jahre)
      834: 3, // Gerätvierkampf w (17-18Jahre)
      
      // Male competitions (Gerätsechskampf m) - individual competitions with 4-5 participants each
      835: 5, // Gerätsechskampf m (7-8Jahre)
      836: 4, // Gerätsechskampf m (9-10Jahre) - as per your XML
      837: 20, // Gerätsechskampf m (11-12Jahre) - larger group
      838: 13, // Gerätsechskampf m (13-14Jahre) - medium group
      839: 10, // Gerätsechskampf m (15-16Jahre) - medium group
      840: 6   // Gerätsechskampf m (17-18Jahre) - smaller group
    };
    
    // Get suitable participants for gymnastics competitions
    const allParticipants = await prisma.tfx_teilnehmer.findMany({
      where: {
        dat_geburtstag: {
          gte: new Date('2005-01-01'), // Born after 2005 (max 19 years old)
          lte: new Date('2017-12-31')  // Born before 2018 (min 7 years old)
        }
      },
      orderBy: [
        { int_geschlecht: 'asc' },
        { dat_geburtstag: 'desc' }
      ]
    });
    
    console.log(`Found ${allParticipants.length} suitable participants for gymnastics`);
    
    // Group participants by age and gender
    const participantGroups = {
      'male_7-8': [],
      'male_9-10': [],
      'male_11-12': [],
      'male_13-14': [],
      'male_15-16': [],
      'male_17-18': [],
      'female_7-8': [],
      'female_9-10': [],
      'female_11-12': [],
      'female_13-14': [],
      'female_15-16': [],
      'female_17-18': []
    };
    
    allParticipants.forEach(p => {
      const birthDate = new Date(p.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const isMale = p.int_geschlecht === 1;
      
      let ageGroup;
      if (age <= 8) ageGroup = '7-8';
      else if (age <= 10) ageGroup = '9-10';
      else if (age <= 12) ageGroup = '11-12';
      else if (age <= 14) ageGroup = '13-14';
      else if (age <= 16) ageGroup = '15-16';
      else ageGroup = '17-18';
      
      const groupKey = `${isMale ? 'male' : 'female'}_${ageGroup}`;
      if (participantGroups[groupKey]) {
        participantGroups[groupKey].push({
          id: p.int_teilnehmerid,
          name: `${p.var_vorname} ${p.var_nachname}`,
          age,
          gender: isMale ? 'Male' : 'Female'
        });
      }
    });
    
    console.log('\\n📊 Participant distribution:');
    Object.keys(participantGroups).forEach(key => {
      if (participantGroups[key].length > 0) {
        console.log(`  ${key}: ${participantGroups[key].length} participants`);
      }
    });
    
    // Get competitions for Event 87
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      orderBy: { int_wettkaempfeid: 'asc' }
    });
    
    console.log('\\n🏆 Assigning participants to competitions...');
    
    let totalAssigned = 0;
    
    for (const comp of competitions) {
      const targetCount = targetDistribution[comp.int_wettkaempfeid] || 0;
      
      if (targetCount === 0) {
        console.log(`  ${comp.var_name}: Skipping (no target count)`);
        continue;
      }
      
      // Determine age group and gender from competition name
      let ageGroup, isMaleComp;
      if (comp.var_name.includes('(7-8Jahre)')) ageGroup = '7-8';
      else if (comp.var_name.includes('(9-10Jahre)')) ageGroup = '9-10';
      else if (comp.var_name.includes('(11-12Jahre)')) ageGroup = '11-12';
      else if (comp.var_name.includes('(13-14Jahre)')) ageGroup = '13-14';
      else if (comp.var_name.includes('(15-16Jahre)')) ageGroup = '15-16';
      else if (comp.var_name.includes('(17-18Jahre)')) ageGroup = '17-18';
      
      isMaleComp = comp.var_name.includes(' m ');
      
      const groupKey = `${isMaleComp ? 'male' : 'female'}_${ageGroup}`;
      const sourcePool = participantGroups[groupKey];
      
      if (!sourcePool || sourcePool.length === 0) {
        console.log(`  ${comp.var_name}: No participants available for ${groupKey}`);
        continue;
      }
      
      // Take the required number of participants
      const participantsToAssign = sourcePool.splice(0, Math.min(targetCount, sourcePool.length));
      
      console.log(`  ${comp.var_name}: Assigning ${participantsToAssign.length} participants (target: ${targetCount})`);
      
      // Create wertungen for these participants
      for (const participant of participantsToAssign) {
        await prisma.tfx_wertungen.create({
          data: {
            int_wettkaempfeid: comp.int_wettkaempfeid,
            int_teilnehmerid: participant.id,
            int_statusid: 2 // "Meldung erfasst"
          }
        });
        totalAssigned++;
      }
    }
    
    console.log(`\\n✅ Successfully assigned ${totalAssigned} participants!`);
    
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

assignParticipantsToEvent87();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAvailableParticipants() {
  try {
    console.log('🔍 Looking for participants to assign to Event 87...');
    
    // First, let's see what participants are suitable for gymnastics competitions
    // by looking at participants from similar age ranges
    const participants = await prisma.tfx_teilnehmer.findMany({
      where: {
        // Look for participants with reasonable birth dates for gymnastics
        dat_geburtstag: {
          gte: new Date('2005-01-01'), // Born after 2005 (would be max 19 years old)
          lte: new Date('2017-12-31')  // Born before 2018 (would be min 7 years old)
        }
      },
      orderBy: [
        { int_geschlecht: 'asc' }, // Group by gender
        { dat_geburtstag: 'desc' }  // Then by age
      ],
      take: 100 // Just get first 100 to see the distribution
    });
    
    console.log(`Found ${participants.length} potential participants:`);
    
    // Group by age and gender
    const groups = {};
    participants.forEach(p => {
      const birthDate = new Date(p.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const gender = p.int_geschlecht === 1 ? 'Male' : 'Female';
      
      let ageGroup;
      if (age <= 6) ageGroup = '1-6';
      else if (age <= 8) ageGroup = '7-8';
      else if (age <= 10) ageGroup = '9-10';
      else if (age <= 12) ageGroup = '11-12';
      else if (age <= 14) ageGroup = '13-14';
      else if (age <= 16) ageGroup = '15-16';
      else ageGroup = '17-18';
      
      const key = `${gender} ${ageGroup}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({
        id: p.int_teilnehmerid,
        name: `${p.var_vorname} ${p.var_nachname}`,
        age,
        birthDate: p.dat_geburtstag
      });
    });
    
    console.log('\n📊 Available participants by age/gender:');
    Object.keys(groups).sort().forEach(key => {
      console.log(`  ${key}: ${groups[key].length} participants`);
      // Show first few names as examples
      if (groups[key].length > 0) {
        const examples = groups[key].slice(0, 3).map(p => p.name).join(', ');
        console.log(`    Examples: ${examples}${groups[key].length > 3 ? '...' : ''}`);
      }
    });
    
    // Check if any of these are already assigned to competitions
    const assignedCount = await prisma.tfx_wertungen.count({
      where: {
        int_teilnehmerid: {
          in: participants.map(p => p.int_teilnehmerid)
        }
      }
    });
    
    console.log(`\n📝 ${assignedCount} of these participants are already assigned to competitions`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findAvailableParticipants();

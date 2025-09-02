const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugParticipantAges() {
  console.log('🔍 Debugging participant ages and competition matching...');
  
  try {
    // Get sample participants from event 91
    const participants = await prisma.tfx_wertungen.findMany({
      where: {
        tfx_wettkaempfe: {
          tfx_veranstaltungen: {
            int_veranstaltungenid: 91
          }
        }
      },
      select: {
        int_teilnehmerid: true,
        tfx_teilnehmer: {
          select: {
            int_teilnehmerid: true,
            var_vorname: true,
            var_nachname: true,
            dat_geburtstag: true,
            int_geschlecht: true
          }
        }
      },
      take: 10 // Just first 10 for debugging
    });

    console.log('\n📊 Sample participant data:');
    for (const participant of participants) {
      const birthDate = participant.tfx_teilnehmer.dat_geburtstag;
      const eventDate = new Date('2025-09-02'); // Event date
      
      let age = null;
      if (birthDate) {
        age = eventDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = eventDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
          age--;
        }
      }
      
      console.log(`  👤 ${participant.tfx_teilnehmer.var_vorname} ${participant.tfx_teilnehmer.var_nachname}`);
      console.log(`     Birth: ${birthDate ? birthDate.toISOString().split('T')[0] : 'NULL'}`);
      console.log(`     Age: ${age}`);
      console.log(`     Gender: ${participant.tfx_teilnehmer.int_geschlecht}`);
      console.log('');
    }

    // Get competitions for event 91
    console.log('\n🏆 Available competitions for event 91:');
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        tfx_veranstaltungen: {
          int_veranstaltungenid: 91
        }
      },
      select: {
        int_wettkaempfeid: true,
        var_name: true,
        yer_von: true,
        yer_bis: true,
        int_bereicheid: true
      }
    });

    for (const comp of competitions) {
      console.log(`  🏅 ${comp.var_name} (ID: ${comp.int_wettkaempfeid})`);
      console.log(`     Age range: ${comp.yer_von}-${comp.yer_bis} years`);
      console.log(`     Bereich ID: ${comp.int_bereicheid}`);
      console.log('');
    }

    // Test age calculation for specific birth dates
    console.log('\n🧮 Testing age calculations:');
    const testDates = [
      new Date('2018-01-01'), // Should be ~7 years old
      new Date('2015-01-01'), // Should be ~10 years old
      new Date('2010-01-01'), // Should be ~15 years old
    ];
    
    const eventDate = new Date('2025-09-02');
    for (const birthDate of testDates) {
      let age = eventDate.getFullYear() - birthDate.getFullYear();
      const monthDiff = eventDate.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
        age--;
      }
      console.log(`  Birth: ${birthDate.toISOString().split('T')[0]} → Age: ${age}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugParticipantAges();

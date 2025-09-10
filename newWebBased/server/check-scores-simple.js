const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScores() {
  try {
    console.log('Checking existing scores in the database...');
    
    // Check for participants with name "Michael Blüm"
    const participants = await prisma.tfx_teilnehmer.findMany({
      where: {
        OR: [
          { var_vorname: { contains: 'Michael' } },
          { var_nachname: { contains: 'Blüm' } }
        ]
      },
      select: {
        int_teilnehmerid: true,
        var_vorname: true,
        var_nachname: true
      }
    });

    console.log('Found participants with Michael/Blüm:', participants);

    // Check wertungen for these participants
    if (participants.length > 0) {
      for (const participant of participants) {
        console.log(`\nChecking wertungen for ${participant.var_vorname} ${participant.var_nachname} (ID: ${participant.int_teilnehmerid})`);
        
        const wertungen = await prisma.tfx_wertungen.findMany({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid
          }
        });

        console.log(`Found ${wertungen.length} wertungen for this participant`);
        
        // Check wertungen_details for these wertungen
        for (const wertung of wertungen) {
          const details = await prisma.tfx_wertungen_details.findMany({
            where: {
              int_wertungenid: wertung.int_wertungenid
            },
            include: {
              tfx_disziplinen: {
                select: {
                  var_name: true
                }
              }
            }
          });

          console.log(`  Wertung ID ${wertung.int_wertungenid} has ${details.length} details:`);
          details.forEach(detail => {
            console.log(`    - Discipline: ${detail.tfx_disziplinen?.var_name || 'Unknown'}, Score: ${detail.rel_leistung}, Attempt: ${detail.int_versuch}`);
          });
        }
      }
    }

    // Check what's in the wertungen table generally
    const totalWertungen = await prisma.tfx_wertungen.count();
    console.log(`\nTotal wertungen in database: ${totalWertungen}`);
    
    const totalWertungenDetails = await prisma.tfx_wertungen_details.count();
    console.log(`Total wertungen_details in database: ${totalWertungenDetails}`);

    // Check specific discipline "Boden"
    const bodenDisciplines = await prisma.tfx_disziplinen.findMany({
      where: {
        var_name: { contains: 'Boden' }
      }
    });

    console.log('\nBoden disciplines found:', bodenDisciplines);

  } catch (error) {
    console.error('Error checking scores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScores();

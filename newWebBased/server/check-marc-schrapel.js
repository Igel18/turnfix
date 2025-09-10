const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMarcSchrapel() {
  try {
    console.log('Looking for Marc Schrapel in the database...');
    
    // Find Marc Schrapel
    const marc = await prisma.tfx_teilnehmer.findMany({
      where: {
        OR: [
          { var_vorname: { contains: 'Marc' } },
          { var_nachname: { contains: 'Schrapel' } }
        ]
      }
    });

    console.log('Found participants:', marc);

    if (marc.length > 0) {
      for (const participant of marc) {
        console.log(`\nChecking wertungen for ${participant.var_vorname} ${participant.var_nachname} (ID: ${participant.int_teilnehmerid})`);
        
        const wertungen = await prisma.tfx_wertungen.findMany({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid
          },
          select: {
            int_wertungenid: true,
            bol_startet_nicht: true,
            int_statusid: true,
            var_comment: true,
            tfx_status: {
              select: {
                var_name: true
              }
            }
          }
        });

        console.log(`Found ${wertungen.length} wertungen:`);
        wertungen.forEach(w => {
          console.log(`  - Wertung ID: ${w.int_wertungenid}, startet_nicht: ${w.bol_startet_nicht}, Status: ${w.tfx_status?.var_name}, Comment: ${w.var_comment}`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMarcSchrapel();

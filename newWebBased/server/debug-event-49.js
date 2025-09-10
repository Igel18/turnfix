const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  console.log('=== Database Investigation ===');
  
  try {
    // Check total wertungen count
    const totalWertungen = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tfx_wertungen
    `;
    console.log('Total wertungen in database:', Number(totalWertungen[0].count));
    
    // Check if table has any data at all
    const sampleWertungen = await prisma.$queryRaw`
      SELECT * FROM tfx_wertungen LIMIT 5
    `;
    console.log('Sample wertungen data:', sampleWertungen);
    
    // Check participants with names from screenshot
    const participantsFromScreenshot = await prisma.$queryRaw`
      SELECT int_teilnehmerid, var_vorname, var_nachname 
      FROM tfx_teilnehmer 
      WHERE var_vorname IN ('Frieda', 'Emma', 'Magdalena')
      LIMIT 10
    `;
    console.log('Participants with names from screenshot:', participantsFromScreenshot);
    
    // Check total participants
    const totalParticipants = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tfx_teilnehmer
    `;
    console.log('Total participants in database:', Number(totalParticipants[0].count));
    
    // Check events and their basic info
    const allEvents = await prisma.$queryRaw`
      SELECT int_veranstaltungenid, var_name, dat_anfang, dat_ende 
      FROM tfx_veranstaltungen 
      ORDER BY int_veranstaltungenid DESC 
      LIMIT 10
    `;
    console.log('Recent events:', allEvents);
    
    // Check if there's a different table or structure for participants
    // Look for any tables that might contain participant assignments
    try {
      const mannschaftenData = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM tfx_mannschaften
      `;
      console.log('Mannschaften (teams) count:', Number(mannschaftenData[0].count));
      
      const sampleMannschaften = await prisma.$queryRaw`
        SELECT * FROM tfx_mannschaften LIMIT 5
      `;
      console.log('Sample mannschaften data:', sampleMannschaften);
    } catch (error) {
      console.log('tfx_mannschaften table might not exist or be accessible');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();

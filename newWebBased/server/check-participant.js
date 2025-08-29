const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParticipant() {
  try {
    // Check participant 1563 who has the score for discipline 68
    const participant1563 = await prisma.tfx_teilnehmer.findFirst({
      where: { int_teilnehmerid: 1563 }
    });
    
    console.log('Participant 1563:', participant1563 ? { 
      id: participant1563.int_teilnehmerid, 
      name: participant1563.var_vorname + ' ' + participant1563.var_nachname
    } : 'Not found');
    
    // Check scores for participant 1563
    const scores1563 = await prisma.$queryRawUnsafe(`
      SELECT w.int_teilnehmerid as participantId, wd.int_disziplinenid as disciplineId, wd.rel_leistung as score
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 49 AND w.int_teilnehmerid = 1563
    `);
    
    console.log('Scores for participant 1563:', scores1563);
    
    // Check which participants are in mGelb squad and have scores for event 49
    console.log('\\nChecking which participants have the score 13.9 for discipline 68...');
    const participantsWithScore = await prisma.$queryRawUnsafe(`
      SELECT w.int_teilnehmerid as participantId, wd.int_disziplinenid as disciplineId, wd.rel_leistung as score,
             t.var_vorname, t.var_nachname
      FROM tfx_wertungen w
      LEFT JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
      LEFT JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = 49 AND wd.int_disziplinenid = 68 AND wd.rel_leistung = 13.9
    `);
    
    console.log('Participants with score 13.9 for discipline 68:', participantsWithScore);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkParticipant();

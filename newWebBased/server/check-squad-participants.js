const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSquadParticipants() {
  try {
    console.log('Checking participants for squad "mGelb" in event 49...\n');
    
    // Get all participants for the event using the same query as the working API
    const eventParticipants = await prisma.$queryRaw`
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        v.var_name as verein_name,
        w.var_riege as squad_name
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = 49
      ORDER BY w.var_riege, t.var_nachname, t.var_vorname
    `;

    console.log('All participants in event 49:');
    eventParticipants.forEach(p => {
      console.log(`ID: ${p.int_teilnehmerid}, Name: ${p.var_vorname} ${p.var_nachname}, Squad: ${p.squad_name || 'NULL'}, Club: ${p.verein_name || 'NULL'}`);
    });

    console.log('\n--- Filtering for squad "mGelb" ---\n');
    
    const mGelbParticipants = eventParticipants.filter(p => p.squad_name === 'mGelb');
    console.log(`Found ${mGelbParticipants.length} participants in squad "mGelb":`);
    mGelbParticipants.forEach(p => {
      console.log(`ID: ${p.int_teilnehmerid}, Name: ${p.var_vorname} ${p.var_nachname}, Club: ${p.verein_name || 'NULL'}`);
    });

    // Check specific participant 1289 that frontend is looking for
    console.log('\n--- Checking participant 1289 ---\n');
    const participant1289 = eventParticipants.find(p => p.int_teilnehmerid === 1289);
    if (participant1289) {
      console.log(`Participant 1289 found: ${participant1289.var_vorname} ${participant1289.var_nachname}, Squad: ${participant1289.squad_name || 'NULL'}`);
    } else {
      console.log('Participant 1289 NOT found in event 49');
    }

    // Check specific participant 1563 that has the score
    console.log('\n--- Checking participant 1563 ---\n');
    const participant1563 = eventParticipants.find(p => p.int_teilnehmerid === 1563);
    if (participant1563) {
      console.log(`Participant 1563 found: ${participant1563.var_vorname} ${participant1563.var_nachname}, Squad: ${participant1563.squad_name || 'NULL'}`);
      
      // Check scores for participant 1563 (use the working scores API query)
      const scores1563 = await prisma.$queryRaw`
        SELECT DISTINCT
          w.int_teilnehmerid as participantId,
          wxd.int_disziplinid as disciplineId,
          wd.dec_wert as score
        FROM tfx_wertungen w
        INNER JOIN tfx_wertungen_details wd ON w.int_wertungid = wd.int_wertungid
        INNER JOIN tfx_wertungen_x_disziplinen wxd ON w.int_wertungid = wxd.int_wertungid
        WHERE w.int_teilnehmerid = 1563
      `;
      
      console.log(`Scores for participant 1563: ${JSON.stringify(scores1563)}`);
    } else {
      console.log('Participant 1563 NOT found in event 49');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSquadParticipants();

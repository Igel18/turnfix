// Simple test of the event-participants endpoint logic
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEndpoint() {
  try {
    const eventId = "4"; // Test with event ID 4
    
    console.log(`[DEBUG] Event Participants API called!`);
    console.log(`[DEBUG] eventId=${eventId}`);
    
    if (!eventId) {
      console.log('Would return: { eventParticipants: [] }');
      return;
    }

    // Test the query
    let eventParticipantsQuery = `
      SELECT DISTINCT
        t.int_teilnehmerid,
        t.var_vorname,
        t.var_nachname,
        t.int_vereineid,
        t.int_geschlecht,
        t.dat_geburtstag,
        t.int_startpassnummer,
        v.var_name as verein_name,
        w.var_riege as squad_name,
        w.bol_startet_nicht,
        w.int_startnummer,
        w.int_wertungenid,
        CASE 
          WHEN t.int_geschlecht = 1 THEN 'male'
          WHEN t.int_geschlecht = 2 THEN 'female'
          ELSE 'other'
        END as gender,
        CASE 
          WHEN t.dat_geburtstag IS NOT NULL THEN 
            EXTRACT(YEAR FROM AGE(t.dat_geburtstag))
          ELSE NULL
        END as age,
        CURRENT_DATE::TEXT as registration_date
      FROM tfx_teilnehmer t
      LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
      INNER JOIN tfx_wertungen w ON t.int_teilnehmerid = w.int_teilnehmerid
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1`;
    
    let queryParams = [parseInt(eventId)];
    
    eventParticipantsQuery += `
      GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
               t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, v.var_name, w.var_riege, w.bol_startet_nicht, w.int_startnummer, w.int_wertungenid
      ORDER BY t.var_nachname ASC, t.var_vorname ASC
    `;

    const eventParticipants = await prisma.$queryRawUnsafe(eventParticipantsQuery, ...queryParams);

    console.log(`Found ${(eventParticipants as any[]).length} participants`);

    const response = {
      participants: eventParticipants,
      eventId: parseInt(eventId),
      totalInEvent: (eventParticipants as any[]).length
    };
    
    console.log('Would return response:');
    console.log(JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Error in endpoint:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();

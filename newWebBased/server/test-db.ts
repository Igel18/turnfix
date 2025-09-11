import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('Testing database connection...');
    
    const query = `
      SELECT 
        v.int_veranstaltungenid as int_eventid,
        v.var_name as var_eventname,
        v.dat_von as dat_eventstartdate,
        v.dat_bis as dat_eventenddate,
        v.var_veranstalter as var_location,
        COALESCE(v.txt_hinweise, '') as var_description,
        v.dat_meldeschluss,
        v.int_wettkampforteid,
        v.int_ansprechpartner,
        v.int_meldung_an,
        v.int_kampfrichter,
        v.int_helfer,
        v.int_edv,
        v.txt_hinweise
      FROM tfx_veranstaltungen v
      WHERE v.int_veranstaltungenid = $1
    `;

    const events = await prisma.$queryRawUnsafe(query, 35);
    console.log('Query result:', events);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();

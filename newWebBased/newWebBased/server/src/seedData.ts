import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedData() {
  try {
    // Add test clubs
    const clubs = await prisma.tfx_vereine.createMany({
      data: [
        {
          var_name: 'Turnverein Stuttgart',
          var_website: 'https://www.tv-stuttgart.de',
          int_gaueid: 1,
          int_start_ort: 0
        },
        {
          var_name: 'Gymnastikverein München',
          var_website: 'https://www.gv-muenchen.de',
          int_gaueid: 2,
          int_start_ort: 0
        },
        {
          var_name: 'Turnclub Berlin',
          var_website: 'https://www.tc-berlin.de',
          int_gaueid: 3,
          int_start_ort: 0
        },
        {
          var_name: 'Sportverein Hamburg',
          var_website: 'https://www.sv-hamburg.de',
          int_gaueid: 4,
          int_start_ort: 0
        },
        {
          var_name: 'Turngemeinschaft Köln',
          var_website: 'https://www.tg-koeln.de',
          int_gaueid: 1,
          int_start_ort: 0
        }
      ],
      skipDuplicates: true
    });

    console.log(`Created ${clubs.count} clubs`);

    // Get club IDs for participants
    const clubIds = await prisma.tfx_vereine.findMany({
      select: { int_vereineid: true },
      take: 5
    });

    // Add test participants
    const participants = await prisma.tfx_teilnehmer.createMany({
      data: [
        {
          var_nachname: 'Müller',
          var_vorname: 'Anna',
          dat_geburtsdatum: new Date('2010-05-15'),
          var_geschlecht: 'W',
          int_vereineid: clubIds[0]?.int_vereineid || 1,
          int_jahrgangmin: 2009,
          int_jahrgangmax: 2011
        },
        {
          var_nachname: 'Schmidt',
          var_vorname: 'Max',
          dat_geburtsdatum: new Date('2008-08-22'),
          var_geschlecht: 'M',
          int_vereineid: clubIds[1]?.int_vereineid || 1,
          int_jahrgangmin: 2007,
          int_jahrgangmax: 2009
        },
        {
          var_nachname: 'Weber',
          var_vorname: 'Lisa',
          dat_geburtsdatum: new Date('2012-03-10'),
          var_geschlecht: 'W',
          int_vereineid: clubIds[0]?.int_vereineid || 1,
          int_jahrgangmin: 2011,
          int_jahrgangmax: 2013
        },
        {
          var_nachname: 'Fischer',
          var_vorname: 'Tom',
          dat_geburtsdatum: new Date('2009-11-05'),
          var_geschlecht: 'M',
          int_vereineid: clubIds[2]?.int_vereineid || 1,
          int_jahrgangmin: 2008,
          int_jahrgangmax: 2010
        },
        {
          var_nachname: 'Wagner',
          var_vorname: 'Emma',
          dat_geburtsdatum: new Date('2011-07-18'),
          var_geschlecht: 'W',
          int_vereineid: clubIds[3]?.int_vereineid || 1,
          int_jahrgangmin: 2010,
          int_jahrgangmax: 2012
        },
        {
          var_nachname: 'Becker',
          var_vorname: 'Paul',
          dat_geburtsdatum: new Date('2007-12-03'),
          var_geschlecht: 'M',
          int_vereineid: clubIds[4]?.int_vereineid || 1,
          int_jahrgangmin: 2006,
          int_jahrgangmax: 2008
        }
      ],
      skipDuplicates: true
    });

    console.log(`Created ${participants.count} participants`);

    // Add test gaue (regions)
    const gaue = await prisma.tfx_gaue.createMany({
      data: [
        { int_gaueid: 1, var_name: 'Baden-Württemberg' },
        { int_gaueid: 2, var_name: 'Bayern' },
        { int_gaueid: 3, var_name: 'Berlin' },
        { int_gaueid: 4, var_name: 'Hamburg' },
        { int_gaueid: 5, var_name: 'Nordrhein-Westfalen' }
      ],
      skipDuplicates: true
    });

    console.log(`Created ${gaue.count} regions`);

    console.log('✅ Seed data created successfully');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

export default seedData;

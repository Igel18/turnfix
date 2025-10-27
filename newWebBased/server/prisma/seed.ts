import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  console.log('⚠️  Note: This seed file is designed for legacy TurnFix database schema');

  // Note: The legacy database uses tfx_* table names
  // This seed file is disabled by default to avoid conflicts with existing data
  // Uncomment and modify the sections below if you need to seed data

  /*
  // Example: Create a sample club (tfx_vereine)
  const sampleClub = await prisma.tfx_vereine.upsert({
    where: { int_vereineid: 1 },
    update: {},
    create: {
      var_name: 'Gymnastics Club Berlin',
      var_kurzname: 'GCB',
      var_strasse: 'Gymnastics Street 1',
      var_plz: '10115',
      var_ort: 'Berlin',
      var_email: 'info@gcb.de',
      int_gauid: 1,
    },
  });

  console.log('🏢 Created sample club:', sampleClub.var_name);

  // Example: Create a sample participant (tfx_teilnehmer)
  const sampleParticipant = await prisma.tfx_teilnehmer.create({
    data: {
      var_vorname: 'Anna',
      var_nachname: 'Schmidt',
      dat_geburtsdatum: new Date('2010-05-15'),
      int_geschlecht: 2, // 1=male, 2=female
      int_vereineid: sampleClub.int_vereineid,
    },
  });

  console.log('🤸‍♀️ Created sample participant:', `${sampleParticipant.var_vorname} ${sampleParticipant.var_nachname}`);

  // Example: Create a sample event (tfx_veranstaltungen)
  const sampleEvent = await prisma.tfx_veranstaltungen.create({
    data: {
      var_name: 'Berlin Open Championship 2024',
      dat_beginn: new Date('2024-09-15'),
      dat_ende: new Date('2024-09-15'),
      var_ort: 'Berlin Sports Hall',
    },
  });

  console.log('🏆 Created sample event:', sampleEvent.var_name);

  // Example: Create sample disciplines (tfx_disziplinen)
  const disciplines = [
    { var_name: 'Floor Exercise', var_kurzname: 'FX', int_versuche: 1 },
    { var_name: 'Vault', var_kurzname: 'VT', int_versuche: 2 },
    { var_name: 'Uneven Bars', var_kurzname: 'UB', int_versuche: 1 },
    { var_name: 'Balance Beam', var_kurzname: 'BB', int_versuche: 1 },
  ];

  for (const discipline of disciplines) {
    await prisma.tfx_disziplinen.create({
      data: discipline,
    });
  }

  console.log('📋 Created sample disciplines');
  */

  console.log('✅ Seed file executed (no data created - legacy database in use)');
  console.log('💡 Tip: Use the existing database data or uncomment examples above to seed');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

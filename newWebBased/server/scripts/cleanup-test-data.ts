/**
 * One-time cleanup script to remove accumulated test data from the production database.
 * 
 * This script removes records that were created by integration tests that didn't
 * have proper afterEach cleanup. It identifies test data by known test values:
 * 
 * - Clubs named "Test Gymnastics Club", "New Test Club", "Club To Delete"
 * - Associations (Gaue) named "Test Gymnastics Association", "New Test Association", "Association To Delete"
 * - Participants with firstName "Test" or "John" + lastName "Participant" or "Doe" or "ToDelete"
 * - Disciplines named "Test Floor Exercise" or "New Test Discipline"
 * - Events named containing "Test Event"
 * - Venues named "Test Venue"
 * 
 * Usage: npx ts-node scripts/cleanup-test-data.ts [--dry-run]
 * 
 * Use --dry-run to see what would be deleted without actually deleting.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData(dryRun: boolean) {
  console.log(dryRun ? '🔍 DRY RUN — showing what would be deleted:\n' : '🧹 Cleaning up test data from production database...\n');

  // 1. Delete test scores/wertungen referencing test competitions
  const testCompetitions = await prisma.tfx_wettkaempfe.findMany({
    where: {
      var_name: { contains: 'Test' }
    },
    select: { int_wettkaempfeid: true, var_name: true }
  });
  if (testCompetitions.length > 0) {
    console.log(`📋 Test competitions found: ${testCompetitions.length}`);
    testCompetitions.forEach(c => console.log(`   - [${c.int_wettkaempfeid}] ${c.var_name}`));
    if (!dryRun) {
      const wertungenDeleted = await prisma.tfx_wertungen.deleteMany({
        where: { int_wettkaempfeid: { in: testCompetitions.map(c => c.int_wettkaempfeid) } }
      });
      console.log(`   Deleted ${wertungenDeleted.count} test wertungen`);
      const competitionsDeleted = await prisma.tfx_wettkaempfe.deleteMany({
        where: { int_wettkaempfeid: { in: testCompetitions.map(c => c.int_wettkaempfeid) } }
      });
      console.log(`   Deleted ${competitionsDeleted.count} test competitions`);
    }
  }

  // 2. Delete test events
  const testEvents = await prisma.tfx_veranstaltungen.findMany({
    where: {
      var_name: { contains: 'Test Event' }
    },
    select: { int_veranstaltungenid: true, var_name: true }
  });
  if (testEvents.length > 0) {
    console.log(`\n📋 Test events found: ${testEvents.length}`);
    testEvents.forEach(e => console.log(`   - [${e.int_veranstaltungenid}] ${e.var_name}`));
    if (!dryRun) {
      const deleted = await prisma.tfx_veranstaltungen.deleteMany({
        where: { int_veranstaltungenid: { in: testEvents.map(e => e.int_veranstaltungenid) } }
      });
      console.log(`   Deleted ${deleted.count} test events`);
    }
  }

  // 3. Delete test participants
  const testParticipants = await prisma.tfx_teilnehmer.findMany({
    where: {
      OR: [
        { var_vorname: 'Test', var_nachname: 'Participant' },
        { var_vorname: 'John', var_nachname: 'Doe' },
        { var_vorname: 'Jane', var_nachname: 'Smith' },
        { var_vorname: 'ToDelete', var_nachname: 'Participant' },
        { var_vorname: 'Updated John', var_nachname: { startsWith: 'Doe' } },
        { var_vorname: 'Updated John', var_nachname: { startsWith: 'Updated' } },
      ]
    },
    select: { int_teilnehmerid: true, var_vorname: true, var_nachname: true }
  });
  if (testParticipants.length > 0) {
    console.log(`\n📋 Test participants found: ${testParticipants.length}`);
    testParticipants.forEach(p => console.log(`   - [${p.int_teilnehmerid}] ${p.var_vorname} ${p.var_nachname}`));
    if (!dryRun) {
      // First delete any wertungen referencing these participants
      await prisma.tfx_wertungen.deleteMany({
        where: { int_teilnehmerid: { in: testParticipants.map(p => p.int_teilnehmerid) } }
      }).catch(() => {});
      const deleted = await prisma.tfx_teilnehmer.deleteMany({
        where: { int_teilnehmerid: { in: testParticipants.map(p => p.int_teilnehmerid) } }
      });
      console.log(`   Deleted ${deleted.count} test participants`);
    }
  }

  // 4. Delete test disciplines
  const testDisciplines = await prisma.tfx_disziplinen.findMany({
    where: {
      OR: [
        { var_name: { contains: 'Test Floor' } },
        { var_name: { contains: 'New Test Discipline' } },
        { var_name: 'Test Discipline' },
      ]
    },
    select: { int_disziplinenid: true, var_name: true }
  });
  if (testDisciplines.length > 0) {
    console.log(`\n📋 Test disciplines found: ${testDisciplines.length}`);
    testDisciplines.forEach(d => console.log(`   - [${d.int_disziplinenid}] ${d.var_name}`));
    if (!dryRun) {
      // Delete discipline fields first
      await prisma.tfx_disziplinen_felder.deleteMany({
        where: { int_disziplinenid: { in: testDisciplines.map(d => d.int_disziplinenid) } }
      }).catch(() => {});
      const deleted = await prisma.tfx_disziplinen.deleteMany({
        where: { int_disziplinenid: { in: testDisciplines.map(d => d.int_disziplinenid) } }
      });
      console.log(`   Deleted ${deleted.count} test disciplines`);
    }
  }

  // 5. Delete test clubs
  const testClubs = await prisma.tfx_vereine.findMany({
    where: {
      OR: [
        { var_name: 'Test Gymnastics Club' },
        { var_name: 'New Test Club' },
        { var_name: 'Club To Delete' },
        { var_name: 'Updated Test Club' },
      ]
    },
    select: { int_vereineid: true, var_name: true }
  });
  if (testClubs.length > 0) {
    console.log(`\n📋 Test clubs found: ${testClubs.length}`);
    testClubs.forEach(c => console.log(`   - [${c.int_vereineid}] ${c.var_name}`));
    if (!dryRun) {
      // First move any participants from these clubs to avoid FK errors
      // (or delete test participants first — we already did that above)
      const deleted = await prisma.tfx_vereine.deleteMany({
        where: { int_vereineid: { in: testClubs.map(c => c.int_vereineid) } }
      });
      console.log(`   Deleted ${deleted.count} test clubs`);
    }
  }

  // 6. Delete test associations (Gaue)
  const testAssociations = await prisma.tfx_gaue.findMany({
    where: {
      OR: [
        { var_name: 'Test Gymnastics Association' },
        { var_name: 'New Test Association' },
        { var_name: 'Association To Delete' },
        { var_name: 'Updated Test Association' },
      ]
    },
    select: { int_gaueid: true, var_name: true }
  });
  if (testAssociations.length > 0) {
    console.log(`\n📋 Test associations found: ${testAssociations.length}`);
    testAssociations.forEach(a => console.log(`   - [${a.int_gaueid}] ${a.var_name}`));
    if (!dryRun) {
      const deleted = await prisma.tfx_gaue.deleteMany({
        where: { int_gaueid: { in: testAssociations.map(a => a.int_gaueid) } }
      });
      console.log(`   Deleted ${deleted.count} test associations`);
    }
  }

  // 7. Delete test venues
  const testVenues = await prisma.tfx_wettkampforte.findMany({
    where: {
      OR: [
        { var_name: 'Test Venue' },
        { var_name: 'Test Sports Hall' },
        { var_name: 'GPS Venue' },
      ]
    },
    select: { int_wettkampforteid: true, var_name: true }
  });
  if (testVenues.length > 0) {
    console.log(`\n📋 Test venues found: ${testVenues.length}`);
    testVenues.forEach(v => console.log(`   - [${v.int_wettkampforteid}] ${v.var_name}`));
    if (!dryRun) {
      const deleted = await prisma.tfx_wettkampforte.deleteMany({
        where: { int_wettkampforteid: { in: testVenues.map(v => v.int_wettkampforteid) } }
      });
      console.log(`   Deleted ${deleted.count} test venues`);
    }
  }

  console.log(dryRun ? '\n✅ Dry run complete. No data was deleted.' : '\n✅ Cleanup complete!');
}

const dryRun = process.argv.includes('--dry-run');
cleanupTestData(dryRun)
  .catch(console.error)
  .finally(() => prisma.$disconnect());

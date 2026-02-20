/**
 * GymNet Database Import — Inserts extracted GymNet data into the TurnFix database.
 *
 * Responsible for:
 *   - Club insertion/update (tfx_vereine)
 *   - Participant insertion/update (tfx_teilnehmer)
 *   - Competition insertion/update (tfx_wettkaempfe)
 *   - Participant→Event assignment (tfx_wertungen)
 *   - Discipline linking (tfx_wettkaempfe_x_disziplinen) — precise + name-based fallback
 *   - Team creation (tfx_mannschaften, tfx_man_x_teilnehmer)
 *
 * This module receives already-extracted data from gymnetXmlParser.ts
 * and performs all database operations.
 *
 * Extracted from events.ts as part of SoC refactoring.
 */

import prisma from '../lib/prisma';
import { wedDisNrToTurnFixId, getDisciplinesForCompetition } from './gymnetMapping';
import { resolveBereich } from './competitionHelpers';
import type { ExtractedData } from './gymnetXmlParser';

// ============================================================================
// Types
// ============================================================================

export interface InsertionResults {
  clubs: { inserted: number; updated: number; errors: number };
  participants: { inserted: number; updated: number; errors: number };
  competitions: { inserted: number; updated: number; errors: number };
  devices: { inserted: number; updated: number; errors: number };
  teams: { inserted: number; members: number; errors: number };
}

export interface ImportWarning {
  competition: string;
  waNr: string | null;
  xmlDisciplines: number;
  expectedDisciplines: number | null;
  message: string;
}

export interface ImportResult {
  insertionResults: InsertionResults;
  warnings: ImportWarning[];
}

// Bereich (gender area) resolution uses shared helper from competitionHelpers.ts

// ============================================================================
// 1. Club Insertion
// ============================================================================

async function importClubs(
  clubs: any[],
  results: InsertionResults
): Promise<void> {
  console.log('🏢 Processing clubs...');
  for (const club of clubs) {
    try {
      if (!club.name || club.name.trim() === '') {
        console.log('  ⚠️ Skipping club with empty name');
        continue;
      }

      const existingClub = await prisma.$queryRawUnsafe(`
        SELECT int_vereineid FROM tfx_vereine 
        WHERE LOWER(var_name) = LOWER($1)
        LIMIT 1
      `, club.name.trim());

      if ((existingClub as any[]).length > 0) {
        await prisma.$queryRawUnsafe(`
          UPDATE tfx_vereine SET var_name = $1 WHERE int_vereineid = $2
        `, club.name.trim(), (existingClub as any[])[0].int_vereineid);
        results.clubs.updated++;
        console.log(`  ✅ Updated club: ${club.name}`);
      } else {
        await prisma.$queryRawUnsafe(`
          INSERT INTO tfx_vereine (var_name, int_gaueid) VALUES ($1, $2)
        `, club.name.trim(), 1);
        results.clubs.inserted++;
        console.log(`  ✅ Inserted club: ${club.name}`);
      }
    } catch (error) {
      console.log(`  ❌ Error processing club ${club.name}:`, error);
      results.clubs.errors++;
    }
  }
}

// ============================================================================
// 2. Participant Insertion
// ============================================================================

async function importParticipants(
  participants: any[],
  results: InsertionResults
): Promise<void> {
  console.log('👥 Processing participants...');
  for (const participant of participants) {
    try {
      if (!participant.firstName && !participant.lastName) {
        console.log('  ⚠️ Skipping participant with no name');
        continue;
      }

      const firstName = participant.firstName?.trim() || '';
      const lastName = participant.lastName?.trim() || '';

      // Get club ID
      let clubId = null;
      if (participant.club) {
        const clubResult = await prisma.$queryRawUnsafe(`
          SELECT int_vereineid FROM tfx_vereine 
          WHERE LOWER(var_name) = LOWER($1) LIMIT 1
        `, participant.club.trim());
        if ((clubResult as any[]).length > 0) {
          clubId = (clubResult as any[])[0].int_vereineid;
        }
      }

      // Parse birth date
      let birthDate: string | null = null;
      if (participant.birthDate) {
        try {
          let date: Date;
          const birthDateStr = participant.birthDate.toString();
          if (birthDateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = birthDateStr.split('.');
            date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
          } else {
            date = new Date(participant.birthDate);
          }
          if (!isNaN(date.getTime())) {
            birthDate = date.toISOString().split('T')[0];
          }
        } catch {
          console.log(`  ⚠️ Invalid birth date for ${firstName} ${lastName}: ${participant.birthDate}`);
        }
      }

      // Determine gender
      let gender = 1;
      if (participant.gender) {
        if (participant.gender === '2' || participant.gender === 2) {
          gender = 2;
        } else if (participant.gender === '1' || participant.gender === 1) {
          gender = 1;
        } else {
          gender = participant.gender.toLowerCase() === 'w' || participant.gender.toLowerCase() === 'f' ? 2 : 1;
        }
      }

      // Check if participant exists
      const existingParticipant = await prisma.$queryRawUnsafe(`
        SELECT int_teilnehmerid, dat_geburtstag FROM tfx_teilnehmer 
        WHERE LOWER(var_vorname) = LOWER($1) 
          AND LOWER(var_nachname) = LOWER($2)
          AND (
            (dat_geburtstag IS NULL AND $3::text IS NULL) OR
            (dat_geburtstag IS NOT NULL AND $3::text IS NOT NULL AND dat_geburtstag = $3::date) OR
            (dat_geburtstag IS NULL AND $3::text IS NOT NULL)
          )
        LIMIT 1
      `, firstName, lastName, birthDate);

      if ((existingParticipant as any[]).length > 0) {
        const participantId = (existingParticipant as any[])[0].int_teilnehmerid;
        if (birthDate) {
          await prisma.$queryRawUnsafe(`
            UPDATE tfx_teilnehmer 
            SET var_vorname = $1, var_nachname = $2, dat_geburtstag = $3::date, 
                int_vereineid = COALESCE($4, int_vereineid), int_geschlecht = $5
            WHERE int_teilnehmerid = $6
          `, firstName, lastName, birthDate, clubId, gender, participantId);
        } else {
          await prisma.$queryRawUnsafe(`
            UPDATE tfx_teilnehmer 
            SET var_vorname = $1, var_nachname = $2, dat_geburtstag = NULL, 
                int_vereineid = COALESCE($3, int_vereineid), int_geschlecht = $4
            WHERE int_teilnehmerid = $5
          `, firstName, lastName, clubId, gender, participantId);
        }
        results.participants.updated++;
        console.log(`  ✅ Updated participant: ${firstName} ${lastName}`);
      } else {
        if (!clubId) {
          console.log(`  ⚠️ Skipping participant ${firstName} ${lastName}: No valid club ID`);
          results.participants.errors++;
          continue;
        }
        if (birthDate) {
          await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
            VALUES ($1, $2, $3::date, $4, $5)
          `, firstName, lastName, birthDate, clubId, gender);
        } else {
          await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_teilnehmer (var_vorname, var_nachname, dat_geburtstag, int_vereineid, int_geschlecht)
            VALUES ($1, $2, NULL, $3, $4)
          `, firstName, lastName, clubId, gender);
        }
        results.participants.inserted++;
        console.log(`  ✅ Inserted participant: ${firstName} ${lastName}`);
      }
    } catch (error) {
      const name = `${participant.firstName || ''} ${participant.lastName || ''}`.trim();
      console.log(`  ❌ Error processing participant ${name}:`, error);
      results.participants.errors++;
    }
  }
}

// ============================================================================
// 3. Competition Insertion
// ============================================================================

async function importCompetitions(
  competitions: any[],
  eventId: number,
  eventYear: number,
  teams: any[],
  results: InsertionResults
): Promise<void> {
  console.log('🏆 Processing competitions...');

  for (const competition of competitions) {
    try {
      if (!competition.name || competition.name.trim() === '') {
        console.log('  ⚠️ Skipping competition with empty name');
        continue;
      }

      const gender = competition.gender || 'mixed';

      // Convert ages to birth years (DB stores birth years, not ages)
      let birthYearFrom: number | null = null;
      let birthYearTo: number | null = null;

      if (competition.ageInfo?.min && competition.ageInfo.min > 0) {
        birthYearFrom = eventYear - competition.ageInfo.min;
      }
      if (competition.ageInfo?.max && competition.ageInfo.max > 0 && competition.ageInfo.max < 999) {
        birthYearTo = eventYear - competition.ageInfo.max;
      }

      if (!birthYearFrom && !birthYearTo) {
        birthYearFrom = eventYear - 1;
        birthYearTo = eventYear - 100;
      } else if (!birthYearFrom && birthYearTo) {
        birthYearFrom = eventYear - 1;
      } else if (birthYearFrom && !birthYearTo) {
        birthYearTo = eventYear - 100;
      }

      const bereich = await resolveBereich(prisma, { gender });
      const bereichId = bereich.int_bereicheid;
      const isTeamCompetition = (competition.teamInfo?.max > 1) ||
        teams.some((t: any) => t.competitionNumber === (competition.waNr || competition.number));
      const competitionType = isTeamCompetition ? 1 : 0;

      const existingCompetition = await prisma.$queryRawUnsafe(`
        SELECT int_wettkaempfeid FROM tfx_wettkaempfe 
        WHERE int_veranstaltungenid = $1 AND LOWER(var_name) = LOWER($2)
        LIMIT 1
      `, eventId, competition.name.trim());

      if ((existingCompetition as any[]).length > 0) {
        await prisma.$queryRawUnsafe(`
          UPDATE tfx_wettkaempfe 
          SET var_name = $1, yer_von = $2, yer_bis = $3, int_bereicheid = $4, var_nummer = $5, int_typ = $6
          WHERE int_wettkaempfeid = $7
        `, competition.name.trim(), birthYearFrom, birthYearTo, bereichId,
          competition.waNr || competition.number || null, competitionType,
          (existingCompetition as any[])[0].int_wettkaempfeid);
        results.competitions.updated++;
        console.log(`  ✅ Updated: ${competition.name} (Type: ${isTeamCompetition ? 'Mannschaft' : 'Einzel'})`);
      } else {
        await prisma.$queryRawUnsafe(`
          INSERT INTO tfx_wettkaempfe (int_veranstaltungenid, int_bereicheid, var_name, yer_von, yer_bis, var_nummer, int_typ)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, eventId, bereichId, competition.name.trim(), birthYearFrom, birthYearTo,
          competition.waNr || competition.number || null, competitionType);
        results.competitions.inserted++;
        console.log(`  ✅ Inserted: ${competition.name} (Type: ${isTeamCompetition ? 'Mannschaft' : 'Einzel'})`);
      }
    } catch (error) {
      console.log(`  ❌ Error processing competition ${competition.name}:`, error);
      results.competitions.errors++;
    }
  }
}

// ============================================================================
// 3.5. Participant → Event Assignment
// ============================================================================

async function assignParticipantsToEvent(
  participants: any[],
  eventId: number,
  results: InsertionResults
): Promise<void> {
  console.log(`🔗 Assigning ${participants.length} participants to event...`);
  let assignedCount = 0;

  for (const participant of participants) {
    try {
      const firstName = participant.firstName?.trim() || '';
      const lastName = participant.lastName?.trim() || '';
      if (!firstName || !lastName) continue;

      const participantResult = await prisma.$queryRawUnsafe(`
        SELECT int_teilnehmerid FROM tfx_teilnehmer 
        WHERE var_vorname = $1 AND var_nachname = $2 
        ORDER BY int_teilnehmerid DESC LIMIT 1
      `, firstName, lastName);

      if ((participantResult as any[]).length === 0) {
        console.log(`    ❌ Participant ${firstName} ${lastName} not found in database`);
        continue;
      }

      const participantId = (participantResult as any[])[0].int_teilnehmerid;

      // Find target competition by XML waNr
      let targetCompetition = null;
      if (participant.competitionNumber) {
        const competitionNumber = typeof participant.competitionNumber === 'object'
          ? participant.competitionNumber.waNr
          : participant.competitionNumber;

        targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
          where: { int_veranstaltungenid: eventId, var_nummer: competitionNumber }
        });
      }

      // Fallback to first competition
      if (!targetCompetition) {
        targetCompetition = await prisma.tfx_wettkaempfe.findFirst({
          where: { int_veranstaltungenid: eventId },
          orderBy: { int_wettkaempfeid: 'asc' }
        });
      }

      if (!targetCompetition) continue;

      const existingEntry = await prisma.tfx_wertungen.findFirst({
        where: { int_teilnehmerid: participantId, int_wettkaempfeid: targetCompetition.int_wettkaempfeid }
      });

      if (!existingEntry) {
        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: participantId,
            int_wettkaempfeid: targetCompetition.int_wettkaempfeid,
            int_startnummer: 0,
            var_riege: '',
            int_statusid: 1
          }
        });
        assignedCount++;
        results.participants.updated++;
      }
    } catch (error) {
      console.error(`    ❌ Failed to assign participant ${participant.firstName} ${participant.lastName}:`, error);
    }
  }

  console.log(`🎯 Participant assignment complete: ${assignedCount}/${participants.length} assigned`);
}

// ============================================================================
// 4. Discipline Linking
// ============================================================================

async function linkDisciplines(
  extractedData: ExtractedData,
  eventId: number,
  results: InsertionResults,
  warnings: ImportWarning[]
): Promise<void> {
  console.log('🤸 Starting comprehensive discipline processing...');

  const eventCompetitions = await prisma.$queryRawUnsafe(`
    SELECT int_wettkaempfeid, var_name, var_nummer FROM tfx_wettkaempfe 
    WHERE int_veranstaltungenid = $1
  `, eventId) as any[];

  console.log(`  📊 Found ${eventCompetitions.length} competitions for this event`);

  // Group devices by competition waNr
  const devicesByCompetition = new Map<string, any[]>();
  for (const device of extractedData.devices) {
    if (device.competitionWaNr) {
      const key = String(device.competitionWaNr);
      if (!devicesByCompetition.has(key)) devicesByCompetition.set(key, []);
      devicesByCompetition.get(key)!.push(device);
    }
  }

  console.log(`  📋 Devices grouped by competition: ${devicesByCompetition.size} competitions have device data`);
  devicesByCompetition.forEach((devices, waNr) => {
    console.log(`    waNr=${waNr}: ${devices.map((d: any) => `${d.name || 'unnamed'}(code=${d.code || 'none'})`).join(', ')}`);
  });

  let linkedCount = 0;

  for (const competition of eventCompetitions) {
    const compWaNr = competition.var_nummer || null;
    const compDevices = compWaNr ? devicesByCompetition.get(String(compWaNr)) : null;

    console.log(`  🔍 Processing competition: "${competition.var_name}" (waNr: ${compWaNr || 'none'})`);

    if (compDevices && compDevices.length > 0) {
      // === PRECISE MATCHING: Use wedDisNr from XML devices ===
      console.log(`    📦 Found ${compDevices.length} devices from XML for this competition`);

      let sortOrder = 0;
      for (const device of compDevices) {
        sortOrder++;
        const wedDisNr = device.code;
        if (!wedDisNr) {
          console.log(`    ⚠️ Device "${device.name}" has no wedDisNr code, skipping`);
          continue;
        }

        const turnfixId = wedDisNrToTurnFixId(wedDisNr);
        if (turnfixId === null) {
          console.log(`    ⚠️ No TurnFix mapping for wedDisNr=${wedDisNr} ("${device.name}")`);
          results.devices.errors++;
          continue;
        }

        const disciplineCheck = await prisma.$queryRawUnsafe(`
          SELECT int_disziplinenid, var_name FROM tfx_disziplinen WHERE int_disziplinenid = $1 LIMIT 1
        `, turnfixId) as any[];

        if (disciplineCheck.length === 0) {
          console.log(`    ⚠️ TurnFix discipline ID ${turnfixId} not found in DB`);
          results.devices.errors++;
          continue;
        }

        const disciplineName = disciplineCheck[0].var_name;
        const existingLink = await prisma.$queryRawUnsafe(`
          SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
          WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2 LIMIT 1
        `, competition.int_wettkaempfeid, turnfixId) as any[];

        if (existingLink.length === 0) {
          await prisma.$queryRawUnsafe(`
            INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
            VALUES ($1, $2, $3)
          `, competition.int_wettkaempfeid, turnfixId, sortOrder);
          console.log(`    🔗 Linked "${disciplineName}" (wedDisNr=${wedDisNr} → ID=${turnfixId})`);
          linkedCount++;
          results.devices.updated++;
        } else {
          console.log(`    ✅ "${disciplineName}" already linked`);
        }
      }
    } else {
      // === FALLBACK: Name-based guessing (no XML device data) ===
      console.log(`    ⚠️ No XML device data found, falling back to name-based discipline matching`);
      const disciplinesToLink = await getDisciplinesForCompetition(competition.var_name, prisma);
      console.log(`    📝 Name-based guess: ${disciplinesToLink.join(', ')}`);

      let sortOrder = 0;
      for (const disciplineName of disciplinesToLink) {
        sortOrder++;
        try {
          const existingDiscipline = await prisma.$queryRawUnsafe(`
            SELECT int_disziplinenid FROM tfx_disziplinen WHERE LOWER(var_name) = LOWER($1) LIMIT 1
          `, disciplineName) as any[];

          if (existingDiscipline.length > 0) {
            const disciplineId = existingDiscipline[0].int_disziplinenid;
            const existingLink = await prisma.$queryRawUnsafe(`
              SELECT int_wettkaempfe_x_disziplinenid FROM tfx_wettkaempfe_x_disziplinen 
              WHERE int_wettkaempfeid = $1 AND int_disziplinenid = $2 LIMIT 1
            `, competition.int_wettkaempfeid, disciplineId) as any[];

            if (existingLink.length === 0) {
              await prisma.$queryRawUnsafe(`
                INSERT INTO tfx_wettkaempfe_x_disziplinen (int_wettkaempfeid, int_disziplinenid, int_sortierung)
                VALUES ($1, $2, $3)
              `, competition.int_wettkaempfeid, disciplineId, sortOrder);
              console.log(`    🔗 Linked "${disciplineName}" (name-based)`);
              linkedCount++;
              results.devices.updated++;
            }
          } else {
            console.log(`    ⚠️ Discipline "${disciplineName}" not found in database`);
            results.devices.errors++;
          }
        } catch (linkError) {
          console.log(`    ❌ Error linking discipline ${disciplineName}:`, linkError);
          results.devices.errors++;
        }
      }
    }
  }

  console.log(`  🎯 Discipline linking complete: ${linkedCount} new links created`);
}

// ============================================================================
// 5. Team Creation
// ============================================================================

async function importTeams(
  teams: any[],
  eventId: number,
  results: InsertionResults
): Promise<void> {
  console.log(`🏅 Processing ${teams.length} teams...`);

  const teamCounterByCompClub = new Map<string, number>();

  for (const teamData of teams) {
    try {
      const clubResult = await prisma.$queryRawUnsafe(`
        SELECT int_vereineid FROM tfx_vereine WHERE LOWER(var_name) = LOWER($1) LIMIT 1
      `, teamData.clubName.trim()) as any[];

      if (clubResult.length === 0) {
        console.log(`  ⚠️ Skipping team: Club "${teamData.clubName}" not found`);
        results.teams.errors++;
        continue;
      }
      const clubId = clubResult[0].int_vereineid;

      // Find competition
      let competitionId: number | null = null;
      if (teamData.competitionNumber) {
        const compResult = await prisma.tfx_wettkaempfe.findFirst({
          where: { int_veranstaltungenid: eventId, var_nummer: teamData.competitionNumber }
        });
        if (compResult) competitionId = compResult.int_wettkaempfeid;
      }
      if (!competitionId) {
        const fallbackComp = await prisma.tfx_wettkaempfe.findFirst({
          where: { int_veranstaltungenid: eventId },
          orderBy: { int_wettkaempfeid: 'asc' }
        });
        if (fallbackComp) competitionId = fallbackComp.int_wettkaempfeid;
      }
      if (!competitionId) {
        console.log(`  ⚠️ Skipping team: No competition found for event`);
        results.teams.errors++;
        continue;
      }

      // Team number
      const counterKey = `${competitionId}_${clubId}`;
      const teamNumber = (teamCounterByCompClub.get(counterKey) || 0) + 1;
      teamCounterByCompClub.set(counterKey, teamNumber);

      const existingTeam = await (prisma as any).tfx_mannschaften.findFirst({
        where: { int_wettkaempfeid: competitionId, int_vereineid: clubId, int_nummer: teamNumber }
      });

      let mannschaftId: number;
      if (existingTeam) {
        mannschaftId = existingTeam.int_mannschaftenid;
        console.log(`  📝 Team already exists: ${teamData.clubName} #${teamNumber}`);
      } else {
        const newTeam = await (prisma as any).tfx_mannschaften.create({
          data: {
            int_wettkaempfeid: competitionId,
            int_vereineid: clubId,
            int_nummer: teamNumber,
            var_riege: '',
            int_startnummer: null
          }
        });
        mannschaftId = newTeam.int_mannschaftenid;
        results.teams.inserted++;
        console.log(`  ✅ Created team: ${teamData.clubName} #${teamNumber} (ID: ${mannschaftId})`);
      }

      // Add members
      for (const member of teamData.participants) {
        try {
          if (!member.firstName || !member.lastName) continue;

          const participantResult = await prisma.$queryRawUnsafe(`
            SELECT int_teilnehmerid FROM tfx_teilnehmer 
            WHERE var_vorname = $1 AND var_nachname = $2 
            ORDER BY int_teilnehmerid DESC LIMIT 1
          `, member.firstName, member.lastName) as any[];

          if (participantResult.length === 0) continue;
          const participantId = participantResult[0].int_teilnehmerid;

          const existingMember = await (prisma as any).tfx_man_x_teilnehmer.findFirst({
            where: { int_mannschaftenid: mannschaftId, int_teilnehmerid: participantId }
          });

          if (!existingMember) {
            await (prisma as any).tfx_man_x_teilnehmer.create({
              data: { int_mannschaftenid: mannschaftId, int_teilnehmerid: participantId }
            });
            results.teams.members++;
            console.log(`    👤 Added member: ${member.firstName} ${member.lastName}`);
          }

          // Link wertung to team
          await prisma.$queryRawUnsafe(`
            UPDATE tfx_wertungen SET int_mannschaftenid = $1
            WHERE int_teilnehmerid = $2 AND int_wettkaempfeid = $3 
              AND (int_mannschaftenid IS NULL OR int_mannschaftenid = 0)
          `, mannschaftId, participantId, competitionId);
        } catch (memberError) {
          console.log(`    ❌ Error adding member ${member.firstName} ${member.lastName}:`, memberError);
        }
      }
    } catch (teamError) {
      console.log(`  ❌ Error creating team for ${teamData.clubName}:`, teamError);
      results.teams.errors++;
    }
  }

  console.log(`  🏅 Team import complete: ${results.teams.inserted} teams, ${results.teams.members} members`);
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Import all extracted GymNet data into the database.
 *
 * @param extractedData The data extracted from the GymNet XML
 * @param eventId       The ID of the newly created event in the database
 * @param eventYear     The year of the event (for age→birth year conversion)
 * @returns Import results and any warnings
 */
export async function importGymnetData(
  extractedData: ExtractedData,
  eventId: number,
  eventYear: number
): Promise<ImportResult> {
  console.log('💾 Starting database insertion process...');

  const results: InsertionResults = {
    clubs: { inserted: 0, updated: 0, errors: 0 },
    participants: { inserted: 0, updated: 0, errors: 0 },
    competitions: { inserted: 0, updated: 0, errors: 0 },
    devices: { inserted: 0, updated: 0, errors: 0 },
    teams: { inserted: 0, members: 0, errors: 0 }
  };

  const warnings: ImportWarning[] = [];

  // 1. Clubs
  await importClubs(extractedData.clubs, results);

  // 2. Participants
  await importParticipants(extractedData.participants, results);

  // 3. Competitions
  await importCompetitions(
    extractedData.competitions, eventId, eventYear,
    extractedData.teams, results
  );

  // 3.5. Participant → Event assignment
  if (extractedData.participants.length > 0) {
    await assignParticipantsToEvent(extractedData.participants, eventId, results);
  }

  // 4. Discipline linking
  await linkDisciplines(extractedData, eventId, results, warnings);

  // 5. Teams
  if (extractedData.teams.length > 0) {
    await importTeams(extractedData.teams, eventId, results);
  }

  console.log('💾 Database insertion completed:');
  console.log(`  🏢 Clubs: ${results.clubs.inserted} inserted, ${results.clubs.updated} updated, ${results.clubs.errors} errors`);
  console.log(`  👥 Participants: ${results.participants.inserted} inserted, ${results.participants.updated} updated, ${results.participants.errors} errors`);
  console.log(`  🏆 Competitions: ${results.competitions.inserted} inserted, ${results.competitions.updated} updated, ${results.competitions.errors} errors`);
  console.log(`  🤸 Disciplines: ${results.devices.inserted} inserted, ${results.devices.updated} linked, ${results.devices.errors} errors`);
  console.log(`  🏅 Teams: ${results.teams.inserted} created, ${results.teams.members} members, ${results.teams.errors} errors`);

  return { insertionResults: results, warnings };
}

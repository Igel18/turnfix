import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';
import mutationsRouter, { virtualSquads } from './squadManagementMutations';
import autoAssignRouter from './squadAutoAssign';
import { buildAvailableParticipantsWhereClause } from '../utils/squadHelpers';

const router = Router();

// Mount mutations sub-router (create, assign, unassign, update, delete, complete)
router.use('/', mutationsRouter);

// Mount auto-assign sub-router (generate proposals, apply proposal)
router.use('/', autoAssignRouter);

router.get('/teams', authenticateToken, async (req: AuthRequest, res) => {
  const eventId = Number(req.query.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return res.status(400).json({ message: 'Valid event ID is required' });
  }
  try {
    const teams = await prisma.tfx_mannschaften.findMany({
      where: { tfx_wettkaempfe: { int_veranstaltungenid: eventId } },
      include: {
        tfx_vereine: { select: { var_name: true } },
        tfx_wettkaempfe: { select: { var_name: true, var_nummer: true, tfx_veranstaltungen: { select: { int_runde: true } } } },
        tfx_wertungen: { select: { int_teilnehmerid: true, int_runde: true, var_riege: true, int_wettkaempfeid: true } },
        tfx_man_x_teilnehmer: {
          include: { tfx_teilnehmer: { select: { int_teilnehmerid: true, var_vorname: true, var_nachname: true } } }
        }
      },
      orderBy: { int_mannschaftenid: 'asc' }
    });
    return res.json({
      teams: teams.map(team => ({
        id: team.int_mannschaftenid,
        number: team.int_nummer,
        club: team.tfx_vereine.var_name,
        competition: team.tfx_wettkaempfe.var_name,
        competitionNumber: team.tfx_wettkaempfe.var_nummer,
        squadName: team.var_riege,
        needsSync: team.tfx_wertungen.some(score => score.var_riege !== team.var_riege) ||
          team.tfx_man_x_teilnehmer.some(member => !team.tfx_wertungen.some(score =>
            score.int_teilnehmerid === member.int_teilnehmerid &&
            score.int_wettkaempfeid === team.int_wettkaempfeid &&
            (score.int_runde ?? 1) === (member.int_runde ?? team.tfx_wettkaempfe.tfx_veranstaltungen.int_runde ?? 1)
          )),
        members: team.tfx_man_x_teilnehmer.map(member => ({
          id: member.tfx_teilnehmer.int_teilnehmerid,
          firstname: member.tfx_teilnehmer.var_vorname,
          lastname: member.tfx_teilnehmer.var_nachname
        }))
      }))
    });
  } catch (error) {
    console.error('Error fetching teams for squad management:', error);
    return res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// Get all squads for an event with participants
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    
    console.log(`Squad Management API: eventId=${eventId}`);
    
    if (!eventId || !/^\d+$/.test(eventId) || Number(eventId) <= 0) {
      return res.status(400).json({ message: 'Valid event ID is required' });
    }

    // DEBUG: First check what squads exist in database
    const debugSquadQuery = `
      SELECT DISTINCT w.var_riege, COUNT(*) as count
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND COALESCE(w.bol_startet_nicht, false) = false AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
    `;
    
    const debugResults = await prisma.$queryRawUnsafe(debugSquadQuery, parseInt(eventId));
    console.log(`🔍 DEBUG: Found ${(debugResults as any[]).length} squads in database:`, debugResults);

    // DEBUG: Check participant 237 specifically
    const debugParticipantQuery = `
      SELECT w.int_teilnehmerid, w.var_riege, wk.var_name 
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE w.int_teilnehmerid = 237 AND wk.int_veranstaltungenid = $1
      LIMIT 5
    `;
    
    const debugParticipant = await prisma.$queryRawUnsafe(debugParticipantQuery, parseInt(eventId));
    console.log(`🔍 DEBUG: Participant 237 in event ${eventId}:`, debugParticipant);

    // DEBUG: Get first few actual participants in this event
    const debugActualParticipants = `
      SELECT DISTINCT w.int_teilnehmerid, t.var_vorname, t.var_nachname, w.var_riege
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1 AND COALESCE(w.bol_startet_nicht, false) = false
      LIMIT 5
    `;
    
    const actualParticipants = await prisma.$queryRawUnsafe(debugActualParticipants, parseInt(eventId));
    console.log(`🔍 DEBUG: First 5 actual participants in event ${eventId}:`, actualParticipants);

    // Get all squads (riegen) for this event with participant information
    const squadQuery = `
      SELECT 
        COALESCE(w.var_riege, 'Unassigned') as squad_name,
        COUNT(DISTINCT t.int_teilnehmerid) as participant_count,
        STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as competition_names
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      LEFT JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1 AND COALESCE(w.bol_startet_nicht, false) = false AND w.var_riege IS NOT NULL AND w.var_riege != ''
      GROUP BY w.var_riege
      ORDER BY w.var_riege
    `;

    const squadResults = await prisma.$queryRawUnsafe(squadQuery, parseInt(eventId));

    // Get detailed participants for each squad
    const squads = await Promise.all(
      (squadResults as any[]).map(async (squad) => {
        const participantQuery = `
          SELECT 
            t.int_teilnehmerid,
            t.var_vorname,
            t.var_nachname,
            t.int_vereineid,
            t.int_geschlecht,
            t.dat_geburtstag,
            t.int_startpassnummer,
            MIN(w.int_startnummer) AS int_startnummer,
            v.var_name as verein_name,
            w.var_riege,
            BOOL_AND(w.int_mannschaftenid IS NOT NULL) AS team_only,
            JSONB_AGG(DISTINCT JSONB_BUILD_OBJECT(
              'id', w.int_wertungenid,
              'competitionId', w.int_wettkaempfeid,
              'teamId', w.int_mannschaftenid,
              'squadName', w.var_riege,
              'round', w.int_runde
            )) AS evaluations,
            CASE 
              WHEN t.int_geschlecht = 1 THEN 'male'
              WHEN t.int_geschlecht = 2 THEN 'female'
              ELSE 'other'
            END as gender,
            CASE 
              WHEN t.dat_geburtstag IS NOT NULL THEN 
                EXTRACT(YEAR FROM t.dat_geburtstag)
              ELSE NULL
            END as birth_year,
            STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as assigned_competitions
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
          LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
          WHERE wk.int_veranstaltungenid = $1 AND COALESCE(w.bol_startet_nicht, false) = false AND w.var_riege = $2
          GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
                   t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, 
                   v.var_name, w.var_riege
          ORDER BY MIN(w.int_startnummer) ASC, t.var_nachname ASC, t.var_vorname ASC
        `;

        const participants = await prisma.$queryRawUnsafe(
          participantQuery, 
          parseInt(eventId),
          squad.squad_name
        );

        return {
          id: squad.squad_name, // Use squad name as ID since it's unique per event
          name: squad.squad_name,
          eventId: parseInt(eventId),
          participant_count: Number(squad.participant_count), // snake_case for frontend compatibility
          participantCount: Number(squad.participant_count), // Keep camelCase for backward compatibility
          isVirtual: false,
          competitions: squad.competition_names ? squad.competition_names.split(', ') : [],
          participants: (participants as any[]).map(p => ({
            id: Number(p.int_teilnehmerid),
            firstname: p.var_vorname,
            lastname: p.var_nachname,
            club: p.verein_name || 'Unknown Club',
            clubId: p.int_vereineid ? Number(p.int_vereineid) : 0,
            gender: p.gender,
            birthYear: p.birth_year ? Number(p.birth_year) : null,
            startNumber: p.int_startnummer ? Number(p.int_startnummer) : null,
            squadId: squad.squad_name,
            squadName: squad.squad_name,
            teamOnly: p.team_only,
            evaluations: p.evaluations,
            // Transform competition strings to objects with id, name, number
            competitions: p.assigned_competitions 
              ? p.assigned_competitions.split(', ').map((comp: string) => {
                  if (comp.includes(':') && comp.includes('|')) {
                    const [idPart, nameAndNumber] = comp.split(':');
                    const [name, number] = nameAndNumber.split('|');
                    return {
                      id: parseInt(idPart),
                      name: name,
                      number: number === 'No Number' ? '' : number
                    };
                  }
                  return { id: 0, name: comp, number: '' };
                })
              : []
          }))
        };
      })
    );

    const teamSquads = await prisma.tfx_mannschaften.findMany({
      where: {
        tfx_wettkaempfe: { int_veranstaltungenid: parseInt(eventId) },
        var_riege: { not: null }
      },
      select: { var_riege: true }
    });
    for (const team of teamSquads) {
      if (team.var_riege && !squads.some(s => s.name === team.var_riege)) {
        squads.push({
          id: team.var_riege,
          name: team.var_riege,
          eventId: parseInt(eventId),
          participant_count: 0,
          participantCount: 0,
          competitions: [],
          participants: [],
          isVirtual: false
        });
      }
    }

    // Add virtual squads for this event (created but with no participants)
    const virtualSquadsForEvent = Array.from(virtualSquads.values())
      .filter(vs => vs.eventId === parseInt(eventId))
      .filter(vs => !squads.some(s => s.name === vs.name)) // Don't add if already exists with participants
      .map(vs => ({
        id: vs.name,
        name: vs.name,
        eventId: vs.eventId,
        participantCount: 0,
        competitions: [],
        participants: [],
        isVirtual: true,
        createdAt: vs.createdAt,
        hints: {
          storage: 'Stored in memory only',
          status: 'Virtual squad - assign participants to save to database',
          warning: 'Will be lost on server restart if no participants assigned'
        }
      }));

    const allSquads = [...squads, ...virtualSquadsForEvent];

    console.log(`Returning ${allSquads.length} squads for event ${eventId} (${squads.length} with participants, ${virtualSquadsForEvent.length} virtual)`);

    res.json({
      squads: allSquads,
      eventId: parseInt(eventId),
      totalSquads: allSquads.length,
      databaseSquads: squads.length,
      virtualSquads: virtualSquadsForEvent.length,
      hints: {
        virtual: 'Virtual squads are temporarily stored in memory',
        database: 'Database squads are permanently stored and have participants',
        action: 'Assign participants to virtual squads to save them permanently'
      }
    });

  } catch (error) {
    console.error('Error fetching squads:', error);
    res.status(500).json({ message: 'Failed to fetch squads' });
  }
});

// Get available participants (not assigned to any squad for this event)
router.get('/available-participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.eventId as string;
    const includeAvailable = req.query.includeAvailable === 'true';
    
    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    console.log(`Squad Management API: eventId=${eventId}, includeAvailable=${includeAvailable}`);

    // Get participants based on includeAvailable parameter
    let availableParticipantsQuery: string;
    let queryParams: any[];
    
    if (includeAvailable) {
      // Get all participants from the system for potential squad assignment
      availableParticipantsQuery = `
        SELECT 
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          t.int_vereineid,
          t.int_geschlecht,
          t.dat_geburtstag,
          t.int_startpassnummer,
          v.var_name as verein_name,
          '' as competitions,
          0 as competition_count,
          CASE 
            WHEN t.int_geschlecht = 1 THEN 'male'
            WHEN t.int_geschlecht = 2 THEN 'female'
            ELSE 'other'
          END as gender,
          CASE 
            WHEN t.dat_geburtstag IS NOT NULL THEN 
              EXTRACT(YEAR FROM t.dat_geburtstag)
            ELSE NULL
          END as birth_year
        FROM tfx_teilnehmer t
        LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
        WHERE NOT EXISTS (
          SELECT 1
          FROM tfx_wertungen w
          INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
          WHERE wk.int_veranstaltungenid = $1
            AND w.int_teilnehmerid = t.int_teilnehmerid
            AND COALESCE(w.bol_startet_nicht, false) = true
        )
        ORDER BY t.var_nachname ASC, t.var_vorname ASC
      `;
      queryParams = [parseInt(eventId)];
    } else {
      // Get participants registered for the event but not assigned to any squad
      // FIX: Use NOT EXISTS subquery to exclude participants who have ANY squad
      // assignment in the event. The old row-level WHERE filter missed participants
      // registered in multiple competitions where only some rows had a squad.
      availableParticipantsQuery = `
        SELECT 
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          t.int_vereineid,
          t.int_geschlecht,
          t.dat_geburtstag,
          t.int_startpassnummer,
          v.var_name as verein_name,
          STRING_AGG(DISTINCT CONCAT(wk.int_wettkaempfeid, ':', wk.var_name, '|', COALESCE(wk.var_nummer, 'No Number')), ', ') as competitions,
          COUNT(DISTINCT wk.int_wettkaempfeid) as competition_count,
          CASE 
            WHEN t.int_geschlecht = 1 THEN 'male'
            WHEN t.int_geschlecht = 2 THEN 'female'
            ELSE 'other'
          END as gender,
          CASE 
            WHEN t.dat_geburtstag IS NOT NULL THEN 
              EXTRACT(YEAR FROM t.dat_geburtstag)
            ELSE NULL
          END as birth_year
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
        LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
        WHERE w.int_mannschaftenid IS NULL AND ${buildAvailableParticipantsWhereClause()}
        GROUP BY t.int_teilnehmerid, t.var_vorname, t.var_nachname, t.int_vereineid, 
                 t.int_geschlecht, t.dat_geburtstag, t.int_startpassnummer, v.var_name
        ORDER BY t.var_nachname ASC, t.var_vorname ASC
      `;
      queryParams = [parseInt(eventId)];
    }

    const availableParticipants = await prisma.$queryRawUnsafe(availableParticipantsQuery, ...queryParams);

    const formattedParticipants = (availableParticipants as any[]).map(participant => {
      // Parse competition data with numbers
      const competitions = participant.competitions ? 
        participant.competitions.split(', ').map((comp: string) => {
          const [idAndName, number] = comp.split('|');
          const [id, name] = idAndName.split(':');
          return { 
            id: Number(id), 
            name: name || '', 
            number: number || 'No Number'
          };
        }) : [];

      // Calculate age from birthdate
      let age = null;
      if (participant.dat_geburtstag) {
        const birthDate = new Date(participant.dat_geburtstag);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        id: Number(participant.int_teilnehmerid),
        firstname: participant.var_vorname,
        lastname: participant.var_nachname,
        club: participant.verein_name || 'Unknown Club',
        clubId: participant.int_vereineid ? Number(participant.int_vereineid) : 0,
        gender: participant.gender,
        birthdate: participant.dat_geburtstag,
        birthYear: participant.birth_year ? Number(participant.birth_year) : null,
        age: age,
        squadId: undefined,
        squadName: undefined,
        competitions: competitions,
        competitionCount: Number(participant.competition_count) || 0,
        competitionNames: competitions.map((c: { id: number, name: string }) => c.name).join(', ')
      };
    });

    console.log(`Returning ${formattedParticipants.length} available participants for event ${eventId}`);

    res.json({
      participants: formattedParticipants,
      eventId: parseInt(eventId),
      totalAvailable: formattedParticipants.length
    });

  } catch (error) {
    console.error('Error fetching available participants:', error);
    res.status(500).json({ message: 'Failed to fetch available participants' });
  }
});

export default router;

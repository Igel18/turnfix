/**
 * Squad Auto-Assignment Route
 * 
 * Generates proposals for automatic squad assignment (Riegeneinteilung).
 * Considers: gender separation, club grouping, age categories, squad size limits,
 * and break/pause support.
 * 
 * Squad naming: gender prefix + color abbreviation (max 5 chars for DB VarChar(5))
 * Examples: "wGlb" (weiblich gelb), "mRot" (männlich rot), "gBlau" (gemischt blau)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';

const router = Router();

// ── Color palette for squad naming (abbreviations ≤ 4 chars to fit with prefix in 5 chars) ──
const SQUAD_COLORS = [
  { name: 'Rot', abbr: 'Rot' },
  { name: 'Blau', abbr: 'Blau' },
  { name: 'Grün', abbr: 'Grn' },
  { name: 'Gelb', abbr: 'Glb' },
  { name: 'Schwarz', abbr: 'Schw' },
  { name: 'Weiß', abbr: 'Weiß' },
  { name: 'Lila', abbr: 'Lila' },
  { name: 'Orange', abbr: 'Oran' },
  { name: 'Rosa', abbr: 'Rosa' },
  { name: 'Grau', abbr: 'Grau' },
  { name: 'Türkis', abbr: 'Türk' },
  { name: 'Braun', abbr: 'Brn' },
  { name: 'Mint', abbr: 'Mint' },
  { name: 'Sand', abbr: 'Sand' },
  { name: 'Navy', abbr: 'Navy' },
  { name: 'Rubin', abbr: 'Rbn' },
  { name: 'Gold', abbr: 'Gold' },
  { name: 'Silber', abbr: 'Slbr' },
  { name: 'Kupfer', abbr: 'Kpfr' },
  { name: 'Jade', abbr: 'Jade' },
];

// Gender prefixes for squad naming
const GENDER_PREFIX: Record<string, string> = {
  male: 'm',
  female: 'w',
  mixed: 'g',
};

// ── Validation schema ──
const autoAssignSchema = z.object({
  eventId: z.number().int().positive(),
  maxParticipantsPerSquad: z.number().int().min(2).max(50).default(12),
  separateGenders: z.boolean().default(true),
  keepClubsTogether: z.boolean().default(true),
  groupByAgeCategory: z.boolean().default(false),
  ageCategoryRanges: z.string().optional().default('6-8,9-10,11-12,13-14,15-18'),
  numberOfProposals: z.number().int().min(1).max(10).default(3),
  namingPrefix: z.enum(['gender', 'number', 'none']).default('gender'),
  breakCount: z.number().int().min(0).max(10).default(0),
  keepExistingSquads: z.boolean().default(false),
});

const applyProposalSchema = z.object({
  eventId: z.number().int().positive(),
  squads: z.array(z.object({
    name: z.string().min(1).max(5),
    participantIds: z.array(z.number().int().positive()),
  })),
  clearExisting: z.boolean().default(true),
});

// ── Participant type for internal use ──
interface AutoAssignParticipant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female' | 'other';
  age: number | null;
  birthYear: number | null;
}

// ── Proposed squad ──
interface ProposedSquad {
  name: string;
  colorName: string;
  genderGroup: string;
  ageCategory: string | null;
  participants: AutoAssignParticipant[];
  isBreak: boolean;
}

// ── Proposal ──
interface Proposal {
  id: number;
  squads: ProposedSquad[];
  stats: {
    totalSquads: number;
    totalParticipants: number;
    avgParticipantsPerSquad: number;
    minParticipantsPerSquad: number;
    maxParticipantsPerSquad: number;
    breakSquads: number;
    genderDistribution: Record<string, number>;
  };
}

/**
 * Fetch existing squad assignments for an event.
 * Returns a map of squad name → participant IDs and a set of assigned participant IDs.
 */
async function fetchExistingSquadAssignments(eventId: number): Promise<{
  existingSquads: Map<string, Set<number>>;
  assignedParticipantIds: Set<number>;
  existingSquadNames: Set<string>;
}> {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT w.var_riege, w.int_teilnehmerid
    FROM tfx_wertungen w
    INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    WHERE wk.int_veranstaltungenid = $1
      AND w.var_riege IS NOT NULL
      AND w.var_riege != ''
      AND w.int_teilnehmerid IS NOT NULL
  `, eventId);

  const existingSquads = new Map<string, Set<number>>();
  const assignedParticipantIds = new Set<number>();
  const existingSquadNames = new Set<string>();

  for (const row of rows) {
    const squadName = row.var_riege as string;
    const participantId = Number(row.int_teilnehmerid);
    existingSquadNames.add(squadName);
    assignedParticipantIds.add(participantId);
    if (!existingSquads.has(squadName)) existingSquads.set(squadName, new Set());
    existingSquads.get(squadName)!.add(participantId);
  }

  return { existingSquads, assignedParticipantIds, existingSquadNames };
}

/**
 * Fetch all participants for an event (those with wertungen entries).
 * Only returns distinct participants regardless of how many wertungen they have.
 * If excludeAssigned is true, only returns participants without squad assignments.
 */
async function fetchEventParticipants(
  eventId: number,
  excludeAssigned: boolean = false,
  assignedParticipantIds?: Set<number>
): Promise<AutoAssignParticipant[]> {
  const rows: any[] = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT ON (t.int_teilnehmerid)
      t.int_teilnehmerid,
      t.var_vorname,
      t.var_nachname,
      t.int_vereineid,
      t.int_geschlecht,
      t.dat_geburtstag,
      v.var_name AS verein_name
    FROM tfx_wertungen w
    INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    INNER JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
    LEFT JOIN tfx_vereine v ON t.int_vereineid = v.int_vereineid
    WHERE wk.int_veranstaltungenid = $1
    ORDER BY t.int_teilnehmerid
  `, eventId);

  const allParticipants = rows.map(r => {
    let age: number | null = null;
    let birthYear: number | null = null;
    if (r.dat_geburtstag) {
      const bd = new Date(r.dat_geburtstag);
      birthYear = bd.getFullYear();
      const today = new Date();
      age = today.getFullYear() - bd.getFullYear();
      const m = today.getMonth() - bd.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    }
    return {
      id: Number(r.int_teilnehmerid),
      firstname: r.var_vorname || '',
      lastname: r.var_nachname || '',
      club: r.verein_name || '',
      clubId: r.int_vereineid ? Number(r.int_vereineid) : 0,
      gender: r.int_geschlecht === 1 ? 'male' : r.int_geschlecht === 2 ? 'female' : 'other',
      age,
      birthYear,
    } as AutoAssignParticipant;
  });

  // Filter out already-assigned participants when keepExistingSquads is enabled
  if (excludeAssigned && assignedParticipantIds && assignedParticipantIds.size > 0) {
    return allParticipants.filter(p => !assignedParticipantIds.has(p.id));
  }

  return allParticipants;
}

/**
 * Parse age category string "6-8,9-10,11-12" into ranges.
 */
function parseAgeCategoryRanges(rangesStr: string): Array<{ min: number; max: number; label: string }> {
  return rangesStr.split(',').map(r => r.trim()).filter(Boolean).map(range => {
    const [minStr, maxStr] = range.split('-');
    const min = parseInt(minStr, 10);
    const max = parseInt(maxStr, 10);
    return { min, max, label: `${min}-${max}` };
  }).filter(r => !isNaN(r.min) && !isNaN(r.max));
}

/**
 * Get the age category for a participant.
 */
function getAgeCategory(age: number | null, ranges: Array<{ min: number; max: number; label: string }>): string {
  if (age === null) return 'unknown';
  for (const range of ranges) {
    if (age >= range.min && age <= range.max) return range.label;
  }
  return 'other';
}

/**
 * Shuffle array (Fisher-Yates) — returns a new array.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a squad name.
 * @param prefix - 'm', 'w', 'g' (gender) or '' (no prefix)
 * @param colorIndex - index into SQUAD_COLORS
 * @param namingPrefix - 'gender', 'number', 'none'
 * @param squadIndex - 1-based index for number naming
 */
function generateSquadName(
  genderGroup: string,
  colorIndex: number,
  namingPrefix: string,
  squadIndex: number,
): string {
  const color = SQUAD_COLORS[colorIndex % SQUAD_COLORS.length];

  if (namingPrefix === 'number') {
    // e.g. "R01", "R02"
    return `R${String(squadIndex).padStart(2, '0')}`;
  }

  if (namingPrefix === 'none') {
    // Just color abbreviation
    return color.abbr.substring(0, 5);
  }

  // Gender prefix + color: "mRot", "wGlb"
  const prefix = GENDER_PREFIX[genderGroup] || 'g';
  const maxColorLen = 5 - prefix.length;
  return `${prefix}${color.abbr.substring(0, maxColorLen)}`;
}

/**
 * Distribute participants into squads of a given max size.
 * If keepClubsTogether, groups from the same club are kept together.
 * Uses balanced distribution (round-robin) for even squad sizes.
 * Returns array of participant arrays (one per squad).
 */
function distributeIntoSquads(
  participants: AutoAssignParticipant[],
  maxPerSquad: number,
  keepClubsTogether: boolean,
): AutoAssignParticipant[][] {
  if (participants.length === 0) return [];

  // Calculate optimal number of squads for balanced distribution
  const numSquads = Math.ceil(participants.length / maxPerSquad);
  
  if (keepClubsTogether) {
    // Group by club
    const clubGroups = new Map<number, AutoAssignParticipant[]>();
    for (const p of participants) {
      const key = p.clubId || 0;
      if (!clubGroups.has(key)) clubGroups.set(key, []);
      clubGroups.get(key)!.push(p);
    }

    // Sort groups by size descending for better bin-packing
    const groups = Array.from(clubGroups.values()).sort((a, b) => b.length - a.length);

    // Initialize squads
    const squads: AutoAssignParticipant[][] = Array.from({ length: numSquads }, () => []);

    for (const group of groups) {
      if (group.length > maxPerSquad) {
        // If a club group is larger than max, split it across squads
        let remaining = [...group];
        while (remaining.length > 0) {
          // Find the smallest squad that can accept at least some members
          squads.sort((a, b) => a.length - b.length);
          const target = squads[0];
          const spaceAvailable = maxPerSquad - target.length;
          if (spaceAvailable <= 0) {
            // All squads full, create a new one
            const newSquad = remaining.splice(0, maxPerSquad);
            squads.push(newSquad);
          } else {
            const chunk = remaining.splice(0, spaceAvailable);
            target.push(...chunk);
          }
        }
      } else {
        // Try to place the entire club group in the smallest squad that has room
        squads.sort((a, b) => a.length - b.length);
        let placed = false;
        for (const squad of squads) {
          if (squad.length + group.length <= maxPerSquad) {
            squad.push(...group);
            placed = true;
            break;
          }
        }
        if (!placed) {
          // No existing squad has room — add to the smallest squad anyway (may exceed max slightly)
          // or create a new squad if the smallest is already at max
          const smallest = squads[0];
          if (smallest.length >= maxPerSquad) {
            squads.push([...group]);
          } else {
            smallest.push(...group);
          }
        }
      }
    }

    // Remove empty squads
    return squads.filter(s => s.length > 0);
  } else {
    // Balanced round-robin distribution without club grouping
    const squads: AutoAssignParticipant[][] = Array.from({ length: numSquads }, () => []);
    for (let i = 0; i < participants.length; i++) {
      squads[i % numSquads].push(participants[i]);
    }
    return squads.filter(s => s.length > 0);
  }
}

/**
 * Generate a single proposal.
 * @param existingSquadNames - Set of squad names already in use (to avoid conflicts when keepExistingSquads is enabled)
 */
function generateProposal(
  participants: AutoAssignParticipant[],
  options: z.infer<typeof autoAssignSchema>,
  proposalIndex: number,
  existingSquadNames: Set<string> = new Set(),
): Proposal {
  const {
    maxParticipantsPerSquad,
    separateGenders,
    keepClubsTogether,
    groupByAgeCategory,
    ageCategoryRanges,
    namingPrefix,
    breakCount,
  } = options;

  const ageRanges = groupByAgeCategory ? parseAgeCategoryRanges(ageCategoryRanges) : [];

  // Step 1: Group by gender (if separateGenders)
  const genderGroups = new Map<string, AutoAssignParticipant[]>();
  if (separateGenders) {
    for (const p of participants) {
      const g = p.gender === 'male' ? 'male' : p.gender === 'female' ? 'female' : 'mixed';
      if (!genderGroups.has(g)) genderGroups.set(g, []);
      genderGroups.get(g)!.push(p);
    }
  } else {
    genderGroups.set('mixed', [...participants]);
  }

  const allSquads: ProposedSquad[] = [];
  let globalColorIndex = 0;
  let globalSquadIndex = 1;

  for (const [genderGroup, genderParticipants] of genderGroups) {
    // Shuffle for variety between proposals
    const shuffled = shuffle(genderParticipants);

    // Step 2: Sub-group by age category (if enabled)
    const ageGroups = new Map<string, AutoAssignParticipant[]>();
    if (groupByAgeCategory && ageRanges.length > 0) {
      for (const p of shuffled) {
        const cat = getAgeCategory(p.age, ageRanges);
        if (!ageGroups.has(cat)) ageGroups.set(cat, []);
        ageGroups.get(cat)!.push(p);
      }
    } else {
      ageGroups.set(null as any, shuffled);
    }

    for (const [ageCat, ageParticipants] of ageGroups) {
      // Step 3: Distribute into squads
      const squadParticipants = distributeIntoSquads(ageParticipants, maxParticipantsPerSquad, keepClubsTogether);

      for (const squadMembers of squadParticipants) {
        // Generate a unique name that doesn't conflict with existing squads
        let name: string;
        let attempts = 0;
        do {
          name = generateSquadName(genderGroup, globalColorIndex + attempts, namingPrefix, globalSquadIndex + attempts);
          attempts++;
        } while (existingSquadNames.has(name) && attempts < SQUAD_COLORS.length * 2);
        
        // Track the name to avoid duplicates within this proposal too
        existingSquadNames.add(name);
        
        allSquads.push({
          name,
          colorName: SQUAD_COLORS[(globalColorIndex + attempts - 1) % SQUAD_COLORS.length].name,
          genderGroup,
          ageCategory: ageCat || null,
          participants: squadMembers,
          isBreak: false,
        });
        globalColorIndex++;
        globalSquadIndex++;
      }
    }
  }

  // Step 4: Add break squads
  for (let i = 0; i < breakCount; i++) {
    const name = namingPrefix === 'number'
      ? `P${String(i + 1).padStart(2, '0')}`
      : `Paus${i + 1 > 1 ? i + 1 : ''}`.substring(0, 5);
    allSquads.push({
      name,
      colorName: 'Pause',
      genderGroup: 'break',
      ageCategory: null,
      participants: [],
      isBreak: true,
    });
  }

  // Calculate stats
  const nonBreakSquads = allSquads.filter(s => !s.isBreak);
  const participantCounts = nonBreakSquads.map(s => s.participants.length);
  const genderDist: Record<string, number> = {};
  for (const s of nonBreakSquads) {
    genderDist[s.genderGroup] = (genderDist[s.genderGroup] || 0) + 1;
  }

  return {
    id: proposalIndex + 1,
    squads: allSquads,
    stats: {
      totalSquads: allSquads.length,
      totalParticipants: nonBreakSquads.reduce((sum, s) => sum + s.participants.length, 0),
      avgParticipantsPerSquad: participantCounts.length > 0
        ? Math.round((participantCounts.reduce((a, b) => a + b, 0) / participantCounts.length) * 10) / 10
        : 0,
      minParticipantsPerSquad: participantCounts.length > 0 ? Math.min(...participantCounts) : 0,
      maxParticipantsPerSquad: participantCounts.length > 0 ? Math.max(...participantCounts) : 0,
      breakSquads: breakCount,
      genderDistribution: genderDist,
    },
  };
}

// ── POST /auto-assign/generate — Generate proposals ──
router.post('/auto-assign/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const options = autoAssignSchema.parse(req.body);

    // Fetch existing squad assignments if keepExistingSquads is enabled
    let existingSquadNames = new Set<string>();
    let assignedParticipantIds = new Set<number>();
    let existingSquadCount = 0;
    let existingAssignedCount = 0;

    if (options.keepExistingSquads) {
      const existing = await fetchExistingSquadAssignments(options.eventId);
      existingSquadNames = existing.existingSquadNames;
      assignedParticipantIds = existing.assignedParticipantIds;
      existingSquadCount = existing.existingSquads.size;
      existingAssignedCount = existing.assignedParticipantIds.size;
      console.log(`📋 Keep existing: ${existingSquadCount} squads, ${existingAssignedCount} assigned participants`);
    }

    // Fetch participants (excluding already-assigned if keepExistingSquads)
    const participants = await fetchEventParticipants(
      options.eventId,
      options.keepExistingSquads,
      assignedParticipantIds
    );

    // Get total participants count (including assigned) for the response
    const allParticipants = options.keepExistingSquads
      ? await fetchEventParticipants(options.eventId)
      : participants;

    if (participants.length === 0 && !options.keepExistingSquads) {
      return res.status(400).json({
        message: 'No participants found for this event. Please register participants first.',
      });
    }

    if (participants.length === 0 && options.keepExistingSquads) {
      return res.status(400).json({
        message: 'All participants are already assigned to squads. Disable "Keep existing squads" to reassign them.',
      });
    }

    console.log(`🔄 Auto-assign: Generating ${options.numberOfProposals} proposals for ${participants.length} unassigned participants (event ${options.eventId})${options.keepExistingSquads ? ` [keeping ${existingSquadCount} existing squads]` : ''}`);

    const proposals: Proposal[] = [];
    for (let i = 0; i < options.numberOfProposals; i++) {
      // Pass a copy of existingSquadNames so each proposal can track independently
      proposals.push(generateProposal(participants, options, i, new Set(existingSquadNames)));
    }

    res.json({
      proposals,
      eventId: options.eventId,
      totalParticipants: allParticipants.length,
      unassignedParticipants: participants.length,
      existingSquads: existingSquadCount,
      existingAssignedParticipants: existingAssignedCount,
      criteria: {
        maxParticipantsPerSquad: options.maxParticipantsPerSquad,
        separateGenders: options.separateGenders,
        keepClubsTogether: options.keepClubsTogether,
        groupByAgeCategory: options.groupByAgeCategory,
        ageCategoryRanges: options.ageCategoryRanges,
        breakCount: options.breakCount,
        namingPrefix: options.namingPrefix,
        keepExistingSquads: options.keepExistingSquads,
      },
    });
  } catch (error) {
    console.error('Error generating auto-assign proposals:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid criteria', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to generate auto-assign proposals' });
  }
});

// ── POST /auto-assign/apply — Apply a chosen proposal ──
router.post('/auto-assign/apply', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, squads, clearExisting } = applyProposalSchema.parse(req.body);

    console.log(`🚀 Auto-assign: Applying proposal with ${squads.length} squads for event ${eventId} (clearExisting=${clearExisting})`);

    // Step 1: Optionally clear all existing squad assignments for this event
    if (clearExisting) {
      await prisma.$queryRawUnsafe(`
        UPDATE tfx_wertungen
        SET var_riege = NULL
        WHERE int_wettkaempfeid IN (
          SELECT int_wettkaempfeid
          FROM tfx_wettkaempfe
          WHERE int_veranstaltungenid = $1
        )
      `, eventId);
      console.log(`  Cleared all existing squad assignments for event ${eventId}`);
    }

    // Step 2: Assign participants to their new squads
    let totalAssigned = 0;
    for (const squad of squads) {
      if (squad.participantIds.length === 0) continue; // Skip break squads

      for (const participantId of squad.participantIds) {
        await prisma.$queryRawUnsafe(`
          UPDATE tfx_wertungen
          SET var_riege = $3
          WHERE int_teilnehmerid = $1
            AND int_wettkaempfeid IN (
              SELECT int_wettkaempfeid
              FROM tfx_wettkaempfe
              WHERE int_veranstaltungenid = $2
            )
        `, participantId, eventId, squad.name);
        totalAssigned++;
      }
    }

    console.log(`✅ Auto-assign: Applied ${squads.length} squads, assigned ${totalAssigned} participants`);

    res.json({
      success: true,
      message: `Successfully assigned ${totalAssigned} participants to ${squads.length} squads`,
      eventId,
      squadsCreated: squads.length,
      participantsAssigned: totalAssigned,
    });
  } catch (error) {
    console.error('Error applying auto-assign proposal:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid proposal data', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to apply auto-assign proposal' });
  }
});

export default router;

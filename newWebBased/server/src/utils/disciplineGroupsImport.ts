/**
 * Discipline Groups Import Utility
 * 
 * Creates standard discipline groups for the DB Setup Wizard.
 * Groups are defined for P-Wettkampf (Pflicht) and LK (Leistungsklassen)
 * programs, split by gender and apparatus count (4-Kampf, 6-Kampf).
 * 
 * Groups are only created if the tfx_disziplinen_gruppen table is empty.
 * Disciplines are matched by name from tfx_disziplinen, so the production
 * disciplines import must run first.
 */

import prisma from '../db/connection';
import { PrismaClient } from '@prisma/client';
import { isDebug } from './debug';

export interface DisciplineGroupsStats {
  createdGroups: number;
  createdAssignments: number;
  skippedGroups: number;
  missingDisciplines: string[];
  totalGroups: number;
}

/**
 * Discipline group definition.
 * Each group has a name, optional comment, and a list of discipline names
 * that should be assigned to it (with position ordering).
 */
interface GroupDefinition {
  name: string;
  comment?: string;
  disciplines: string[];  // Discipline names as they appear in tfx_disziplinen.var_name
}

/**
 * Standard discipline group definitions.
 * 
 * P-Wettkampf (Pflicht) groups:
 *   4-Kampf = 4 apparatus, 6-Kampf = 6 apparatus (men only)
 * 
 * LK (Leistungsklassen) groups:
 *   LK1, LK2, LK3, LK4 variants for men and women
 */
const STANDARD_GROUPS: GroupDefinition[] = [
  // === P-Wettkampf (Pflicht) Groups ===
  
  // Women 4-Kampf P
  {
    name: '4-Kampf w P',
    comment: 'Weiblicher 4-Kampf P-Wettkampf (Pflicht): Reck/Stufenbarren, Schwebebalken, Sprung, Boden',
    disciplines: [
      'Reck/StuBa. P1-P9',
      'Schwebebalken P1-P9',
      'Sprung w. P1-P9',
      'Boden',   // Fallback: generic Boden if no Boden w. P1-P9 exists
    ],
  },
  
  // Men 4-Kampf P
  {
    name: '4-Kampf m P',
    comment: 'Männlicher 4-Kampf P-Wettkampf (Pflicht): Boden, Reck, Sprung, Barren',
    disciplines: [
      'Reck m. P1-P9',
      'Sprung m. P1-P9',
      'Par.-Barren P1-P9',
      'Boden',   // Fallback: generic Boden if no Boden m. P1-P9 exists
    ],
  },
  
  // Men 6-Kampf P
  {
    name: '6-Kampf m P',
    comment: 'Männlicher 6-Kampf P-Wettkampf (Pflicht): Boden, Reck, Sprung, Barren, Ringe, Pauschenpferd',
    disciplines: [
      'Reck m. P1-P9',
      'Sprung m. P1-P9',
      'Par.-Barren P1-P9',
      'Ringe P1-P9',
      'Pauschenpferd P1-P9',
      'Boden',   // Fallback: generic Boden if no Boden m. P1-P9 exists
    ],
  },
  
  // === LK1 (Leistungsklasse 1) Groups ===
  
  // Men 4-Kampf LK1
  {
    name: '4-Kampf m LK1',
    comment: 'Männlicher 4-Kampf Leistungsklasse 1: Boden, Reck, Sprung, Barren',
    disciplines: [
      'Boden m. LK1',
      'Reck m. LK1',
      'Sprung m. LK1',
      'Par.-Barren LK1',
    ],
  },
  
  // Men 6-Kampf LK1
  {
    name: '6-Kampf m LK1',
    comment: 'Männlicher 6-Kampf Leistungsklasse 1: Boden, Reck, Sprung, Barren, Ringe, Pauschenpferd',
    disciplines: [
      'Boden m. LK1',
      'Reck m. LK1',
      'Sprung m. LK1',
      'Par.-Barren LK1',
      'Ringe LK1',
      'P.-Pferd LK1',
    ],
  },
  
  // === LK2 (Leistungsklasse 2) Groups ===
  
  // Men 4-Kampf LK2
  {
    name: '4-Kampf m LK2',
    comment: 'Männlicher 4-Kampf Leistungsklasse 2: Boden, Reck, Sprung, Barren',
    disciplines: [
      'Boden m. LK2',
      'Reck m. LK2',
      'Sprung m. LK2',
      'Par.-Barren LK2',
    ],
  },
  
  // Men 6-Kampf LK2
  {
    name: '6-Kampf m LK2',
    comment: 'Männlicher 6-Kampf Leistungsklasse 2: Boden, Reck, Sprung, Barren, Ringe, Pauschenpferd',
    disciplines: [
      'Boden m. LK2',
      'Reck m. LK2',
      'Sprung m. LK2',
      'Par.-Barren LK2',
      'Ringe LK2',
      'P.-Pferd LK2',
    ],
  },
  
  // === LK3 (Leistungsklasse 3) Groups ===
  
  // Men 4-Kampf LK3
  {
    name: '4-Kampf m LK3',
    comment: 'Männlicher 4-Kampf Leistungsklasse 3: Boden, Reck, Sprung, Barren',
    disciplines: [
      'Boden m. LK3',
      'Reck m. LK3',
      'Sprung m. LK3',
      'Par.-Barren LK3',
    ],
  },
  
  // Men 6-Kampf LK3
  {
    name: '6-Kampf m LK3',
    comment: 'Männlicher 6-Kampf Leistungsklasse 3: Boden, Reck, Sprung, Barren, Ringe, Pauschenpferd',
    disciplines: [
      'Boden m. LK3',
      'Reck m. LK3',
      'Sprung m. LK3',
      'Par.-Barren LK3',
      'Ringe LK3',
      'P.-Pferd LK3',
    ],
  },
  
  // === LK4 (Leistungsklasse 4) Groups — Male ===
  
  // Men 4-Kampf LK4
  {
    name: '4-Kampf m LK4',
    comment: 'Männlicher 4-Kampf Leistungsklasse 4: Boden, Reck, Sprung, Barren',
    disciplines: [
      'Boden m. LK4',
      'Reck m. LK4',
      'Sprung m. LK4',
      'Par.-Barren LK4',
    ],
  },
  
  // Men 6-Kampf LK4
  {
    name: '6-Kampf m LK4',
    comment: 'Männlicher 6-Kampf Leistungsklasse 4: Boden, Reck, Sprung, Barren, Ringe, Pauschenpferd',
    disciplines: [
      'Boden m. LK4',
      'Reck m. LK4',
      'Sprung m. LK4',
      'Par.-Barren LK4',
      'Ringe LK4',
      'P.-Pferd LK4',
    ],
  },
  
  // === Female LK (Leistungsklassen) Groups ===
  
  // Women 4-Kampf LK1
  {
    name: '4-Kampf w LK1',
    comment: 'Weiblicher 4-Kampf Leistungsklasse 1: Sprung, Reck/Stufenbarren, Schwebebalken, Boden',
    disciplines: [
      'Sprung w. LK1',
      'Reck/StuBa. LK1',
      'Schwebebalken LK1',
      'Boden w. LK1',
    ],
  },
  
  // Women 4-Kampf LK2
  {
    name: '4-Kampf w LK2',
    comment: 'Weiblicher 4-Kampf Leistungsklasse 2: Sprung, Reck/Stufenbarren, Schwebebalken, Boden',
    disciplines: [
      'Sprung w. LK2',
      'Reck/StuBa. LK2',
      'Schwebebalken LK2',
      'Boden w. LK2',
    ],
  },
  
  // Women 4-Kampf LK3
  {
    name: '4-Kampf w LK3',
    comment: 'Weiblicher 4-Kampf Leistungsklasse 3: Sprung, Reck/Stufenbarren, Schwebebalken, Boden',
    disciplines: [
      'Sprung w. LK3',
      'Reck/StuBa. LK3',
      'Schwebebalken LK3',
      'Boden w. LK3',
    ],
  },
  
  // Women 4-Kampf LK4
  {
    name: '4-Kampf w LK4',
    comment: 'Weiblicher 4-Kampf Leistungsklasse 4: Sprung, Reck/Stufenbarren, Schwebebalken, Boden',
    disciplines: [
      'Sprung w. LK4',
      'Reck/StuBa. LK4',
      'Schwebebalken LK4',
      'Boden w. LK4',
    ],
  },
];

/**
 * Import standard discipline groups into the database.
 * 
 * Prerequisites: Production disciplines must be imported first 
 * (disciplines are looked up by name).
 * 
 * @param customPrismaClient Optional Prisma client for wizard custom DB connections
 * @returns Import statistics
 */
export async function importDisciplineGroups(
  customPrismaClient?: PrismaClient | null
): Promise<{ success: boolean; stats: DisciplineGroupsStats }> {
  const db = customPrismaClient || prisma;

  const stats: DisciplineGroupsStats = {
    createdGroups: 0,
    createdAssignments: 0,
    skippedGroups: 0,
    missingDisciplines: [],
    totalGroups: STANDARD_GROUPS.length,
  };

  // Check if groups already exist — skip if not empty
  const existingCount = await db.tfx_disziplinen_gruppen.count();
  if (existingCount > 0) {
    console.log(`[DisciplineGroups] Skipping: ${existingCount} groups already exist`);
    stats.skippedGroups = STANDARD_GROUPS.length;
    return { success: true, stats };
  }

  // Load all disciplines into a name → id map for fast lookup
  const allDisciplines = await db.tfx_disziplinen.findMany({
    select: { int_disziplinenid: true, var_name: true },
  });
  const disciplineMap = new Map<string, number>();
  for (const d of allDisciplines) {
    if (d.var_name) {
      disciplineMap.set(d.var_name, d.int_disziplinenid);
    }
  }

  if (isDebug()) {
    console.log(`🔍 DEBUG: Loaded ${disciplineMap.size} disciplines for group matching`);
  }

  if (disciplineMap.size === 0) {
    console.warn('[DisciplineGroups] No disciplines found in database. Import production disciplines first.');
    return {
      success: false,
      stats,
    };
  }

  // Create each group and assign disciplines
  for (const groupDef of STANDARD_GROUPS) {
    // Resolve discipline IDs
    const resolvedDisciplines: { id: number; pos: number }[] = [];
    let pos = 1;

    for (const discName of groupDef.disciplines) {
      const discId = disciplineMap.get(discName);
      if (discId) {
        resolvedDisciplines.push({ id: discId, pos });
        pos++;
      } else {
        // Track missing disciplines for reporting
        const missingKey = `${groupDef.name}: ${discName}`;
        if (!stats.missingDisciplines.includes(missingKey)) {
          stats.missingDisciplines.push(missingKey);
        }
        if (isDebug()) {
          console.log(`🔍 DEBUG: Discipline not found: "${discName}" for group "${groupDef.name}"`);
        }
      }
    }

    // Create the group even if some disciplines are missing
    // (user can add them later in the UI)
    const group = await db.tfx_disziplinen_gruppen.create({
      data: {
        var_name: groupDef.name,
        txt_comment: groupDef.comment || null,
      },
    });
    stats.createdGroups++;

    // Create discipline assignments with position ordering
    for (const disc of resolvedDisciplines) {
      await db.tfx_disgrp_x_disziplinen.create({
        data: {
          int_disziplinen_gruppenid: group.int_disziplinen_gruppenid,
          int_disziplinenid: disc.id,
          int_pos: disc.pos,
        },
      });
      stats.createdAssignments++;
    }

    if (isDebug()) {
      console.log(
        `🔍 DEBUG: Created group "${groupDef.name}" with ${resolvedDisciplines.length}/${groupDef.disciplines.length} disciplines`
      );
    }
  }

  console.log(
    `✅ Discipline groups import complete: ${stats.createdGroups} groups, ${stats.createdAssignments} assignments`
  );
  if (stats.missingDisciplines.length > 0) {
    console.warn(
      `⚠️ Missing disciplines: ${stats.missingDisciplines.join(', ')}`
    );
  }

  return { success: true, stats };
}

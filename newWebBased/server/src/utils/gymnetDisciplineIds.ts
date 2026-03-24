/**
 * Fixed Discipline IDs for the GymNet Preset (DB Wizard)
 * 
 * IMPORTANT: These IDs are explicitly assigned when the DB Wizard creates
 * disciplines in an empty database. They are the SINGLE SOURCE OF TRUTH
 * for all GymNet-related discipline references.
 * 
 * Used by:
 *  - gymnetPreset.ts   → creates disciplines with these IDs
 *  - gymnetMapping.ts  → maps wedDisNr codes to these IDs
 * 
 * ID Scheme:
 *   1-13:  Base apparatus (gender-neutral or gender-specific)
 *  14-20:  Category labels (LK1, LK2, LK3, AK, KM, KM2, KM3)
 *  21-28:  Kür variants (male + female)
 *  31-40:  LK1 (male 31-36, female 37-40)
 *  41-50:  LK2 (male 41-46, female 47-50)
 *  51-60:  LK3 (male 51-56, female 57-60)
 *  61-70:  P-Übung (P1-P9)
 *  71-77:  Turn10
 *  78:     AK devices
 */

export const DISCIPLINE_IDS = {
  // ===================================================================
  // BASE APPARATUS (1-13)
  // These are the generic apparatus devices, used for base DTB codes
  // (200, 210, ..., 290, 630, 915, 916)
  // ===================================================================
  BODEN: 1,              // Boden (m+w)
  PAUSCHENPFERD: 2,      // Pauschenpferd (m)
  RINGE: 3,              // Ringe (m)
  SPRUNG: 4,             // Sprung (m+w)
  BARREN: 5,             // Barren (m)
  RECK: 6,               // Reck (m+w)
  SPRUNG_W: 7,           // Sprung w (w only, separate from generic Sprung)
  STUFENBARREN: 8,       // Stufenbarren (w)
  SCHWEBEBALKEN: 9,      // Schwebebalken (w)
  BODEN_W: 10,           // Boden w (w only, separate from generic Boden)
  MINITRAMPOLIN: 11,     // Minitrampolin (m+w)
  GERAETEBAHN_A: 12,     // Gerätebahn A (m+w)
  GERAETEBAHN_B: 13,     // Gerätebahn B (m+w)

  // ===================================================================
  // CATEGORY LABELS (14-20)
  // ===================================================================
  LK1: 14,               // LK1 category (m+w)
  LK2: 15,               // LK2 category (m+w)
  LK3: 16,               // LK3 category (m+w)
  AK: 17,                // AK category (m+w)
  KM: 18,                // KM (m+w)
  KM2: 19,               // KM2 (m+w)
  KM3: 20,               // KM3 (m+w)

  // ===================================================================
  // KÜR MALE (21-26)
  // ===================================================================
  BODEN_M_KUER: 21,      // Boden m. Kür
  P_PFERD_KUER: 22,      // P.-Pferd Kür
  RINGE_M: 23,           // Ringe m.
  SPRUNG_M_KUER: 24,     // Sprung m. Kür
  PAR_BARREN_KUER: 25,   // Par.-Barren Kür
  RECK_M_KUER: 26,       // Reck m. Kür

  // ===================================================================
  // KÜR FEMALE (27-28)
  // Stufenbarren & Schwebebalken have no separate Kür variant,
  // the base device (IDs 8, 9) is used for Kür competitions.
  // ===================================================================
  BODEN_W_KUER: 27,      // Boden w. Kür
  SPRUNG_W_KUER: 28,     // Sprung w. Kür

  // ===================================================================
  // LK1 MALE (31-36)
  // ===================================================================
  BODEN_M_LK1: 31,       // Boden m. LK1
  P_PFERD_LK1: 32,       // P.-Pferd LK1
  RINGE_LK1: 33,         // Ringe LK1
  SPRUNG_M_LK1: 34,      // Sprung m. LK1
  PAR_BARREN_LK1: 35,    // Par.-Barren LK1
  RECK_M_LK1: 36,        // Reck m. LK1

  // ===================================================================
  // LK1 FEMALE (37-40) — NEW: previously missing!
  // ===================================================================
  SPRUNG_W_LK1: 37,      // Sprung w. LK1
  STUFENBARREN_LK1: 38,  // Stufenbarren LK1
  SCHWEBEBALKEN_LK1: 39, // Schwebebalken LK1
  BODEN_W_LK1: 40,       // Boden w. LK1

  // ===================================================================
  // LK2 MALE (41-46)
  // ===================================================================
  BODEN_M_LK2: 41,       // Boden m. LK2
  P_PFERD_LK2: 42,       // P.-Pferd LK2
  RINGE_LK2: 43,         // Ringe LK2
  SPRUNG_M_LK2: 44,      // Sprung m. LK2
  PAR_BARREN_LK2: 45,    // Par.-Barren LK2
  RECK_M_LK2: 46,        // Reck m. LK2

  // ===================================================================
  // LK2 FEMALE (47-50) — NEW: previously missing!
  // ===================================================================
  SPRUNG_W_LK2: 47,      // Sprung w. LK2
  STUFENBARREN_LK2: 48,  // Stufenbarren LK2
  SCHWEBEBALKEN_LK2: 49, // Schwebebalken LK2
  BODEN_W_LK2: 50,       // Boden w. LK2

  // ===================================================================
  // LK3 MALE (51-56)
  // ===================================================================
  BODEN_M_LK3: 51,       // Boden m. LK3
  P_PFERD_LK3: 52,       // P.-Pferd LK3
  RINGE_LK3: 53,         // Ringe LK3
  SPRUNG_M_LK3: 54,      // Sprung m. LK3
  PAR_BARREN_LK3: 55,    // Par.-Barren LK3
  RECK_M_LK3: 56,        // Reck m. LK3

  // ===================================================================
  // LK3 FEMALE (57-60) — NEW: previously missing!
  // ===================================================================
  SPRUNG_W_LK3: 57,      // Sprung w. LK3
  STUFENBARREN_LK3: 58,  // Stufenbarren LK3
  SCHWEBEBALKEN_LK3: 59, // Schwebebalken LK3
  BODEN_W_LK3: 60,       // Boden w. LK3

  // ===================================================================
  // P-ÜBUNG P1-P9 (61-70)
  // ===================================================================
  BODEN_M_P: 61,         // Boden m. P1-P9
  PAUSCHENPFERD_P: 62,   // Pauschenpferd P1-P9
  RINGE_P: 63,           // Ringe P1-P9
  SPRUNG_M_P: 64,        // Sprung m. P1-P9
  PAR_BARREN_P: 65,      // Par.-Barren P1-P9
  RECK_M_P: 66,          // Reck m. P1-P9
  SPRUNG_W_P: 67,        // Sprung w. P1-P9
  RECK_STUBA_P: 68,      // Reck/StuBa. P1-P9
  SCHWEBEBALKEN_P: 69,   // Schwebebalken P1-P9
  BODEN_W_P: 70,         // Boden w. P1-P9

  // ===================================================================
  // TURN10 (71-77)
  // ===================================================================
  TURN10: 71,             // Turn10 (category)
  BODEN_TURN10: 72,       // Boden Turn10® Basis
  BALKEN_BANK_TURN10: 73, // Balken/Bank Turn10® Basis
  P_BARREN_TURN10: 74,    // P-Barren Turn10® Basis
  MINITRAMPOLIN_TURN10: 75, // Minitrampolin Turn10® Basis
  RECK_STBARREN_TURN10: 76, // Reck/St-Barren Turn10® Basis
  SPRUNG_TURN10: 77,      // Sprung Turn10® Basis

  // ===================================================================
  // AK DEVICES (78)
  // ===================================================================
  BODEN_AK: 78,           // Boden AK

  // ===================================================================
  // PAUSE PLACEHOLDER DEVICES (79-83)
  // Used as workaround slots in time planning when a squad needs a break.
  // ===================================================================
  PAUSE1: 79,             // Pause 1
  PAUSE2: 80,             // Pause 2
  PAUSE3: 81,             // Pause 3
  PAUSE4: 82,             // Pause 4
  PAUSE5: 83,             // Pause 5
} as const;

/**
 * Reverse lookup: discipline ID → discipline name (as created by the wizard).
 * Useful for debugging and logging.
 */
export const DISCIPLINE_NAMES: Record<number, string> = {
  // Base apparatus
  [DISCIPLINE_IDS.BODEN]: 'Boden',
  [DISCIPLINE_IDS.PAUSCHENPFERD]: 'Pauschenpferd',
  [DISCIPLINE_IDS.RINGE]: 'Ringe',
  [DISCIPLINE_IDS.SPRUNG]: 'Sprung',
  [DISCIPLINE_IDS.BARREN]: 'Barren',
  [DISCIPLINE_IDS.RECK]: 'Reck',
  [DISCIPLINE_IDS.SPRUNG_W]: 'Sprung w',
  [DISCIPLINE_IDS.STUFENBARREN]: 'Stufenbarren',
  [DISCIPLINE_IDS.SCHWEBEBALKEN]: 'Schwebebalken',
  [DISCIPLINE_IDS.BODEN_W]: 'Boden w',
  [DISCIPLINE_IDS.MINITRAMPOLIN]: 'Minitrampolin',
  [DISCIPLINE_IDS.GERAETEBAHN_A]: 'Gerätebahn A',
  [DISCIPLINE_IDS.GERAETEBAHN_B]: 'Gerätebahn B',
  // Categories
  [DISCIPLINE_IDS.LK1]: 'LK1',
  [DISCIPLINE_IDS.LK2]: 'LK2',
  [DISCIPLINE_IDS.LK3]: 'LK3',
  [DISCIPLINE_IDS.AK]: 'AK',
  [DISCIPLINE_IDS.KM]: 'KM',
  [DISCIPLINE_IDS.KM2]: 'KM2',
  [DISCIPLINE_IDS.KM3]: 'KM3',
  // Kür male
  [DISCIPLINE_IDS.BODEN_M_KUER]: 'Boden m. Kür',
  [DISCIPLINE_IDS.P_PFERD_KUER]: 'P.-Pferd Kür',
  [DISCIPLINE_IDS.RINGE_M]: 'Ringe m.',
  [DISCIPLINE_IDS.SPRUNG_M_KUER]: 'Sprung m. Kür',
  [DISCIPLINE_IDS.PAR_BARREN_KUER]: 'Par.-Barren Kür',
  [DISCIPLINE_IDS.RECK_M_KUER]: 'Reck m. Kür',
  // Kür female
  [DISCIPLINE_IDS.BODEN_W_KUER]: 'Boden w. Kür',
  [DISCIPLINE_IDS.SPRUNG_W_KUER]: 'Sprung w. Kür',
  // LK1 male
  [DISCIPLINE_IDS.BODEN_M_LK1]: 'Boden m. LK1',
  [DISCIPLINE_IDS.P_PFERD_LK1]: 'P.-Pferd LK1',
  [DISCIPLINE_IDS.RINGE_LK1]: 'Ringe LK1',
  [DISCIPLINE_IDS.SPRUNG_M_LK1]: 'Sprung m. LK1',
  [DISCIPLINE_IDS.PAR_BARREN_LK1]: 'Par.-Barren LK1',
  [DISCIPLINE_IDS.RECK_M_LK1]: 'Reck m. LK1',
  // LK1 female
  [DISCIPLINE_IDS.SPRUNG_W_LK1]: 'Sprung w. LK1',
  [DISCIPLINE_IDS.STUFENBARREN_LK1]: 'Stufenbarren LK1',
  [DISCIPLINE_IDS.SCHWEBEBALKEN_LK1]: 'Schwebebalken LK1',
  [DISCIPLINE_IDS.BODEN_W_LK1]: 'Boden w. LK1',
  // LK2 male
  [DISCIPLINE_IDS.BODEN_M_LK2]: 'Boden m. LK2',
  [DISCIPLINE_IDS.P_PFERD_LK2]: 'P.-Pferd LK2',
  [DISCIPLINE_IDS.RINGE_LK2]: 'Ringe LK2',
  [DISCIPLINE_IDS.SPRUNG_M_LK2]: 'Sprung m. LK2',
  [DISCIPLINE_IDS.PAR_BARREN_LK2]: 'Par.-Barren LK2',
  [DISCIPLINE_IDS.RECK_M_LK2]: 'Reck m. LK2',
  // LK2 female
  [DISCIPLINE_IDS.SPRUNG_W_LK2]: 'Sprung w. LK2',
  [DISCIPLINE_IDS.STUFENBARREN_LK2]: 'Stufenbarren LK2',
  [DISCIPLINE_IDS.SCHWEBEBALKEN_LK2]: 'Schwebebalken LK2',
  [DISCIPLINE_IDS.BODEN_W_LK2]: 'Boden w. LK2',
  // LK3 male
  [DISCIPLINE_IDS.BODEN_M_LK3]: 'Boden m. LK3',
  [DISCIPLINE_IDS.P_PFERD_LK3]: 'P.-Pferd LK3',
  [DISCIPLINE_IDS.RINGE_LK3]: 'Ringe LK3',
  [DISCIPLINE_IDS.SPRUNG_M_LK3]: 'Sprung m. LK3',
  [DISCIPLINE_IDS.PAR_BARREN_LK3]: 'Par.-Barren LK3',
  [DISCIPLINE_IDS.RECK_M_LK3]: 'Reck m. LK3',
  // LK3 female
  [DISCIPLINE_IDS.SPRUNG_W_LK3]: 'Sprung w. LK3',
  [DISCIPLINE_IDS.STUFENBARREN_LK3]: 'Stufenbarren LK3',
  [DISCIPLINE_IDS.SCHWEBEBALKEN_LK3]: 'Schwebebalken LK3',
  [DISCIPLINE_IDS.BODEN_W_LK3]: 'Boden w. LK3',
  // P-Übung
  [DISCIPLINE_IDS.BODEN_M_P]: 'Boden m. P1-P9',
  [DISCIPLINE_IDS.PAUSCHENPFERD_P]: 'Pauschenpferd P1-P9',
  [DISCIPLINE_IDS.RINGE_P]: 'Ringe P1-P9',
  [DISCIPLINE_IDS.SPRUNG_M_P]: 'Sprung m. P1-P9',
  [DISCIPLINE_IDS.PAR_BARREN_P]: 'Par.-Barren P1-P9',
  [DISCIPLINE_IDS.RECK_M_P]: 'Reck m. P1-P9',
  [DISCIPLINE_IDS.SPRUNG_W_P]: 'Sprung w. P1-P9',
  [DISCIPLINE_IDS.RECK_STUBA_P]: 'Reck/StuBa. P1-P9',
  [DISCIPLINE_IDS.SCHWEBEBALKEN_P]: 'Schwebebalken P1-P9',
  [DISCIPLINE_IDS.BODEN_W_P]: 'Boden w. P1-P9',
  // Turn10
  [DISCIPLINE_IDS.TURN10]: 'Turn10',
  [DISCIPLINE_IDS.BODEN_TURN10]: 'Boden Turn10® Basis',
  [DISCIPLINE_IDS.BALKEN_BANK_TURN10]: 'Balken/Bank Turn10® Basis',
  [DISCIPLINE_IDS.P_BARREN_TURN10]: 'P-Barren Turn10® Basis',
  [DISCIPLINE_IDS.MINITRAMPOLIN_TURN10]: 'Minitrampolin Turn10® Basis',
  [DISCIPLINE_IDS.RECK_STBARREN_TURN10]: 'Reck/St-Barren Turn10® Basis',
  [DISCIPLINE_IDS.SPRUNG_TURN10]: 'Sprung Turn10® Basis',
  // AK
  [DISCIPLINE_IDS.BODEN_AK]: 'Boden AK',
  [DISCIPLINE_IDS.PAUSE1]: 'Pause1',
  [DISCIPLINE_IDS.PAUSE2]: 'Pause2',
  [DISCIPLINE_IDS.PAUSE3]: 'Pause3',
  [DISCIPLINE_IDS.PAUSE4]: 'Pause4',
  [DISCIPLINE_IDS.PAUSE5]: 'Pause5',
};

/** Highest discipline ID used by the preset. Used to reset the DB sequence. */
export const MAX_PRESET_DISCIPLINE_ID = 83;

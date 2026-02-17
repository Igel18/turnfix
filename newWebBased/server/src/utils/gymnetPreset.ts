// Utility for GymNet preset import: Geräte, Formeln, Mapping
// Reusable for DB initialization and import
import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';
import { DISCIPLINE_IDS, MAX_PRESET_DISCIPLINE_ID } from './gymnetDisciplineIds';

export async function applyGymNetPreset(customPrismaClient?: PrismaClient) {
    // Use custom client if provided (for wizard), otherwise use default
    const db = customPrismaClient || prisma;
    
    try {
      // Check if database schema exists by trying to query the tables
      try {
        await db.tfx_formeln.count();
      } catch (error: any) {
        if (error.message && error.message.includes('does not exist')) {
          throw new Error('Database schema not initialized. Please run "Create Schema" step first.');
        }
        throw error;
      }
    // Explizite Disziplin-Felder pro Gerät (exakte Namensgebung und Reihenfolge)
    // Mapping: Geräte-Name (var_name) → Felder
    const deviceFieldMap: Record<string, Array<{ var_name: string; int_sortierung: number }>> = {
      // P-Übung Geräte (P 1-9)
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Boden m. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Pauschenpferd P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Ringe P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Sprung m. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Par.-Barren P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Reck m. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Sprung w. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Reck/StuBa. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Schwebebalken P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      ...Object.fromEntries(Array.from({length:9},(_,i)=>[
        `Boden w. P ${i+1}`, [
          { var_name: 'Stufe', int_sortierung: 1 },
          { var_name: 'AbzugAusf.', int_sortierung: 2 },
          { var_name: 'Endwert', int_sortierung: 3 }
        ]
      ])),
      // Turn10 Geräte
      'Boden Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      'Balken/Bank Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      'P-Barren Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      'Minitrampolin Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      'Reck/St-Barren Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      'Sprung Turn10® Basis': [
        { var_name: 'Wert', int_sortierung: 1 },
        { var_name: 'Abzug', int_sortierung: 2 },
        { var_name: 'Endwert', int_sortierung: 3 }
      ],
      // Kür Geräte
      'Boden m. Kür': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'P.-Pferd Kür': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Ringe m.': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Sprung m. Kür': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Par.-Barren Kür': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Reck m. Kür': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK1 Geräte
      'Boden m. LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'P.-Pferd LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Ringe LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Sprung m. LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Par.-Barren LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Reck m. LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK1 Geräte (weiblich)
      'Sprung w. LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Stufenbarren LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Schwebebalken LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Boden w. LK1': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK2 Geräte
      'Boden m. LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'P.-Pferd LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Ringe LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Sprung m. LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Par.-Barren LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Reck m. LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK2 Geräte (weiblich)
      'Sprung w. LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Stufenbarren LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Schwebebalken LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Boden w. LK2': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK3 Geräte
      'Boden m. LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'P.-Pferd LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Ringe LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Sprung m. LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Par.-Barren LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Reck m. LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // LK3 Geräte (weiblich)
      'Sprung w. LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Stufenbarren LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Schwebebalken LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      'Boden w. LK3': [
        { var_name: 'D-Note', int_sortierung: 1 },
        { var_name: 'E-Note', int_sortierung: 2 },
        { var_name: 'N-Abzüge', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ],
      // AK Geräte (Beispiel: "Boden AK")
      'Boden AK': [
        { var_name: 'Ausgangswert', int_sortierung: 1 },
        { var_name: 'AbzugAusf.', int_sortierung: 2 },
        { var_name: 'AbzugSonst.', int_sortierung: 3 },
        { var_name: 'Endwert', int_sortierung: 4 }
      ]
      // Weitere AK Geräte können analog ergänzt werden
    };
  // 1. Formeln anlegen (falls nicht vorhanden)
  // 2. Geräte anlegen (falls nicht vorhanden)
  // 3. Mapping anlegen (optional, falls Mapping-Tabelle existiert)

  // --- Formeln ---
  const formulas = [
    {
      var_name: 'P-Wettkampf',
      // Feld-Reihenfolge: A=Stufe, B=AbzugAusf.
      var_formel: '(10 + A) - B',
      int_typ: 0
    },
    {
      var_name: 'AK',
      // Feld-Reihenfolge: A=Ausgangswert, B=AbzugAusf., C=AbzugSonst.
      var_formel: 'A - B - C',
      int_typ: 0
    },
    {
      var_name: 'LK',
      // Feld-Reihenfolge: A=D-Note, B=E-Note, C=N-Abzüge.
      var_formel: 'A + B - C',
      int_typ: 0
    }
  ];

  let createdFormulas = 0;
  for (const formula of formulas) {
    const existing = await db.tfx_formeln.findFirst({ where: { var_name: formula.var_name } });
    if (!existing) {
      await db.tfx_formeln.create({ data: formula });
      console.log(`[GymNetPreset] Formel hinzugefügt: ${formula.var_name}`);
      createdFormulas++;
    } else if (existing.var_formel !== formula.var_formel || existing.int_typ !== formula.int_typ) {
      await db.tfx_formeln.update({ where: { int_formelid: existing.int_formelid }, data: formula });
      console.log(`[GymNetPreset] Formel aktualisiert: ${formula.var_name}`);
    }
  }

  // --- Geräte ---
  // Felder für P-Geräte (P1-P9 Sammelgeräte)
  const pFelder = [
    { var_name: 'Stufe', int_sortierung: 1 },
    { var_name: 'AbzugAusf.', int_sortierung: 2 },
    { var_name: 'Endwert', int_sortierung: 3 }
  ];

  // Vollständige Liste aller Geräte mit expliziten Gender-Angaben, Sportart und FESTER ID.
  // Die IDs stammen aus gymnetDisciplineIds.ts und werden beim DB-Wizard explizit gesetzt.
  // WICHTIG: kurzname (var_kurz1) darf maximal 5 Zeichen haben (DB-Constraint: varchar(5))
  const D = DISCIPLINE_IDS; // Short alias for readability
  const geraete: Array<{ id: number; name: string; anzeigename: string; kurzname: string; eingabemaske: string; einheit: string; symbol: string; formula: string; sport: string; bol_m: boolean; bol_w: boolean; isP?: boolean }> = [
    // === Basis-Geräte (1-13) ===
    { id: D.BODEN, name: 'Boden', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.PAUSCHENPFERD, name: 'Pauschenpferd', anzeigename: 'Pauschenpferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.RINGE, name: 'Ringe', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.SPRUNG, name: 'Sprung', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.BARREN, name: 'Barren', anzeigename: 'Barren', kurzname: 'BARR', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.RECK, name: 'Reck', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.SPRUNG_W, name: 'Sprung w', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { id: D.STUFENBARREN, name: 'Stufenbarren', anzeigename: 'Stufenbarren', kurzname: 'STUBA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { id: D.SCHWEBEBALKEN, name: 'Schwebebalken', anzeigename: 'Schwebebalken', kurzname: 'BALKN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { id: D.BODEN_W, name: 'Boden w', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { id: D.MINITRAMPOLIN, name: 'Minitrampolin', anzeigename: 'Minitrampolin', kurzname: 'MINIT', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/minitrampolin.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.GERAETEBAHN_A, name: 'Gerätebahn A', anzeigename: 'Gerätebahn A', kurzname: 'GBAHA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.GERAETEBAHN_B, name: 'Gerätebahn B', anzeigename: 'Gerätebahn B', kurzname: 'GBAHB', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    
    // === Level-Kategorien (14-20) ===
    { id: D.LK1, name: 'LK1', anzeigename: 'LK1', kurzname: 'LK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { id: D.LK2, name: 'LK2', anzeigename: 'LK2', kurzname: 'LK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { id: D.LK3, name: 'LK3', anzeigename: 'LK3', kurzname: 'LK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { id: D.AK, name: 'AK', anzeigename: 'AK', kurzname: 'AK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.KM, name: 'KM', anzeigename: 'KM', kurzname: 'KM', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.KM2, name: 'KM2', anzeigename: 'KM2', kurzname: 'KM2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { id: D.KM3, name: 'KM3', anzeigename: 'KM3', kurzname: 'KM3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    
    // === Kür Geräte (21-28) ===
    { id: D.BODEN_M_KUER, name: 'Boden m. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.P_PFERD_KUER, name: 'P.-Pferd Kür', anzeigename: 'Pferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.RINGE_M, name: 'Ringe m.', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.SPRUNG_M_KUER, name: 'Sprung m. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.PAR_BARREN_KUER, name: 'Par.-Barren Kür', anzeigename: 'Barren', kurzname: 'BARR', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.RECK_M_KUER, name: 'Reck m. Kür', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { id: D.BODEN_W_KUER, name: 'Boden w. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { id: D.SPRUNG_W_KUER, name: 'Sprung w. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    
    // === LK1 Geräte männlich (31-36) ===
    { id: D.BODEN_M_LK1, name: 'Boden m. LK1', anzeigename: 'Boden m. LK1', kurzname: 'BODL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.P_PFERD_LK1, name: 'P.-Pferd LK1', anzeigename: 'P.-Pferd LK1', kurzname: 'PFRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RINGE_LK1, name: 'Ringe LK1', anzeigename: 'Ringe LK1', kurzname: 'RINL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.SPRUNG_M_LK1, name: 'Sprung m. LK1', anzeigename: 'Sprung m. LK1', kurzname: 'SPRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.PAR_BARREN_LK1, name: 'Par.-Barren LK1', anzeigename: 'Par.-Barren LK1', kurzname: 'PBRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RECK_M_LK1, name: 'Reck m. LK1', anzeigename: 'Reck m. LK1', kurzname: 'REKL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    // === LK1 Geräte weiblich (37-40) — NEU! ===
    { id: D.SPRUNG_W_LK1, name: 'Sprung w. LK1', anzeigename: 'Sprung w. LK1', kurzname: 'SWRL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.STUFENBARREN_LK1, name: 'Stufenbarren LK1', anzeigename: 'Stufenbarren LK1', kurzname: 'STBL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.SCHWEBEBALKEN_LK1, name: 'Schwebebalken LK1', anzeigename: 'Schwebebalken LK1', kurzname: 'BLKL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.BODEN_W_LK1, name: 'Boden w. LK1', anzeigename: 'Boden w. LK1', kurzname: 'BWDL1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    
    // === LK2 Geräte männlich (41-46) ===
    { id: D.BODEN_M_LK2, name: 'Boden m. LK2', anzeigename: 'Boden m. LK2', kurzname: 'BODL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.P_PFERD_LK2, name: 'P.-Pferd LK2', anzeigename: 'P.-Pferd LK2', kurzname: 'PFRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RINGE_LK2, name: 'Ringe LK2', anzeigename: 'Ringe LK2', kurzname: 'RINL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.SPRUNG_M_LK2, name: 'Sprung m. LK2', anzeigename: 'Sprung m. LK2', kurzname: 'SPRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.PAR_BARREN_LK2, name: 'Par.-Barren LK2', anzeigename: 'Par.-Barren LK2', kurzname: 'PBRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RECK_M_LK2, name: 'Reck m. LK2', anzeigename: 'Reck m. LK2', kurzname: 'REKL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    // === LK2 Geräte weiblich (47-50) — NEU! ===
    { id: D.SPRUNG_W_LK2, name: 'Sprung w. LK2', anzeigename: 'Sprung w. LK2', kurzname: 'SWRL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.STUFENBARREN_LK2, name: 'Stufenbarren LK2', anzeigename: 'Stufenbarren LK2', kurzname: 'STBL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.SCHWEBEBALKEN_LK2, name: 'Schwebebalken LK2', anzeigename: 'Schwebebalken LK2', kurzname: 'BLKL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.BODEN_W_LK2, name: 'Boden w. LK2', anzeigename: 'Boden w. LK2', kurzname: 'BWDL2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    
    // === LK3 Geräte männlich (51-56) ===
    { id: D.BODEN_M_LK3, name: 'Boden m. LK3', anzeigename: 'Boden m. LK3', kurzname: 'BODL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.P_PFERD_LK3, name: 'P.-Pferd LK3', anzeigename: 'P.-Pferd LK3', kurzname: 'PFRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RINGE_LK3, name: 'Ringe LK3', anzeigename: 'Ringe LK3', kurzname: 'RINL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.SPRUNG_M_LK3, name: 'Sprung m. LK3', anzeigename: 'Sprung m. LK3', kurzname: 'SPRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.PAR_BARREN_LK3, name: 'Par.-Barren LK3', anzeigename: 'Par.-Barren LK3', kurzname: 'PBRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { id: D.RECK_M_LK3, name: 'Reck m. LK3', anzeigename: 'Reck m. LK3', kurzname: 'REKL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    // === LK3 Geräte weiblich (57-60) — NEU! ===
    { id: D.SPRUNG_W_LK3, name: 'Sprung w. LK3', anzeigename: 'Sprung w. LK3', kurzname: 'SWRL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.STUFENBARREN_LK3, name: 'Stufenbarren LK3', anzeigename: 'Stufenbarren LK3', kurzname: 'STBL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.SCHWEBEBALKEN_LK3, name: 'Schwebebalken LK3', anzeigename: 'Schwebebalken LK3', kurzname: 'BLKL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { id: D.BODEN_W_LK3, name: 'Boden w. LK3', anzeigename: 'Boden w. LK3', kurzname: 'BWDL3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    
    // === P-Geräte Sammelgeräte P1-P9 (61-70) ===
    { id: D.BODEN_M_P, name: 'Boden m. P1-P9', anzeigename: 'Boden m. P1-P9', kurzname: 'BODP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { id: D.PAUSCHENPFERD_P, name: 'Pauschenpferd P1-P9', anzeigename: 'Pauschenpferd P1-P9', kurzname: 'PFERP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/seitpferd.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { id: D.RINGE_P, name: 'Ringe P1-P9', anzeigename: 'Ringe P1-P9', kurzname: 'RINGP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/ringe.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { id: D.SPRUNG_M_P, name: 'Sprung m. P1-P9', anzeigename: 'Sprung m. P1-P9', kurzname: 'SPRP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { id: D.PAR_BARREN_P, name: 'Par.-Barren P1-P9', anzeigename: 'Par.-Barren P1-P9', kurzname: 'PBARP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { id: D.RECK_M_P, name: 'Reck m. P1-P9', anzeigename: 'Reck m. P1-P9', kurzname: 'RECKP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { id: D.SPRUNG_W_P, name: 'Sprung w. P1-P9', anzeigename: 'Sprung w. P1-P9', kurzname: 'SPRWP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { id: D.RECK_STUBA_P, name: 'Reck/StuBa. P1-P9', anzeigename: 'Reck/StuBa. P1-P9', kurzname: 'RKSBP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/stufenbarren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { id: D.SCHWEBEBALKEN_P, name: 'Schwebebalken P1-P9', anzeigename: 'Schwebebalken P1-P9', kurzname: 'BALKP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { id: D.BODEN_W_P, name: 'Boden w. P1-P9', anzeigename: 'Boden w. P1-P9', kurzname: 'BODWP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },

    // === Turn10 Geräte (71-77) ===
    { id: D.TURN10, name: 'Turn10', anzeigename: 'Turn10', kurzname: 'TN10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.BODEN_TURN10, name: 'Boden Turn10® Basis', anzeigename: 'Boden Turn10® Basis', kurzname: 'BOD10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.BALKEN_BANK_TURN10, name: 'Balken/Bank Turn10® Basis', anzeigename: 'Balken/Bank Turn10® Basis', kurzname: 'BLK10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.P_BARREN_TURN10, name: 'P-Barren Turn10® Basis', anzeigename: 'P-Barren Turn10® Basis', kurzname: 'PBR10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.MINITRAMPOLIN_TURN10, name: 'Minitrampolin Turn10® Basis', anzeigename: 'Minitrampolin Turn10® Basis', kurzname: 'MNT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/minitrampolin.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.RECK_STBARREN_TURN10, name: 'Reck/St-Barren Turn10® Basis', anzeigename: 'Reck/St-Barren Turn10® Basis', kurzname: 'RKS10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { id: D.SPRUNG_TURN10, name: 'Sprung Turn10® Basis', anzeigename: 'Sprung Turn10® Basis', kurzname: 'SPR10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    
    // === AK Geräte (78) ===
    { id: D.BODEN_AK, name: 'Boden AK', anzeigename: 'Boden AK', kurzname: 'BODAK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: ':/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
  ];

  let createdDevices = 0;
  let createdFields = 0;

  // ZUERST: PostgreSQL Sequence auf mindestens MAX_PRESET_DISCIPLINE_ID setzen,
  // damit auto-increment keine IDs im reservierten Bereich vergibt.
  // Wichtig: Nur hochsetzen, nie runter (falls bereits höhere IDs existieren)
  try {
    const maxIdResult = await db.$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT MAX(int_disziplinenid) as max FROM tfx_disziplinen`
    );
    const currentMaxId = maxIdResult[0]?.max || 0;
    const newSeqValue = Math.max(currentMaxId, MAX_PRESET_DISCIPLINE_ID);
    await db.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('tfx_disziplinen', 'int_disziplinenid'), $1, true)`,
      newSeqValue
    );
    console.log(`[GymNetPreset] PostgreSQL Sequence VOR Anlegen auf ${newSeqValue} gesetzt (MAX aus DB: ${currentMaxId}, Preset-Max: ${MAX_PRESET_DISCIPLINE_ID}).`);
  } catch (seqError: any) {
    console.warn(`[GymNetPreset] Sequence-Reset fehlgeschlagen (nicht kritisch): ${seqError.message}`);
  }

  // DANN: GymNet-Disziplinen mit festen IDs anlegen
  for (const geraet of geraete) {
    // Sportart anlegen oder abrufen
    let sport = await db.tfx_sport.findFirst({ where: { var_name: geraet.sport } });
    if (!sport) {
      sport = await db.tfx_sport.create({ data: { var_name: geraet.sport } });
      console.log(`[GymNetPreset] Sportart "${geraet.sport}" wurde angelegt.`);
    }
    const sportId = sport.int_sportid;
    
    // Prüfe sowohl nach Name als auch nach fester ID, um Unique-Constraint-Fehler zu vermeiden
    // (Falls die Autoincrement-Sequenz die feste ID bereits vergeben hat)
    const existingByName = await db.tfx_disziplinen.findFirst({ where: { var_name: geraet.name } });
    const existingById = await db.tfx_disziplinen.findFirst({ where: { int_disziplinenid: geraet.id } });
    let disziplinId: number | null = null;
    
    const formula = await db.tfx_formeln.findFirst({ where: { var_name: geraet.formula } });
    const disziplinData = {
      var_name: geraet.name?.substring(0, 100),                          // DB: VarChar(100)
      var_kurz1: geraet.kurzname?.substring(0, 6),                        // DB: VarChar(6)
      var_kurz2: (geraet.anzeigename || geraet.name)?.substring(0, 20),    // DB: VarChar(20)
      var_maske: geraet.eingabemaske?.substring(0, 10),                    // DB: VarChar(10)
      var_einheit: geraet.einheit?.substring(0, 5),                        // DB: VarChar(5)
      var_icon: geraet.symbol?.substring(0, 50),                           // DB: VarChar(50)
      int_formelid: formula?.int_formelid || null,
      int_sportid: sportId,
      bol_m: geraet.bol_m,
      bol_w: geraet.bol_w
    };

    if (existingByName) {
      // Disziplin mit gleichem Namen existiert bereits → nur ID merken, nicht neu anlegen
      disziplinId = existingByName.int_disziplinenid;
    } else if (existingById) {
      // ID ist bereits belegt (andere Disziplin) → bestehenden Eintrag aktualisieren
      await db.tfx_disziplinen.update({
        where: { int_disziplinenid: geraet.id },
        data: disziplinData
      });
      disziplinId = geraet.id;
      console.log(`[GymNetPreset] Gerät aktualisiert (ID=${geraet.id} war belegt): ${geraet.name} (${geraet.kurzname})`);
      createdDevices++;
    } else {
      // Weder Name noch ID existiert → neu anlegen
      const created = await db.tfx_disziplinen.create({
        data: {
          int_disziplinenid: geraet.id,                                        // Feste ID aus gymnetDisciplineIds.ts!
          ...disziplinData
        }
      });
      disziplinId = created.int_disziplinenid;
      console.log(`[GymNetPreset] Gerät hinzugefügt: ${geraet.name} (ID=${geraet.id}, ${geraet.kurzname})`);
      createdDevices++;
    }
    // Disziplin-Felder anlegen, falls noch nicht vorhanden (exakte Zuordnung)
    if (disziplinId) {
      let fields: Array<{ var_name: string; int_sortierung: number }> = [];
      if (geraet.isP) {
        fields = pFelder;
      } else {
        fields = deviceFieldMap[geraet.name] || [];
      }
      for (const field of fields) {
        const existingField = await db.tfx_disziplinen_felder.findFirst({
          where: { int_disziplinenid: disziplinId, var_name: field.var_name }
        });
        if (!existingField) {
          await db.tfx_disziplinen_felder.create({
            data: {
              int_disziplinenid: disziplinId,
              var_name: field.var_name?.substring(0, 15),    // DB: VarChar(15)
              int_sortierung: field.int_sortierung,
              bol_endwert: field.var_name === 'Endwert',
              bol_ausgangswert: field.var_name === 'Ausgangswert',
              bol_enabled: true,
              int_gruppe: 1
            }
          });
          createdFields++;
          console.log(`[GymNetPreset]   Disziplin-Feld hinzugefügt: ${geraet.name} - ${field.var_name}`);
        }
      }
    }
  }

  // Mapping zu GymNet kann hier ergänzt werden, falls Mapping-Tabelle existiert
  // ...

  // Gesamtzahlen für Übersicht
  const totalFormulas = formulas.length;
  const totalDevices = geraete.length;
  let totalFields = 0;
  for (const fields of Object.values(deviceFieldMap)) totalFields += fields.length;


  console.log(`[GymNetPreset] Hinzugefügt: ${createdFormulas} neue Formeln, ${createdDevices} neue Geräte, ${createdFields} neue Felder.`);
  return {
    success: true,
    createdFormulas,
    createdDevices,
    createdFields,
    totalFormulas,
    totalDevices,
    totalFields
  };
    } catch (error: any) {
      console.error('[GymNetPreset] Error:', error);
      throw error;
    }
}

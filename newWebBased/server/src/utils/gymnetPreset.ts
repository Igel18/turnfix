// Utility for GymNet preset import: Geräte, Formeln, Mapping
// Reusable for DB initialization and import
import prisma from '../lib/prisma';

export async function applyGymNetPreset() {
    try {
      // Check if database schema exists by trying to query the tables
      try {
        await prisma.tfx_formeln.count();
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
    const existing = await prisma.tfx_formeln.findFirst({ where: { var_name: formula.var_name } });
    if (!existing) {
      await prisma.tfx_formeln.create({ data: formula });
      console.log(`[GymNetPreset] Formel hinzugefügt: ${formula.var_name}`);
      createdFormulas++;
    } else if (existing.var_formel !== formula.var_formel || existing.int_typ !== formula.int_typ) {
      await prisma.tfx_formeln.update({ where: { int_formelid: existing.int_formelid }, data: formula });
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

  // Vollständige Liste aller Geräte mit expliziten Gender-Angaben und Sportart
  const geraete = [
    // Basis-Geräte (Standard)
    { name: 'Boden', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'Pauschenpferd', anzeigename: 'Pauschenpferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Ringe', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Sprung', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'Barren', anzeigename: 'Barren', kurzname: 'BARREN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Reck', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Sprung w', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Stufenbarren', anzeigename: 'Stufenbarren', kurzname: 'STUBA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/stufenbarren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Schwebebalken', anzeigename: 'Schwebebalken', kurzname: 'BALKN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/balken.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Boden w', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Minitrampolin', anzeigename: 'Minitrampolin', kurzname: 'MINIT', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/minitrampolin.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'Gerätebahn A', anzeigename: 'Gerätebahn A', kurzname: 'GBAHA', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'Gerätebahn B', anzeigename: 'Gerätebahn B', kurzname: 'GBAHB', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/geraetebahn.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    
    // Level-Kategorien
    { name: 'LK1', anzeigename: 'LK1', kurzname: 'LK1  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { name: 'LK2', anzeigename: 'LK2', kurzname: 'LK2  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { name: 'LK3', anzeigename: 'LK3', kurzname: 'LK3  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: true },
    { name: 'AK', anzeigename: 'AK', kurzname: 'AK   ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'KM', anzeigename: 'KM', kurzname: 'KM   ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'KM2', anzeigename: 'KM2', kurzname: 'KM2  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    { name: 'KM3', anzeigename: 'KM3', kurzname: 'KM3  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    
    // Turn10 Geräte
    { name: 'Turn10', anzeigename: 'Turn10', kurzname: 'TURN1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'Boden Turn10® Basis', anzeigename: 'Boden Turn10® Basis', kurzname: 'BODT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'Balken/Bank Turn10® Basis', anzeigename: 'Balken/Bank Turn10® Basis', kurzname: 'BLKT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'P-Barren Turn10® Basis', anzeigename: 'P-Barren Turn10® Basis', kurzname: 'PBRT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'Minitrampolin Turn10® Basis', anzeigename: 'Minitrampolin Turn10® Basis', kurzname: 'MNTT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/minitrampolin.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'Reck/St-Barren Turn10® Basis', anzeigename: 'Reck/St-Barren Turn10® Basis', kurzname: 'RKST10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    { name: 'Sprung Turn10® Basis', anzeigename: 'Sprung Turn10® Basis', kurzname: 'SPRT10', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB Turn10', bol_m: true, bol_w: true },
    
    // Kür Geräte
    { name: 'Boden m. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'P.-Pferd Kür', anzeigename: 'Pferd', kurzname: 'PFERD', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Ringe m.', anzeigename: 'Ringe', kurzname: 'RINGE', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Sprung m. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Par.-Barren Kür', anzeigename: 'Barren', kurzname: 'BARREN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Reck m. Kür', anzeigename: 'Reck', kurzname: 'RECK', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'LK', sport: 'Turnen DTB', bol_m: true, bol_w: false },
    { name: 'Boden w. Kür', anzeigename: 'Boden', kurzname: 'BODEN', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    { name: 'Sprung w. Kür', anzeigename: 'Sprung', kurzname: 'SPRNG', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB', bol_m: false, bol_w: true },
    
    // LK1 Geräte
    { name: 'Boden m. LK1', anzeigename: 'Boden m. LK1', kurzname: 'BODLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'P.-Pferd LK1', anzeigename: 'P.-Pferd LK1', kurzname: 'PFRLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Ringe LK1', anzeigename: 'Ringe LK1', kurzname: 'RINLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Sprung m. LK1', anzeigename: 'Sprung m. LK1', kurzname: 'SPRLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Par.-Barren LK1', anzeigename: 'Par.-Barren LK1', kurzname: 'PBRLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { name: 'Reck m. LK1', anzeigename: 'Reck m. LK1', kurzname: 'REKLK1', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    
    // LK2 Geräte
    { name: 'Boden m. LK2', anzeigename: 'Boden m. LK2', kurzname: 'BODLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'P.-Pferd LK2', anzeigename: 'P.-Pferd LK2', kurzname: 'PFRLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Ringe LK2', anzeigename: 'Ringe LK2', kurzname: 'RINLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Sprung m. LK2', anzeigename: 'Sprung m. LK2', kurzname: 'SPRLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Par.-Barren LK2', anzeigename: 'Par.-Barren LK2', kurzname: 'PBRLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { name: 'Reck m. LK2', anzeigename: 'Reck m. LK2', kurzname: 'REKLK2', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    
    // LK3 Geräte
    { name: 'Boden m. LK3', anzeigename: 'Boden m. LK3', kurzname: 'BODLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'P.-Pferd LK3', anzeigename: 'P.-Pferd LK3', kurzname: 'PFRLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Ringe LK3', anzeigename: 'Ringe LK3', kurzname: 'RINLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Sprung m. LK3', anzeigename: 'Sprung m. LK3', kurzname: 'SPRLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    { name: 'Par.-Barren LK3', anzeigename: 'Par.-Barren LK3', kurzname: 'PBRLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: false, bol_w: true },
    { name: 'Reck m. LK3', anzeigename: 'Reck m. LK3', kurzname: 'REKLK3', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'LK', sport: 'Turnen DTB LK', bol_m: true, bol_w: false },
    
    // AK Geräte
    { name: 'Boden AK', anzeigename: 'Boden AK', kurzname: 'BODAK ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'AK', sport: 'Turnen DTB', bol_m: true, bol_w: true },
    
    // P-Geräte (Sammelgeräte P1-P9)
    { name: 'Boden m. P1-P9', anzeigename: 'Boden m. P1-P9', kurzname: 'BODP  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { name: 'Pauschenpferd P1-P9', anzeigename: 'Pauschenpferd P1-P9', kurzname: 'PFERP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/seitpferd.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { name: 'Ringe P1-P9', anzeigename: 'Ringe P1-P9', kurzname: 'RINGEP', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/ringe.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { name: 'Sprung m. P1-P9', anzeigename: 'Sprung m. P1-P9', kurzname: 'SPRP  ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { name: 'Par.-Barren P1-P9', anzeigename: 'Par.-Barren P1-P9', kurzname: 'PBARP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/barren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { name: 'Reck m. P1-P9', anzeigename: 'Reck m. P1-P9', kurzname: 'RECKP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/reck.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: true, bol_w: false, isP: true },
    { name: 'Sprung w. P1-P9', anzeigename: 'Sprung w. P1-P9', kurzname: 'SPRWP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/sprung.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { name: 'Reck/StuBa. P1-P9', anzeigename: 'Reck/StuBa. P1-P9', kurzname: 'RKSBP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/stufenbarren.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { name: 'Schwebebalken P1-P9', anzeigename: 'Schwebebalken P1-P9', kurzname: 'BALKP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/balken.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true },
    { name: 'Boden w. P1-P9', anzeigename: 'Boden w. P1-P9', kurzname: 'BODWP ', eingabemaske: '0.00', einheit: 'Pkt.', symbol: '/icons/boden.png', formula: 'P-Wettkampf', sport: 'Turnen DTB P', bol_m: false, bol_w: true, isP: true }
  ];

  let createdDevices = 0;
  let createdFields = 0;
  for (const geraet of geraete) {
    // Sportart anlegen oder abrufen
    let sport = await prisma.tfx_sport.findFirst({ where: { var_name: geraet.sport } });
    if (!sport) {
      sport = await prisma.tfx_sport.create({ data: { var_name: geraet.sport } });
      console.log(`[GymNetPreset] Sportart "${geraet.sport}" wurde angelegt.`);
    }
    const sportId = sport.int_sportid;
    
    const existing = await prisma.tfx_disziplinen.findFirst({ where: { var_name: geraet.name } });
    let disziplinId: number | null = null;
    if (!existing) {
      const formula = await prisma.tfx_formeln.findFirst({ where: { var_name: geraet.formula } });
      const created = await prisma.tfx_disziplinen.create({
        data: {
          var_name: geraet.name, // Anzeigename
          var_kurz1: geraet.kurzname, // Kurzname (max 6)
          var_maske: geraet.eingabemaske, // Eingabemaske
          var_einheit: geraet.einheit, // Einheit
          var_icon: geraet.symbol, // Symbol/Icon
          int_formelid: formula?.int_formelid || null,
          int_sportid: sportId,
          bol_m: geraet.bol_m,
          bol_w: geraet.bol_w
        }
      });
      disziplinId = created.int_disziplinenid;
      console.log(`[GymNetPreset] Gerät hinzugefügt: ${geraet.name} (${geraet.kurzname})`);
      createdDevices++;
    } else {
      disziplinId = existing.int_disziplinenid;
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
        const existingField = await prisma.tfx_disziplinen_felder.findFirst({
          where: { int_disziplinenid: disziplinId, var_name: field.var_name }
        });
        if (!existingField) {
          await prisma.tfx_disziplinen_felder.create({
            data: {
              int_disziplinenid: disziplinId,
              var_name: field.var_name,
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

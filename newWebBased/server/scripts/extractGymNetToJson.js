// Extract GymNet devices to JSON format
const fs = require('fs');
const path = require('path');

// Device field mappings
const deviceFieldMap = {
  // Turn10 devices
  "Boden Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  "Balken/Bank Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  "P-Barren Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  "Minitrampolin Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  "Reck/St-Barren Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  "Sprung Turn10® Basis": [
    { name: "Wert", sortierung: 1 },
    { name: "Abzug", sortierung: 2 },
    { name: "Endwert", sortierung: 3 }
  ],
  // Kür devices (with D-Note, E-Note, N-Abzüge, Endwert)
  "Boden m. Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "P.-Pferd Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Ringe m.": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Sprung m. Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Par.-Barren Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Reck m. Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Boden w. Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Sprung w. Kür": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  // LK devices
  "Boden m. LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "P.-Pferd LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Ringe LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Sprung m. LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Par.-Barren LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Reck m. LK1": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  // LK2
  "Boden m. LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "P.-Pferd LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Ringe LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Sprung m. LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Par.-Barren LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Reck m. LK2": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  // LK3
  "Boden m. LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "P.-Pferd LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Ringe LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Sprung m. LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Par.-Barren LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  "Reck m. LK3": [
    { name: "D-Note", sortierung: 1 },
    { name: "E-Note", sortierung: 2 },
    { name: "N-Abzüge", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ],
  // AK devices
  "Boden AK": [
    { name: "Ausgangswert", sortierung: 1 },
    { name: "AbzugAusf.", sortierung: 2 },
    { name: "AbzugSonst.", sortierung: 3 },
    { name: "Endwert", sortierung: 4 }
  ]
};

// P-exercise fields (used for P1-P9)
const pFields = [
  { name: "Stufe", sortierung: 1 },
  { name: "AbzugAusf.", sortierung: 2 },
  { name: "Endwert", sortierung: 3 }
];

// Formulas
const formulas = [
  {
    name: "P-Wettkampf",
    formula: "(10 + A) - B",
    type: 0,
    description: "P-Stufen Wettkampf (Stufe + 10 - Abzug)"
  },
  {
    name: "AK",
    formula: "A - B - C",
    type: 0,
    description: "Alterklassen (Ausgangswert - Abzug Ausf. - Abzug Sonst.)"
  },
  {
    name: "LK",
    formula: "A + B - C",
    type: 0,
    description: "Leistungsklassen (D-Note + E-Note - N-Abzüge)"
  }
];

// Devices
const devices = [
  // Basic devices
  { name: "Boden", anzeigename: "Boden", kurzname: "BODEN", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "Pauschenpferd", anzeigename: "Pauschenpferd", kurzname: "PFERD", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false },
  { name: "Ringe", anzeigename: "Ringe", kurzname: "RINGE", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false },
  { name: "Sprung", anzeigename: "Sprung", kurzname: "SPRNG", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "Barren", anzeigename: "Barren", kurzname: "BARR", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false },
  { name: "Reck", anzeigename: "Reck", kurzname: "RECK", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false },
  { name: "Sprung w", anzeigename: "Sprung", kurzname: "SPRNG", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true },
  { name: "Stufenbarren", anzeigename: "Stufenbarren", kurzname: "STUBA", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/stufenbarren.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true },
  { name: "Schwebebalken", anzeigename: "Schwebebalken", kurzname: "BALKN", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/balken.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true },
  { name: "Boden w", anzeigename: "Boden", kurzname: "BODEN", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true },
  { name: "Minitrampolin", anzeigename: "Minitrampolin", kurzname: "MINIT", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/minitrampolin.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "Gerätebahn A", anzeigename: "Gerätebahn A", kurzname: "GBAHA", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/geraetebahn.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "Gerätebahn B", anzeigename: "Gerätebahn B", kurzname: "GBAHB", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/geraetebahn.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  
  // Level categories
  { name: "LK1", anzeigename: "LK1", kurzname: "LK1  ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: true },
  { name: "LK2", anzeigename: "LK2", kurzname: "LK2  ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: true },
  { name: "LK3", anzeigename: "LK3", kurzname: "LK3  ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: true },
  { name: "AK", anzeigename: "AK", kurzname: "AK   ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "AK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "KM", anzeigename: "KM", kurzname: "KM   ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "KM2", anzeigename: "KM2", kurzname: "KM2  ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  { name: "KM3", anzeigename: "KM3", kurzname: "KM3  ", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: true },
  
  // Turn10 devices
  { name: "Boden Turn10® Basis", anzeigename: "Boden Turn10® Basis", kurzname: "BOD10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["Boden Turn10® Basis"] },
  { name: "Balken/Bank Turn10® Basis", anzeigename: "Balken/Bank Turn10® Basis", kurzname: "BLK10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/balken.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["Balken/Bank Turn10® Basis"] },
  { name: "P-Barren Turn10® Basis", anzeigename: "P-Barren Turn10® Basis", kurzname: "PBR10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["P-Barren Turn10® Basis"] },
  { name: "Minitrampolin Turn10® Basis", anzeigename: "Minitrampolin Turn10® Basis", kurzname: "MNT10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/minitrampolin.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["Minitrampolin Turn10® Basis"] },
  { name: "Reck/St-Barren Turn10® Basis", anzeigename: "Reck/St-Barren Turn10® Basis", kurzname: "RKS10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["Reck/St-Barren Turn10® Basis"] },
  { name: "Sprung Turn10® Basis", anzeigename: "Sprung Turn10® Basis", kurzname: "SPR10", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "P-Wettkampf", sport: "Turnen DTB Turn10", bol_m: true, bol_w: true, fields: deviceFieldMap["Sprung Turn10® Basis"] },
  
  // Kür devices
  { name: "Boden m. Kür", anzeigename: "Boden", kurzname: "BODEN", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false, fields: deviceFieldMap["Boden m. Kür"] },
  { name: "P.-Pferd Kür", anzeigename: "Pferd", kurzname: "PFERD", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false, fields: deviceFieldMap["P.-Pferd Kür"] },
  { name: "Ringe m.", anzeigename: "Ringe", kurzname: "RINGE", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false, fields: deviceFieldMap["Ringe m."] },
  { name: "Sprung m. Kür", anzeigename: "Sprung", kurzname: "SPRNG", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false, fields: deviceFieldMap["Sprung m. Kür"] },
  { name: "Par.-Barren Kür", anzeigename: "Barren", kurzname: "BARR", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true, fields: deviceFieldMap["Par.-Barren Kür"] },
  { name: "Reck m. Kür", anzeigename: "Reck", kurzname: "RECK", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "LK", sport: "Turnen DTB", bol_m: true, bol_w: false, fields: deviceFieldMap["Reck m. Kür"] },
  { name: "Boden w. Kür", anzeigename: "Boden", kurzname: "BODEN", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true, fields: deviceFieldMap["Boden w. Kür"] },
  { name: "Sprung w. Kür", anzeigename: "Sprung", kurzname: "SPRNG", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB", bol_m: false, bol_w: true, fields: deviceFieldMap["Sprung w. Kür"] },
  
  // LK1 devices
  { name: "Boden m. LK1", anzeigename: "Boden m. LK1", kurzname: "BODL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Boden m. LK1"] },
  { name: "P.-Pferd LK1", anzeigename: "P.-Pferd LK1", kurzname: "PFRL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["P.-Pferd LK1"] },
  { name: "Ringe LK1", anzeigename: "Ringe LK1", kurzname: "RINL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Ringe LK1"] },
  { name: "Sprung m. LK1", anzeigename: "Sprung m. LK1", kurzname: "SPRL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Sprung m. LK1"] },
  { name: "Par.-Barren LK1", anzeigename: "Par.-Barren LK1", kurzname: "PBRL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "LK", sport: "Turnen DTB LK", bol_m: false, bol_w: true, fields: deviceFieldMap["Par.-Barren LK1"] },
  { name: "Reck m. LK1", anzeigename: "Reck m. LK1", kurzname: "REKL1", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Reck m. LK1"] },
  
  // LK2 devices
  { name: "Boden m. LK2", anzeigename: "Boden m. LK2", kurzname: "BODL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Boden m. LK2"] },
  { name: "P.-Pferd LK2", anzeigename: "P.-Pferd LK2", kurzname: "PFRL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["P.-Pferd LK2"] },
  { name: "Ringe LK2", anzeigename: "Ringe LK2", kurzname: "RINL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Ringe LK2"] },
  { name: "Sprung m. LK2", anzeigename: "Sprung m. LK2", kurzname: "SPRL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Sprung m. LK2"] },
  { name: "Par.-Barren LK2", anzeigename: "Par.-Barren LK2", kurzname: "PBRL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "LK", sport: "Turnen DTB LK", bol_m: false, bol_w: true, fields: deviceFieldMap["Par.-Barren LK2"] },
  { name: "Reck m. LK2", anzeigename: "Reck m. LK2", kurzname: "REKL2", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Reck m. LK2"] },
  
  // LK3 devices
  { name: "Boden m. LK3", anzeigename: "Boden m. LK3", kurzname: "BODL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Boden m. LK3"] },
  { name: "P.-Pferd LK3", anzeigename: "P.-Pferd LK3", kurzname: "PFRL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["P.-Pferd LK3"] },
  { name: "Ringe LK3", anzeigename: "Ringe LK3", kurzname: "RINL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Ringe LK3"] },
  { name: "Sprung m. LK3", anzeigename: "Sprung m. LK3", kurzname: "SPRL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Sprung m. LK3"] },
  { name: "Par.-Barren LK3", anzeigename: "Par.-Barren LK3", kurzname: "PBRL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "LK", sport: "Turnen DTB LK", bol_m: false, bol_w: true, fields: deviceFieldMap["Par.-Barren LK3"] },
  { name: "Reck m. LK3", anzeigename: "Reck m. LK3", kurzname: "REKL3", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "LK", sport: "Turnen DTB LK", bol_m: true, bol_w: false, fields: deviceFieldMap["Reck m. LK3"] },
  
  // AK devices
  { name: "Boden AK", anzeigename: "Boden AK", kurzname: "BODAK", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "AK", sport: "Turnen DTB", bol_m: true, bol_w: true, fields: deviceFieldMap["Boden AK"] },
  
  // P-devices (collection devices P1-P9)
  { name: "Boden m. P1-P9", anzeigename: "Boden m. P1-P9", kurzname: "BODP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: true, bol_w: false, isP: true, fields: pFields },
  { name: "Pauschenpferd P1-P9", anzeigename: "Pauschenpferd P1-P9", kurzname: "PFERP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/seitpferd.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: true, bol_w: false, isP: true, fields: pFields },
  { name: "Ringe P1-P9", anzeigename: "Ringe P1-P9", kurzname: "RINGP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/ringe.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: true, bol_w: false, isP: true, fields: pFields },
  { name: "Sprung m. P1-P9", anzeigename: "Sprung m. P1-P9", kurzname: "SPRP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: true, bol_w: false, isP: true, fields: pFields },
  { name: "Par.-Barren P1-P9", anzeigename: "Par.-Barren P1-P9", kurzname: "PBARP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/barren.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: false, bol_w: true, isP: true, fields: pFields },
  { name: "Reck m. P1-P9", anzeigename: "Reck m. P1-P9", kurzname: "RECKP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/reck.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: true, bol_w: false, isP: true, fields: pFields },
  { name: "Sprung w. P1-P9", anzeigename: "Sprung w. P1-P9", kurzname: "SPRWP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/sprung.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: false, bol_w: true, isP: true, fields: pFields },
  { name: "Reck/StuBa. P1-P9", anzeigename: "Reck/StuBa. P1-P9", kurzname: "RKSBP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/stufenbarren.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: false, bol_w: true, isP: true, fields: pFields },
  { name: "Schwebebalken P1-P9", anzeigename: "Schwebebalken P1-P9", kurzname: "BALKP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/balken.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: false, bol_w: true, isP: true, fields: pFields },
  { name: "Boden w. P1-P9", anzeigename: "Boden w. P1-P9", kurzname: "BODWP", eingabemaske: "0.00", einheit: "Pkt.", symbol: "/icons/boden.png", formula: "P-Wettkampf", sport: "Turnen DTB P", bol_m: false, bol_w: true, isP: true, fields: pFields }
];

// Combine into final structure
const gymnetData = {
  formulas,
  devices,
  metadata: {
    generated: new Date().toISOString(),
    description: "GymNet preset data for TurnFix database initialization",
    totalFormulas: formulas.length,
    totalDevices: devices.length
  }
};

// Write to JSON file
const outputDir = path.join(__dirname, '../src/data/json');
const outputPath = path.join(outputDir, 'disciplines-gymnet.json');

fs.writeFileSync(
  outputPath,
  JSON.stringify(gymnetData, null, 2),
  'utf-8'
);

console.log(`✅ Converted ${gymnetData.formulas.length} formulas and ${gymnetData.devices.length} devices to disciplines-gymnet.json`);
console.log(`   Total devices with fields: ${devices.filter(d => d.fields).length}`);
console.log('✅ GymNet conversion complete!');

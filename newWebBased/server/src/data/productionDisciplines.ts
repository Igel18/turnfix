/**
 * Production Disciplines Data
 * 
 * Extracted from TurnFix production database
 * Date: 2026-01-27
 * Total: 139 disciplines across 12 sports
 * 
 * This file contains all disciplines with their complete configuration:
 * - Basic info (name, shortnames, formula, calculation type)
 * - Input mask, attempts, unit
 * - Gender and lane configuration
 * - Associated fields with sort order and flags
 */

export interface DisciplineField {
  name: string;
  sortierung: number;
  endwert: boolean;
  ausgangswert: boolean;
  gruppe: number;
  enabled: boolean;
}

export interface ProductionDiscipline {
  name: string;
  kurzname: string;
  anzeigename: string;
  formel: string | null;
  berechnungstyp: number;
  maske: string;
  versuche: number;
  einheit: string;
  icon: string;
  kuerzel: string;
  sportart: string;
  maennlich: boolean;
  weiblich: boolean;
  bahnen: boolean;
  berechnen: boolean;
  formelName?: string;
  felder?: DisciplineField[];
}

export const PRODUCTION_DISCIPLINES: ProductionDiscipline[] = [
  // Balken - Turnen
  {
    name: "Balken",
    kurzname: "BALK",
    anzeigename: "Balken",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/balken.png",
    kuerzel: "Ctrl+Shift+R",
    sportart: "Turnen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Neutrale Abzüge",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 4,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 5,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note | B-Note",
        sortierung: 5,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      }
    ]
  },
  // Bank - Turnen
  {
    name: "Bank",
    kurzname: "BANK",
    anzeigename: "Bank",
    formel: "1*x",
    berechnungstyp: 3,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/bank.png",
    kuerzel: "",
    sportart: "Turnen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral"
  },
  // Barren - Turnen
  {
    name: "Barren",
    kurzname: "BARR",
    anzeigename: "Barren",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/barren.png",
    kuerzel: "Ctrl+Shift+W",
    sportart: "Turnen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden - Turnen
  {
    name: "Boden",
    kurzname: "BODEN",
    anzeigename: "Boden",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt. ",
    icon: ":/icons/boden.png",
    kuerzel: "Ctrl+Shift+E",
    sportart: "Turnen",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Gerätebahn A - Turnen
  {
    name: "Gerätebahn A",
    kurzname: "GA",
    anzeigename: "GBahn A",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/boden.png",
    kuerzel: "Ctrl+Shift+A",
    sportart: "Turnen",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral"
  },
  // Gerätebahn B - Turnen
  {
    name: "Gerätebahn B",
    kurzname: "GB",
    anzeigename: "GBahn B",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/boden.png",
    kuerzel: "Ctrl+Shift+B",
    sportart: "Turnen",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "A-Note",
        sortierung: 0,
        endwert: false,
        ausgangswert: false,
        gruppe: 0,
        enabled: false
      },
      {
        name: "B-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 0,
        enabled: false
      }
    ]
  },
  // Pauschenpferd - Turnen
  {
    name: "Pauschenpferd",
    kurzname: "PPFR",
    anzeigename: "Pauschenpferd",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/seitpferd.png",
    kuerzel: "Ctrl+Shift+U",
    sportart: "Turnen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck - Turnen
  {
    name: "Reck",
    kurzname: "RECK",
    anzeigename: "Reck",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/reck.png",
    kuerzel: "Ctrl+Shift+T",
    sportart: "Turnen",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 0,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "P (Penalty) ",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 0,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe - Turnen
  {
    name: "Ringe",
    kurzname: "RINGE",
    anzeigename: "Ringe",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/ringe.png",
    kuerzel: "Ctrl+Shift+I",
    sportart: "Turnen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung - Turnen
  {
    name: "Sprung",
    kurzname: "SPRU",
    anzeigename: "Sprung",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/sprung.png",
    kuerzel: "Ctrl+Shift+Q",
    sportart: "Turnen",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 0,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "P (Penalty)",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 0,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 0,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 0,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 5,
        endwert: false,
        ausgangswert: false,
        gruppe: 0,
        enabled: false
      }
    ]
  },
  // Stufenbarren - Turnen
  {
    name: "Stufenbarren",
    kurzname: "STBARR",
    anzeigename: "Stufenbarren",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "D+E-Neutral",
    felder: [
      {
        name: "D/A-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E/B-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Ausgangswert",
        sortierung: 3,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "D-Note",
        sortierung: 5,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "E-Note",
        sortierung: 6,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      }
    ]
  },
  // 1.000-m-Lauf - Leichtathletik
  {
    name: "1.000-m-Lauf",
    kurzname: "1000",
    anzeigename: "1000m",
    formel: "((((1000/x)-1,9231)/0,00566)/49)",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/1000.png",
    kuerzel: "Ctrl+Shift+S",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 1.000-m-Lauf - Leichtathletik
  {
    name: "1.000-m-Lauf",
    kurzname: "1000",
    anzeigename: "1000m",
    formel: "(((1000/x)-2,158)/0,006)/49",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/1000.png",
    kuerzel: "Ctrl+Shift+S",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 100-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "100-m-Lauf elektrische Zeitm.",
    kurzname: "100M",
    anzeigename: "100m-Lauf",
    formel: "(((100/x)-4,341)/0,00676)/49",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/100.png",
    kuerzel: "Ctrl+Shift+F12",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 100-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "100-m-Lauf elektrische Zeitm.",
    kurzname: "100M",
    anzeigename: "100m-Lauf",
    formel: "(((100/(x*0,90)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/100.png",
    kuerzel: "Ctrl+Shift+F12",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100-m-Lauf Handstoppung - Leichtathletik
  {
    name: "100-m-Lauf Handstoppung",
    kurzname: "100M",
    anzeigename: "100m-Lauf",
    formel: "(((100/((x+0,24)*0,90)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/100.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100-m-Lauf Handstoppung - Leichtathletik
  {
    name: "100-m-Lauf Handstoppung",
    kurzname: "100M",
    anzeigename: "100m-Lauf",
    formel: "(((100/(x+0,24)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/100.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 2.000-m-Lauf - Leichtathletik
  {
    name: "2.000-m-Lauf",
    kurzname: "2000",
    anzeigename: "2000m",
    formel: "(((2000/x)-1,784)/0,006)/49",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/2000.png",
    kuerzel: "Ctrl+Shift+D",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // 2.000-m-Lauf - Leichtathletik
  {
    name: "2.000-m-Lauf",
    kurzname: "2000",
    anzeigename: "2000m",
    formel: "(((2000/x)-1,584)/0,00566)/49",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/2000.png",
    kuerzel: "Ctrl+Shift+D",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // 3.000-m-Lauf - Leichtathletik
  {
    name: "3.000-m-Lauf",
    kurzname: "3000",
    anzeigename: "3000m",
    formel: "(((3000/x)-1,3)/0,006)/49",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/3000.png",
    kuerzel: "Ctrl+Shift+F",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // 50-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "50-m-Lauf elektrische Zeitm.",
    kurzname: "50M",
    anzeigename: "50m-Lauf",
    formel: "(((100/(x*1,7)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/50.png",
    kuerzel: "Ctrl+Shift+O",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "50-m-Lauf elektrische Zeitm.",
    kurzname: "50M",
    anzeigename: "50m-Lauf",
    formel: "(((100/(x*1,6)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/50.png",
    kuerzel: "Ctrl+Shift+O",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 50-m-Lauf Handstoppung - Leichtathletik
  {
    name: "50-m-Lauf Handstoppung",
    kurzname: "50M",
    anzeigename: "50m-Lauf",
    formel: "(((100/((x+0,24)*1,7)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/50.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50-m-Lauf Handstoppung - Leichtathletik
  {
    name: "50-m-Lauf Handstoppung",
    kurzname: "50M",
    anzeigename: "50m-Lauf",
    formel: "(((100/((x+0,24)*1,6)-4,341)/0,00676)/49)",
    berechnungstyp: 3,
    maske: "00.000",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/50.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 75-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "75-m-Lauf elektrische Zeitm.",
    kurzname: "75M",
    anzeigename: "75m-Lauf",
    formel: "(((100/(x*1,2)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/75.png",
    kuerzel: "Ctrl+Shift+P",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 75-m-Lauf elektrische Zeitm. - Leichtathletik
  {
    name: "75-m-Lauf elektrische Zeitm.",
    kurzname: "75M",
    anzeigename: "75m-Lauf",
    formel: "(((100/(x*1,3)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/75.png",
    kuerzel: "Ctrl+Shift+P",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 75-m-Lauf Handstoppung - Leichtathletik
  {
    name: "75-m-Lauf Handstoppung",
    kurzname: "75M",
    anzeigename: "75m-Lauf",
    formel: "(((100/((x+0,24)*1,2)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/75.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 75-m-Lauf Handstoppung - Leichtathletik
  {
    name: "75-m-Lauf Handstoppung",
    kurzname: "75M",
    anzeigename: "75m-Lauf",
    formel: "(((100/((x+0,24)*1,3)-4,341)/0,00676)/49)",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 1,
    einheit: "s",
    icon: ":/icons/75.png",
    kuerzel: "",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // Kugelstoßen + Medizinball - Leichtathletik
  {
    name: "Kugelstoßen + Medizinball",
    kurzname: "KUGEL",
    anzeigename: "Kugel",
    formel: "1,2*x",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/kugel.png",
    kuerzel: "Ctrl+Shift+J",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Kugelstoßen + Medizinball - Leichtathletik
  {
    name: "Kugelstoßen + Medizinball",
    kurzname: "KUGEL",
    anzeigename: "Kugel",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/kugel.png",
    kuerzel: "Ctrl+Shift+J",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // Schleuderball / Schlagball - Leichtathletik
  {
    name: "Schleuderball / Schlagball",
    kurzname: "SBALL",
    anzeigename: "Schleuderball",
    formel: "x/4,5",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/schleuder.png",
    kuerzel: "Ctrl+Shift+K",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // Schleuderball / Schlagball - Leichtathletik
  {
    name: "Schleuderball / Schlagball",
    kurzname: "SBALL",
    anzeigename: "Schleuderball",
    formel: "x/3,5",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/schleuder.png",
    kuerzel: "Ctrl+Shift+K",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Vollball - Leichtathletik
  {
    name: "Vollball",
    kurzname: "VBALL",
    anzeigename: "Vollball",
    formel: "x/1,5",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/ball.png",
    kuerzel: "Ctrl+Shift+L",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Vollball - Leichtathletik
  {
    name: "Vollball",
    kurzname: "VBALL",
    anzeigename: "Vollball",
    formel: "x/2,5",
    berechnungstyp: 2,
    maske: "00.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/ball.png",
    kuerzel: "Ctrl+Shift+L",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // Weitsprung / Zone - Leichtathletik
  {
    name: "Weitsprung / Zone",
    kurzname: "WEZ",
    anzeigename: "Weit (Zone)",
    formel: "2,2*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/weitzone.png",
    kuerzel: "Ctrl+Shift+G",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Weitsprung / Zone - Leichtathletik
  {
    name: "Weitsprung / Zone",
    kurzname: "WEZ",
    anzeigename: "Weit (Zone)",
    formel: "2*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/weitzone.png",
    kuerzel: "Ctrl+Shift+G",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // Weitsprung aus dem Stand - Leichtathletik
  {
    name: "Weitsprung aus dem Stand",
    kurzname: "WES",
    anzeigename: "Weit (Stand)",
    formel: "4*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/weitstand.png",
    kuerzel: "Ctrl+Shift+H",
    sportart: "Leichtathletik",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // Weitsprung aus dem Stand - Leichtathletik
  {
    name: "Weitsprung aus dem Stand",
    kurzname: "WES",
    anzeigename: "Weit (Stand)",
    formel: "4,4*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 3,
    einheit: "m",
    icon: ":/icons/weitstand.png",
    kuerzel: "Ctrl+Shift+H",
    sportart: "Leichtathletik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Easy Jump 30 - Rope-Skipping
  {
    name: "Easy Jump 30",
    kurzname: "EJ30",
    anzeigename: "Easy Jump 30",
    formel: "x/7,5",
    berechnungstyp: 0,
    maske: "000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/rope1.png",
    kuerzel: "Ctrl+Shift+F10",
    sportart: "Rope-Skipping",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Speed 30 - Rope-Skipping
  {
    name: "Speed 30",
    kurzname: "SPE30",
    anzeigename: "Speed 30",
    formel: "x/5",
    berechnungstyp: 0,
    maske: "000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/rope2.png",
    kuerzel: "Ctrl+Shift+F11",
    sportart: "Rope-Skipping",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Minitrampolin - Trampolin
  {
    name: "Minitrampolin",
    kurzname: "MTRAMP",
    anzeigename: "Tramp",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Trampolin",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // 10 m Streckentauchen - Schwimmen
  {
    name: "10 m Streckentauchen",
    kurzname: "10TAU",
    anzeigename: "10 Tauchen",
    formel: "12*(((100/(1,2*(15*x-16,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/10t.png",
    kuerzel: "Ctrl+Shift+F6",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // 10 m Streckentauchen - Schwimmen
  {
    name: "10 m Streckentauchen",
    kurzname: "10TAU",
    anzeigename: "10 Tauchen",
    formel: "12*(((100/(1,2*(15*x-16,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/10t.png",
    kuerzel: "Ctrl+Shift+F6",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // 100 m Brust - Schwimmen
  {
    name: "100 m Brust",
    kurzname: "100BR",
    anzeigename: "100 Brust",
    formel: "12*(((100/(1,2*(x-22,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100b.png",
    kuerzel: "Ctrl+Shift+C",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100 m Brust - Schwimmen
  {
    name: "100 m Brust",
    kurzname: "100BR",
    anzeigename: "100 Brust",
    formel: "12*(((100/(1,2*(x-14,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100b.png",
    kuerzel: "Ctrl+Shift+C",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 100 m Kraul - Schwimmen
  {
    name: "100 m Kraul",
    kurzname: "100KR",
    anzeigename: "100 Kraul",
    formel: "12*(((100/(1,2*(x-6,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100k.png",
    kuerzel: "Ctrl+Shift+N",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100 m Kraul - Schwimmen
  {
    name: "100 m Kraul",
    kurzname: "100KR",
    anzeigename: "100 Kraul",
    formel: "12*(((100/(1,2*x))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100k.png",
    kuerzel: "Ctrl+Shift+N",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 100 m Rücken - Schwimmen
  {
    name: "100 m Rücken",
    kurzname: "100RÜ",
    anzeigename: "100 Rücken",
    formel: "12*(((100/(1,2*(x-7,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100r.png",
    kuerzel: "Ctrl+Shift+F2",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 100 m Rücken - Schwimmen
  {
    name: "100 m Rücken",
    kurzname: "100RÜ",
    anzeigename: "100 Rücken",
    formel: "12*(((100/(1,2*(x-13,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100r.png",
    kuerzel: "Ctrl+Shift+F2",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100 m Schmetterling - Schwimmen
  {
    name: "100 m Schmetterling",
    kurzname: "100SM",
    anzeigename: "100 Schmetterling",
    formel: "12*(((100/(1,2*(x-11,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100s.png",
    kuerzel: "Ctrl+Shift+F5",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 100 m Schmetterling - Schwimmen
  {
    name: "100 m Schmetterling",
    kurzname: "100SM",
    anzeigename: "100 Schmetterling",
    formel: "12*(((100/(1,2*(x-5,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/100s.png",
    kuerzel: "Ctrl+Shift+F5",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 15 m Streckentauchen - Schwimmen
  {
    name: "15 m Streckentauchen",
    kurzname: "15TAU",
    anzeigename: "15 Tauchen",
    formel: "12*(((100/(1,2*(8*x-10,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/15t.png",
    kuerzel: "Ctrl+Shift+F7",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // 15 m Streckentauchen - Schwimmen
  {
    name: "15 m Streckentauchen",
    kurzname: "15TAU",
    anzeigename: "15 Tauchen",
    formel: "12*(((100/(1,2*(8*x-2,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/15t.png",
    kuerzel: "Ctrl+Shift+F7",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // 200 m Freistil - Schwimmen
  {
    name: "200 m Freistil",
    kurzname: "200FS",
    anzeigename: "200 Freistil",
    formel: "12*(((100/(1,2*(0,5*x-5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/200f.png",
    kuerzel: "Ctrl+Shift+F9",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 200 m Freistil - Schwimmen
  {
    name: "200 m Freistil",
    kurzname: "200FS",
    anzeigename: "200 Freistil",
    formel: "12*(((100/(1,2*(0,5*x-10,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/200f.png",
    kuerzel: "Ctrl+Shift+F9",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 25 m Brust - Schwimmen
  {
    name: "25 m Brust",
    kurzname: "25BR",
    anzeigename: "25 Brust",
    formel: "12*(((100/(1,2*(4*x-13,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25b.png",
    kuerzel: "Ctrl+Shift+Y",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 25 m Brust - Schwimmen
  {
    name: "25 m Brust",
    kurzname: "25BR",
    anzeigename: "25 Brust",
    formel: "12*(((100/(1,2*(4*x-13,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25b.png",
    kuerzel: "Ctrl+Shift+Y",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 25 m Kraul - Schwimmen
  {
    name: "25 m Kraul",
    kurzname: "25KR",
    anzeigename: "25 Kraul",
    formel: "12*(((100/(1,2*(4*x+6,3)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25k.png",
    kuerzel: "Ctrl+Shift+V",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 25 m Kraul - Schwimmen
  {
    name: "25 m Kraul",
    kurzname: "25KR",
    anzeigename: "25 Kraul",
    formel: "12*(((100/(1,2*(4*x+6,3)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25k.png",
    kuerzel: "Ctrl+Shift+V",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 25 m Rücken - Schwimmen
  {
    name: "25 m Rücken",
    kurzname: "25RÜ",
    anzeigename: "25 Rücken",
    formel: "12*(((100/(1,2*(4*x-5,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25r.png",
    kuerzel: "Ctrl+Shift+M",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 25 m Rücken - Schwimmen
  {
    name: "25 m Rücken",
    kurzname: "25RÜ",
    anzeigename: "25 Rücken",
    formel: "12*(((100/(1,2*(4*x-5,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25r.png",
    kuerzel: "Ctrl+Shift+M",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 25 m Schmetterling - Schwimmen
  {
    name: "25 m Schmetterling",
    kurzname: "25SM",
    anzeigename: "25 Schmetterling",
    formel: "12*(((100/(1,2*(4*x-1,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25s.png",
    kuerzel: "Ctrl+Shift+F3",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 25 m Schmetterling - Schwimmen
  {
    name: "25 m Schmetterling",
    kurzname: "25SM",
    anzeigename: "25 Schmetterling",
    formel: "12*(((100/(1,2*(4*x-1,7)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25s.png",
    kuerzel: "Ctrl+Shift+F3",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 25 m Streckentauchen - Schwimmen
  {
    name: "25 m Streckentauchen",
    kurzname: "25TAU",
    anzeigename: "25 Tauchen",
    formel: "12*(((100/(1,2*(4*x-2,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25t.png",
    kuerzel: "Ctrl+Shift+F8",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // 25 m Streckentauchen - Schwimmen
  {
    name: "25 m Streckentauchen",
    kurzname: "25TAU",
    anzeigename: "25 Tauchen",
    formel: "12*(((100/(1,2*(4*x+1,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/25t.png",
    kuerzel: "Ctrl+Shift+F8",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true
  },
  // 50 m Brust - Schwimmen
  {
    name: "50 m Brust",
    kurzname: "50BR",
    anzeigename: "50 Brust",
    formel: "12*(((100/(1,2*(2*x-18,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50b.png",
    kuerzel: "Ctrl+Shift+X",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 50 m Brust - Schwimmen
  {
    name: "50 m Brust",
    kurzname: "50BR",
    anzeigename: "50 Brust",
    formel: "12*(((100/(1,2*(2*x-10,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50b.png",
    kuerzel: "Ctrl+Shift+X",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50 m Kraul - Schwimmen
  {
    name: "50 m Kraul",
    kurzname: "50KR",
    anzeigename: "50 Kraul",
    formel: "12*(((100/(1,2*(2*x+3,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50k.png",
    kuerzel: "Ctrl+Shift+B",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50 m Kraul - Schwimmen
  {
    name: "50 m Kraul",
    kurzname: "50KR",
    anzeigename: "50 Kraul",
    formel: "12*(((100/(1,2*(2*x-2,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50k.png",
    kuerzel: "Ctrl+Shift+B",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 50 m Rücken - Schwimmen
  {
    name: "50 m Rücken",
    kurzname: "50RÜ",
    anzeigename: "50 Rücken",
    formel: "12*(((100/(1,2*(2*x-10,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50r.png",
    kuerzel: "Ctrl+Shift+F1",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // 50 m Rücken - Schwimmen
  {
    name: "50 m Rücken",
    kurzname: "50RÜ",
    anzeigename: "50 Rücken",
    formel: "12*(((100/(1,2*(2*x-4,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50r.png",
    kuerzel: "Ctrl+Shift+F1",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50 m Schmetterling - Schwimmen
  {
    name: "50 m Schmetterling",
    kurzname: "50SM",
    anzeigename: "50 Schmetterling",
    formel: "12*(((100/(1,2*(2*x-1,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50s.png",
    kuerzel: "Ctrl+Shift+F4",
    sportart: "Schwimmen",
    maennlich: true,
    weiblich: false,
    bahnen: true,
    berechnen: true
  },
  // 50 m Schmetterling - Schwimmen
  {
    name: "50 m Schmetterling",
    kurzname: "50SM",
    anzeigename: "50 Schmetterling",
    formel: "12*(((100/(1,2*(2*x-7,5)))-0,3))",
    berechnungstyp: 2,
    maske: "00:00.00",
    versuche: 1,
    einheit: "",
    icon: ":/icons/50s.png",
    kuerzel: "Ctrl+Shift+F4",
    sportart: "Schwimmen",
    maennlich: false,
    weiblich: true,
    bahnen: true,
    berechnen: true
  },
  // Ball - Gymnastik
  {
    name: "Ball",
    kurzname: "BALL",
    anzeigename: "Ball",
    formel: "1*x",
    berechnungstyp: 3,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/g-ball.png",
    kuerzel: "",
    sportart: "Gymnastik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Band - Gymnastik
  {
    name: "Band",
    kurzname: "BAND",
    anzeigename: "Band",
    formel: "1*x",
    berechnungstyp: 3,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/band.png",
    kuerzel: "",
    sportart: "Gymnastik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Keule - Gymnastik
  {
    name: "Keule",
    kurzname: "KEUL",
    anzeigename: "Keule",
    formel: "1*x",
    berechnungstyp: 3,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/keule.png",
    kuerzel: "",
    sportart: "Gymnastik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Reifen - Gymnastik
  {
    name: "Reifen",
    kurzname: "REIF",
    anzeigename: "Reifen",
    formel: "1*x",
    berechnungstyp: 3,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: ":/icons/reifen.png",
    kuerzel: "",
    sportart: "Gymnastik",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Alter - Alter
  {
    name: "Alter",
    kurzname: "ALTER",
    anzeigename: "alt",
    formel: "1*x",
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Alter",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Übung",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      }
    ]
  },
  // BalanceUndTreffen - Fitnesstreff
  {
    name: "BalanceUndTreffen",
    kurzname: "BAL_TR",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "000",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: false,
    formelName: "testFitnesstreff",
    felder: [
      {
        name: "A",
        sortierung: 1,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: false
      },
      {
        name: "B",
        sortierung: 2,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      }
    ]
  },
  // Ball Weitwurf - Fitnesstreff
  {
    name: "Ball Weitwurf",
    kurzname: "WEITWU",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "00.000",
    versuche: 2,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: false
  },
  // Eckkegeln - Fitnesstreff
  {
    name: "Eckkegeln",
    kurzname: "ECK_KE",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "00.000",
    versuche: 3,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Fitnesstest - Fitnesstreff
  {
    name: "Fitnesstest",
    kurzname: "FIT_TE",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "00.000",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: false
  },
  // Koordinationsübung - Fitnesstreff
  {
    name: "Koordinationsübung",
    kurzname: "KOORD",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "000",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Rumpfvorbeuge - Fitnesstreff
  {
    name: "Rumpfvorbeuge",
    kurzname: "RUMPFV",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "00.000",
    versuche: 2,
    einheit: "cm",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Standweitsprung - Fitnesstreff
  {
    name: "Standweitsprung",
    kurzname: "",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "00.000",
    versuche: 2,
    einheit: "m",
    icon: ":/icons/weitstand.png",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Werfen und Fangen - Fitnesstreff
  {
    name: "Werfen und Fangen",
    kurzname: "WER_FA",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "000",
    versuche: 1,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true
  },
  // Zielwurf - Fitnesstreff
  {
    name: "Zielwurf",
    kurzname: "ZIELW",
    anzeigename: "",
    formel: "1*x",
    berechnungstyp: 0,
    maske: "000",
    versuche: 5,
    einheit: "",
    icon: "",
    kuerzel: "",
    sportart: "Fitnesstreff",
    maennlich: false,
    weiblich: false,
    bahnen: false,
    berechnen: false,
    formelName: "Zielwurf Summe",
    felder: [
      {
        name: "Wert 1",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Wert 2",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Wert 3",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Wert 4",
        sortierung: 4,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      },
      {
        name: "Wert 5",
        sortierung: 5,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: false
      }
    ]
  },
  // AK - Turnen DTB
  {
    name: "AK",
    kurzname: "AK   ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "AK"
  },
  // Boden AK - Turnen DTB
  {
    name: "Boden AK",
    kurzname: "BODAK ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "AK",
    felder: [
      {
        name: "Ausgangswert",
        sortierung: 1,
        endwert: false,
        ausgangswert: true,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugSonst.",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden m. Kür - Turnen DTB
  {
    name: "Boden m. Kür",
    kurzname: "BODEN",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden w - Turnen DTB
  {
    name: "Boden w",
    kurzname: "BODEN",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // Boden w. Kür - Turnen DTB
  {
    name: "Boden w. Kür",
    kurzname: "BODEN",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // KM - Turnen DTB
  {
    name: "KM",
    kurzname: "KM   ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // KM2 - Turnen DTB
  {
    name: "KM2",
    kurzname: "KM2  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // KM3 - Turnen DTB
  {
    name: "KM3",
    kurzname: "KM3  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // P.-Pferd Kür - Turnen DTB
  {
    name: "P.-Pferd Kür",
    kurzname: "PFERD",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/seitpferd.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Par.-Barren Kür - Turnen DTB
  {
    name: "Par.-Barren Kür",
    kurzname: "BARREN",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck m. Kür - Turnen DTB
  {
    name: "Reck m. Kür",
    kurzname: "RECK",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe m. - Turnen DTB
  {
    name: "Ringe m.",
    kurzname: "RINGE",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/ringe.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Schwebebalken - Turnen DTB
  {
    name: "Schwebebalken",
    kurzname: "BALKN",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/balken.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // Sprung m. Kür - Turnen DTB
  {
    name: "Sprung m. Kür",
    kurzname: "SPRNG",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung w - Turnen DTB
  {
    name: "Sprung w",
    kurzname: "SPRNG",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // Sprung w. Kür - Turnen DTB
  {
    name: "Sprung w. Kür",
    kurzname: "SPRNG",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // Balken/Bank Turn10® Basis - Turnen DTB Turn10
  {
    name: "Balken/Bank Turn10® Basis",
    kurzname: "BLKT10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/balken.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden Turn10® Basis - Turnen DTB Turn10
  {
    name: "Boden Turn10® Basis",
    kurzname: "BODT10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Minitrampolin Turn10® Basis - Turnen DTB Turn10
  {
    name: "Minitrampolin Turn10® Basis",
    kurzname: "MNTT10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/minitrampolin.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // P-Barren Turn10® Basis - Turnen DTB Turn10
  {
    name: "P-Barren Turn10® Basis",
    kurzname: "PBRT10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck/St-Barren Turn10® Basis - Turnen DTB Turn10
  {
    name: "Reck/St-Barren Turn10® Basis",
    kurzname: "RKST10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung Turn10® Basis - Turnen DTB Turn10
  {
    name: "Sprung Turn10® Basis",
    kurzname: "SPRT10",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Wert",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Abzug",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Turn10 - Turnen DTB Turn10
  {
    name: "Turn10",
    kurzname: "TURN1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB Turn10",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf"
  },
  // Boden m. LK1 - Turnen DTB LK
  {
    name: "Boden m. LK1",
    kurzname: "BODLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden m. LK2 - Turnen DTB LK
  {
    name: "Boden m. LK2",
    kurzname: "BODLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Boden m. LK3 - Turnen DTB LK
  {
    name: "Boden m. LK3",
    kurzname: "BODLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // LK1 - Turnen DTB LK
  {
    name: "LK1",
    kurzname: "LK1  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // LK2 - Turnen DTB LK
  {
    name: "LK2",
    kurzname: "LK2  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // LK3 - Turnen DTB LK
  {
    name: "LK3",
    kurzname: "LK3  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/boden.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK"
  },
  // P.-Pferd LK1 - Turnen DTB LK
  {
    name: "P.-Pferd LK1",
    kurzname: "PFRLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/seitpferd.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // P.-Pferd LK2 - Turnen DTB LK
  {
    name: "P.-Pferd LK2",
    kurzname: "PFRLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/seitpferd.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // P.-Pferd LK3 - Turnen DTB LK
  {
    name: "P.-Pferd LK3",
    kurzname: "PFRLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/seitpferd.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Par.-Barren LK1 - Turnen DTB LK
  {
    name: "Par.-Barren LK1",
    kurzname: "PBRLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Par.-Barren LK2 - Turnen DTB LK
  {
    name: "Par.-Barren LK2",
    kurzname: "PBRLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Par.-Barren LK3 - Turnen DTB LK
  {
    name: "Par.-Barren LK3",
    kurzname: "PBRLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck m. LK1 - Turnen DTB LK
  {
    name: "Reck m. LK1",
    kurzname: "REKLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck m. LK2 - Turnen DTB LK
  {
    name: "Reck m. LK2",
    kurzname: "REKLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck m. LK3 - Turnen DTB LK
  {
    name: "Reck m. LK3",
    kurzname: "REKLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe LK1 - Turnen DTB LK
  {
    name: "Ringe LK1",
    kurzname: "RINLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/ringe.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe LK2 - Turnen DTB LK
  {
    name: "Ringe LK2",
    kurzname: "RINLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/ringe.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe LK3 - Turnen DTB LK
  {
    name: "Ringe LK3",
    kurzname: "RINLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/ringe.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung m. LK1 - Turnen DTB LK
  {
    name: "Sprung m. LK1",
    kurzname: "SPRLK1",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung m. LK2 - Turnen DTB LK
  {
    name: "Sprung m. LK2",
    kurzname: "SPRLK2",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung m. LK3 - Turnen DTB LK
  {
    name: "Sprung m. LK3",
    kurzname: "SPRLK3",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB LK",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "LK",
    felder: [
      {
        name: "D-Note",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "E-Note",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "N-Abzuege",
        sortierung: 3,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 4,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Par.-Barren P1-P9 - Turnen DTB P
  {
    name: "Par.-Barren P1-P9",
    kurzname: "PBARP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Pauschenpferd P1-P9 - Turnen DTB P
  {
    name: "Pauschenpferd P1-P9",
    kurzname: "PFERP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/seitpferd.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck m. P1-P9 - Turnen DTB P
  {
    name: "Reck m. P1-P9",
    kurzname: "RECKP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/reck.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Reck/StuBa. P1-P9 - Turnen DTB P
  {
    name: "Reck/StuBa. P1-P9",
    kurzname: "RKSBP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: ":/icons/barren.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Ringe P1-P9 - Turnen DTB P
  {
    name: "Ringe P1-P9",
    kurzname: "RINGEP",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/ringe.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Schwebebalken P1-P9 - Turnen DTB P
  {
    name: "Schwebebalken P1-P9",
    kurzname: "BALKP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/balken.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung m. P1-P9 - Turnen DTB P
  {
    name: "Sprung m. P1-P9",
    kurzname: "SPRP  ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: true,
    weiblich: false,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  },
  // Sprung w. P1-P9 - Turnen DTB P
  {
    name: "Sprung w. P1-P9",
    kurzname: "SPRWP ",
    anzeigename: "",
    formel: null,
    berechnungstyp: 2,
    maske: "0.00",
    versuche: 1,
    einheit: "Pkt.",
    icon: "/icons/sprung.png",
    kuerzel: "",
    sportart: "Turnen DTB P",
    maennlich: false,
    weiblich: true,
    bahnen: false,
    berechnen: true,
    formelName: "P-Wettkampf",
    felder: [
      {
        name: "Stufe",
        sortierung: 1,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "AbzugAusf.",
        sortierung: 2,
        endwert: false,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      },
      {
        name: "Endwert",
        sortierung: 3,
        endwert: true,
        ausgangswert: false,
        gruppe: 1,
        enabled: true
      }
    ]
  }
];

// Helper function: Get disciplines by sport
export function getDisciplinesBySport(sportName: string): ProductionDiscipline[] {
  return PRODUCTION_DISCIPLINES.filter(d => d.sportart === sportName);
}

// Helper function: Get all sport names
export function getAllSports(): string[] {
  const sports = new Set(PRODUCTION_DISCIPLINES.map(d => d.sportart));
  return Array.from(sports).sort();
}

// Helper function: Get discipline by name
export function getDisciplineByName(name: string): ProductionDiscipline | undefined {
  return PRODUCTION_DISCIPLINES.find(d => d.name === name);
}

// Sport statistics
export const SPORT_STATS = {
  'Alter': 1,
  'Fitnesstreff': 9,
  'Gymnastik': 4,
  'Leichtathletik': 27,
  'Rope-Skipping': 2,
  'Schwimmen': 32,
  'Trampolin': 1,
  'Turnen': 11,
  'Turnen DTB': 16,
  'Turnen DTB LK': 21,
  'Turnen DTB P': 8,
  'Turnen DTB Turn10': 7
};

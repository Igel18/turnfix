/**
 * Production Status Data
 * 
 * Extracted from TurnFix production database
 * Date: 2026-01-27
 * Total: 10 status types
 * 
 * Status types are used to track participant progress through the competition:
 * - Registration, squad assignment, score capture, certificate printing, etc.
 * - Each status has an associated color for visual identification
 * - Flags for "Bogen" (squad sheet) and "Karte" (participant card) printing
 */

export interface ProductionStatus {
  name: string;
  colorCode: string; // RGB format "{R,G,B}"
  bogen: boolean;    // Show on squad sheets
  karte: boolean;    // Show on participant cards
}

export const PRODUCTION_STATUSES: ProductionStatus[] = [
  {
    name: "kein Status",
    colorCode: "{255,255,255}",
    bogen: true,
    karte: true
  },
  {
    name: "Leistungen erfasst",
    colorCode: "{4,172,39}",
    bogen: true,
    karte: true
  },
  {
    name: "Meldung erfasst",
    colorCode: "{249,105,5}",
    bogen: true,
    karte: true
  },
  {
    name: "Riegen eingeteilt",
    colorCode: "{251,170,12}",
    bogen: true,
    karte: false
  },
  {
    name: "Riegenbogen gedruckt",
    colorCode: "{251,249,42}",
    bogen: true,
    karte: false
  },
  {
    name: "Riegenbogen im Wettkampfbüro",
    colorCode: "{0,255,0}",
    bogen: true,
    karte: false
  },
  {
    name: "Urkunde gedruckt",
    colorCode: "{5,201,252}",
    bogen: false,
    karte: true
  },
  {
    name: "Wettkampf gestartet",
    colorCode: "{108,208,34}",
    bogen: true,
    karte: true
  },
  {
    name: "Wettkampfkarte gedruckt",
    colorCode: "{251,249,42}",
    bogen: false,
    karte: true
  },
  {
    name: "Wettkampfkarte im Wettkampfbüro",
    colorCode: "{0,255,0}",
    bogen: false,
    karte: true
  }
];

// Helper function: Get status by name
export function getStatusByName(name: string): ProductionStatus | undefined {
  return PRODUCTION_STATUSES.find(s => s.name === name);
}

// Helper function: Parse color code to RGB
export function parseColorCode(colorCode: string): { r: number; g: number; b: number } | null {
  const match = colorCode.match(/\{(\d+),(\d+),(\d+)\}/);
  if (!match) return null;
  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3])
  };
}

// Helper function: Convert RGB to hex color
export function colorCodeToHex(colorCode: string): string {
  const rgb = parseColorCode(colorCode);
  if (!rgb) return '#FFFFFF';
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

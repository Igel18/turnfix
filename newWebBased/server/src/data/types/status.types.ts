/**
 * Status Type Definitions
 * 
 * Status types are used to track participant progress through the competition:
 * - Registration, squad assignment, score capture, certificate printing, etc.
 * - Each status has an associated color for visual identification
 * - Flags for "Bogen" (squad sheet) and "Karte" (participant card) printing
 */

export interface Status {
  name: string;
  colorCode: string; // RGB format "{R,G,B}"
  bogen: boolean;    // Show on squad sheets
  karte: boolean;    // Show on participant cards
}

/**
 * Helper function to parse RGB color code from "{R,G,B}" format
 */
export function parseColorCode(colorCode: string): { r: number; g: number; b: number } {
  const match = colorCode.match(/\{(\d+),(\d+),(\d+)\}/);
  if (!match) {
    throw new Error(`Invalid color code format: ${colorCode}`);
  }
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10)
  };
}

/**
 * Helper function to convert RGB color code to hex format
 */
export function colorCodeToHex(colorCode: string): string {
  const { r, g, b } = parseColorCode(colorCode);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

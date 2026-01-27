const fs = require('fs');
const path = require('path');

const data = fs.readFileSync(path.join(__dirname, 'status-export.json'), 'utf8');
const lines = data.split('\n');
const statuses = JSON.parse(lines.slice(1).join('\n'));

console.log(`Converting ${statuses.length} status entries to TypeScript module...\n`);

let output = `/**
 * Production Status Data
 * 
 * Extracted from TurnFix production database
 * Date: ${new Date().toISOString().split('T')[0]}
 * Total: ${statuses.length} status types
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

export const PRODUCTION_STATUSES: ProductionStatus[] = [\n`;

statuses.forEach((s, idx) => {
  output += `  {\n`;
  output += `    name: ${JSON.stringify(s.var_name)},\n`;
  output += `    colorCode: ${JSON.stringify(s.ary_colorcode)},\n`;
  output += `    bogen: ${s.bol_bogen},\n`;
  output += `    karte: ${s.bol_karte}\n`;
  output += `  }${idx < statuses.length - 1 ? ',' : ''}\n`;
});

output += `];\n\n`;

output += `// Helper function: Get status by name
export function getStatusByName(name: string): ProductionStatus | undefined {
  return PRODUCTION_STATUSES.find(s => s.name === name);
}

// Helper function: Parse color code to RGB
export function parseColorCode(colorCode: string): { r: number; g: number; b: number } | null {
  const match = colorCode.match(/\\{(\\d+),(\\d+),(\\d+)\\}/);
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
  return \`#\${toHex(rgb.r)}\${toHex(rgb.g)}\${toHex(rgb.b)}\`;
}\n`;

const outputPath = path.join(__dirname, '..', 'src', 'data', 'productionStatuses.ts');
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`✅ TypeScript module written to: ${outputPath}`);
console.log(`\nStatus entries: ${statuses.length}`);
statuses.forEach(s => {
  console.log(`  - ${s.var_name}`);
});

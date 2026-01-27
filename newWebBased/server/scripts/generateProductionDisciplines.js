const fs = require('fs');
const path = require('path');

// Read the exported disciplines
const data = fs.readFileSync(path.join(__dirname, 'disciplines-export.json'), 'utf8');
const lines = data.split('\n');
const disciplines = JSON.parse(lines.slice(1).join('\n'));

console.log(`Converting ${disciplines.length} disciplines to TypeScript module...\n`);

// Generate TypeScript code
let output = `/**
 * Production Disciplines Data
 * 
 * Extracted from TurnFix production database
 * Date: ${new Date().toISOString().split('T')[0]}
 * Total: ${disciplines.length} disciplines across 12 sports
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

export const PRODUCTION_DISCIPLINES: ProductionDiscipline[] = [\n`;

disciplines.forEach((d, idx) => {
  output += `  // ${d.var_name} - ${d.tfx_sport.var_name}\n`;
  output += `  {\n`;
  output += `    name: ${JSON.stringify(d.var_name)},\n`;
  output += `    kurzname: ${JSON.stringify(d.var_kurz1 || '')},\n`;
  output += `    anzeigename: ${JSON.stringify(d.var_kurz2 || '')},\n`;
  output += `    formel: ${d.var_formel ? JSON.stringify(d.var_formel) : 'null'},\n`;
  output += `    berechnungstyp: ${d.int_berechnung},\n`;
  output += `    maske: ${JSON.stringify(d.var_maske || '')},\n`;
  output += `    versuche: ${d.int_versuche || 1},\n`;
  output += `    einheit: ${JSON.stringify(d.var_einheit || '')},\n`;
  output += `    icon: ${JSON.stringify(d.var_icon || '')},\n`;
  output += `    kuerzel: ${JSON.stringify(d.var_kuerzel || '')},\n`;
  output += `    sportart: ${JSON.stringify(d.tfx_sport.var_name)},\n`;
  output += `    maennlich: ${d.bol_m},\n`;
  output += `    weiblich: ${d.bol_w},\n`;
  output += `    bahnen: ${d.bol_bahnen},\n`;
  output += `    berechnen: ${d.bol_berechnen}`;
  
  if (d.tfx_formeln) {
    output += `,\n    formelName: ${JSON.stringify(d.tfx_formeln.var_name)}`;
  }
  
  if (d.tfx_disziplinen_felder && d.tfx_disziplinen_felder.length > 0) {
    output += `,\n    felder: [\n`;
    d.tfx_disziplinen_felder.forEach((f, fi) => {
      output += `      {\n`;
      output += `        name: ${JSON.stringify(f.var_name)},\n`;
      output += `        sortierung: ${f.int_sortierung},\n`;
      output += `        endwert: ${f.bol_endwert},\n`;
      output += `        ausgangswert: ${f.bol_ausgangswert},\n`;
      output += `        gruppe: ${f.int_gruppe},\n`;
      output += `        enabled: ${f.bol_enabled}\n`;
      output += `      }${fi < d.tfx_disziplinen_felder.length - 1 ? ',' : ''}\n`;
    });
    output += `    ]`;
  }
  
  output += `\n  }${idx < disciplines.length - 1 ? ',' : ''}\n`;
});

output += `];\n\n`;

// Add helper functions
output += `// Helper function: Get disciplines by sport
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
${Array.from(new Set(disciplines.map(d => d.tfx_sport.var_name))).sort().map(sport => {
  const count = disciplines.filter(d => d.tfx_sport.var_name === sport).length;
  return `  '${sport}': ${count}`;
}).join(',\n')}
};\n`;

// Write to file
const outputPath = path.join(__dirname, '..', 'src', 'data', 'productionDisciplines.ts');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, 'utf8');

console.log(`✅ TypeScript module written to: ${outputPath}`);
console.log(`\nStatistics:`);
console.log(`  Total disciplines: ${disciplines.length}`);
console.log(`  Sports: ${new Set(disciplines.map(d => d.tfx_sport.var_name)).size}`);
console.log(`\nSport breakdown:`);
const sportGroups = {};
disciplines.forEach(d => {
  const sport = d.tfx_sport.var_name;
  sportGroups[sport] = (sportGroups[sport] || 0) + 1;
});
Object.keys(sportGroups).sort().forEach(sport => {
  console.log(`    ${sport}: ${sportGroups[sport]}`);
});

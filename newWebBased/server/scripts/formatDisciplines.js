const fs = require('fs');
const path = require('path');

// Read the exported disciplines
const data = fs.readFileSync(path.join(__dirname, 'disciplines-export.json'), 'utf8');
const lines = data.split('\n');
const disciplines = JSON.parse(lines.slice(1).join('\n')); // Skip "Found X disciplines" line

console.log(`Converting ${disciplines.length} disciplines to GymNet preset format...\n`);

// Group by sport
const sportGroups = {};
disciplines.forEach(d => {
  const sportName = d.tfx_sport.var_name;
  if (!sportGroups[sportName]) {
    sportGroups[sportName] = [];
  }
  sportGroups[sportName].push(d);
});

// Generate TypeScript code
let output = '// ============================================\n';
output += '// DISZIPLINEN AUS PRODUKTIV-DB EXTRAHIERT\n';
output += `// Datum: ${new Date().toISOString().split('T')[0]}\n`;
output += `// Anzahl: ${disciplines.length} Disziplinen\n`;
output += '// ============================================\n\n';

Object.keys(sportGroups).sort().forEach(sportName => {
  const sportDisciplines = sportGroups[sportName];
  output += `\n// ===== ${sportName.toUpperCase()} (${sportDisciplines.length} Disziplinen) =====\n\n`;
  
  sportDisciplines.forEach(d => {
    output += `  // ${d.var_name} (ID: ${d.int_disziplinenid})\n`;
    output += `  {\n`;
    output += `    name: '${d.var_name}',\n`;
    output += `    kurzname: '${d.var_kurz1 || ''}',\n`;
    output += `    anzeigename: '${d.var_kurz2 || ''}',\n`;
    output += `    formel: ${d.var_formel ? `'${d.var_formel}'` : 'null'},\n`;
    output += `    berechnungstyp: ${d.int_berechnung},\n`;
    output += `    maske: '${d.var_maske || ''}',\n`;
    output += `    versuche: ${d.int_versuche || 1},\n`;
    output += `    einheit: '${d.var_einheit || ''}',\n`;
    output += `    icon: '${d.var_icon || ''}',\n`;
    output += `    kuerzel: '${d.var_kuerzel || ''}',\n`;
    output += `    sportart: '${sportName}',\n`;
    output += `    maennlich: ${d.bol_m},\n`;
    output += `    weiblich: ${d.bol_w},\n`;
    output += `    bahnen: ${d.bol_bahnen},\n`;
    output += `    berechnen: ${d.bol_berechnen},\n`;
    
    // Formula reference
    if (d.tfx_formeln) {
      output += `    formelName: '${d.tfx_formeln.var_name}',\n`;
    }
    
    // Fields
    if (d.tfx_disziplinen_felder && d.tfx_disziplinen_felder.length > 0) {
      output += `    felder: [\n`;
      d.tfx_disziplinen_felder.forEach(f => {
        output += `      {\n`;
        output += `        name: '${f.var_name}',\n`;
        output += `        sortierung: ${f.int_sortierung},\n`;
        output += `        endwert: ${f.bol_endwert},\n`;
        output += `        ausgangswert: ${f.bol_ausgangswert},\n`;
        output += `        gruppe: ${f.int_gruppe},\n`;
        output += `        enabled: ${f.bol_enabled}\n`;
        output += `      },\n`;
      });
      output += `    ]\n`;
    }
    
    output += `  },\n`;
  });
});

// Write to file
fs.writeFileSync(path.join(__dirname, 'disciplines-formatted.ts'), output, 'utf8');
console.log('✅ Formatted disciplines written to disciplines-formatted.ts');
console.log(`\nSportarten:`);
Object.keys(sportGroups).sort().forEach(sport => {
  console.log(`  - ${sport}: ${sportGroups[sport].length} Disziplinen`);
});

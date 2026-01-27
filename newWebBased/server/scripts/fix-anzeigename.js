/**
 * Fix empty anzeigename fields in disciplines-production.json
 * Sets anzeigename to name value when anzeigename is empty
 */

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'json', 'disciplines-production.json');

console.log('Loading disciplines from:', jsonPath);

// Load JSON
const disciplines = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log(`Total disciplines: ${disciplines.length}`);

let fixedCount = 0;

// Fix empty anzeigename fields
disciplines.forEach(disc => {
  if (!disc.anzeigename || disc.anzeigename.trim() === '') {
    disc.anzeigename = disc.name;
    fixedCount++;
    console.log(`Fixed: "${disc.name}" -> anzeigename set to "${disc.anzeigename}"`);
  }
});

console.log(`\nFixed ${fixedCount} disciplines with empty anzeigename`);

// Write back to file with pretty formatting
fs.writeFileSync(jsonPath, JSON.stringify(disciplines, null, 2), 'utf-8');

console.log('✅ disciplines-production.json updated successfully');

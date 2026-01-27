// Simple Node.js script to convert TS data to JSON
const fs = require('fs');
const path = require('path');

// Load the built TypeScript data
const { PRODUCTION_DISCIPLINES } = require('../dist/data/productionDisciplines');
const { PRODUCTION_STATUSES } = require('../dist/data/productionStatuses');

const outputDir = path.join(__dirname, '../src/data/json');

// Convert production disciplines
const disciplinesPath = path.join(outputDir, 'disciplines-production.json');
fs.writeFileSync(
  disciplinesPath,
  JSON.stringify(PRODUCTION_DISCIPLINES, null, 2),
  'utf-8'
);
console.log(`✅ Converted ${PRODUCTION_DISCIPLINES.length} disciplines to disciplines-production.json`);

// Convert production statuses
const statusesPath = path.join(outputDir, 'statuses-production.json');
fs.writeFileSync(
  statusesPath,
  JSON.stringify(PRODUCTION_STATUSES, null, 2),
  'utf-8'
);
console.log(`✅ Converted ${PRODUCTION_STATUSES.length} statuses to statuses-production.json`);

console.log('✅ All conversions complete!');

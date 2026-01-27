/**
 * Script to convert TypeScript data to JSON format
 * Run: node --loader ts-node/esm convertToJson.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the TypeScript data
import { PRODUCTION_DISCIPLINES } from '../src/data/productionDisciplines.js';
import { PRODUCTION_STATUSES } from '../src/data/productionStatuses.js';

const outputDir = path.join(__dirname, '../src/data/json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Convert production disciplines
const disciplinesPath = path.join(outputDir, 'disciplines-production.json');
fs.writeFileSync(
  disciplinesPath,
  JSON.stringify(PRODUCTION_DISCIPLINES, null, 2),
  'utf-8'
);
console.log(`✅ Converted ${PRODUCTION_DISCIPLINES.length} disciplines to ${disciplinesPath}`);

// Convert production statuses
const statusesPath = path.join(outputDir, 'statuses-production.json');
fs.writeFileSync(
  statusesPath,
  JSON.stringify(PRODUCTION_STATUSES, null, 2),
  'utf-8'
);
console.log(`✅ Converted ${PRODUCTION_STATUSES.length} statuses to ${statusesPath}`);

console.log('✅ All conversions complete!');

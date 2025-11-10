/**
 * Generate build information for the client
 * Creates a build-info.json file with git hash, branch, and timestamp
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Get git information
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const gitBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const gitCommitDate = execSync('git log -1 --format=%cd --date=iso').toString().trim();
  
  // Build information
  const buildInfo = {
    gitHash,
    gitBranch,
    gitCommitDate,
    buildTimestamp: new Date().toISOString(),
    buildDate: new Date().toLocaleString('de-DE', { 
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  // Write to src directory (will be included in build)
  const outputPath = path.resolve(__dirname, '../src/build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

  console.log('✅ Build info generated:');
  console.log(`   Git Hash: ${gitHash}`);
  console.log(`   Branch: ${gitBranch}`);
  console.log(`   Build Time: ${buildInfo.buildDate}`);
} catch (error) {
  console.error('❌ Error generating build info:', error.message);
  
  // Fallback: create a build info without git data
  const fallbackInfo = {
    gitHash: 'unknown',
    gitBranch: 'unknown',
    gitCommitDate: 'unknown',
    buildTimestamp: new Date().toISOString(),
    buildDate: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
  };
  
  const outputPath = path.resolve(__dirname, '../src/build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(fallbackInfo, null, 2));
  
  console.log('⚠️  Created fallback build info (git not available)');
}

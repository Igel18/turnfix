/**
 * Generate build information for the server
 * Creates a build-info.json file with git hash, branch, and timestamp
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

  // Write to src directory (will be compiled)
  const outputPath = path.resolve(__dirname, '../src/build-info.json');
  fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));

  console.log('✅ Server build info generated:');
  console.log(`   Git Hash: ${gitHash}`);
  console.log(`   Branch: ${gitBranch}`);
  console.log(`   Build Time: ${buildInfo.buildDate}`);
} catch (error) {
  console.error('❌ Error generating server build info:', error.message);
  
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
  
  console.log('⚠️  Created fallback server build info (git not available)');
}

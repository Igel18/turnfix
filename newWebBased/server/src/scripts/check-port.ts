#!/usr/bin/env node
/**
 * Port Checker CLI Tool
 * Usage: npm run check-port [port] [--kill] [--force]
 */

import { ensurePortAvailable, getPortBlocker } from '../utils/portChecker';

// Parse command line arguments
const args = process.argv.slice(2);
const portArg = args.find(arg => !arg.startsWith('--'));
const port = portArg ? parseInt(portArg) : parseInt(process.env.PORT || '3001');
const autoKill = args.includes('--kill');
const force = args.includes('--force');

console.log('🔍 TurnFix Port Checker');
console.log('======================\n');

if (isNaN(port)) {
  console.error('❌ Invalid port number');
  console.log('\nUsage: npm run check-port [port] [--kill] [--force]');
  console.log('  port      Port number to check (default: 3001)');
  console.log('  --kill    Automatically kill blocking process');
  console.log('  --force   Force kill blocking process (use with --kill)');
  console.log('\nExamples:');
  console.log('  npm run check-port 3001');
  console.log('  npm run check-port 3001 --kill');
  console.log('  npm run check-port 5173 --kill --force');
  process.exit(1);
}

async function main() {
  try {
    const available = await ensurePortAvailable(port, autoKill, force);
    
    if (available) {
      console.log(`\n✅ Port ${port} is ready to use`);
      process.exit(0);
    } else {
      console.log(`\n❌ Port ${port} is not available`);
      
      if (!autoKill) {
        console.log('\n💡 Run with --kill to automatically stop the blocking process:');
        console.log(`   npm run check-port ${port} --kill`);
      }
      
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

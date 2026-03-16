/**
 * Unit tests for ecosystem.config.js and PM2 environment configuration.
 * 
 * Item 8: After creating a new DB via wizard, the PM2 server must use the new DB.
 * 
 * Root Cause: ecosystem.config.js hardcodes DATABASE_URL in the env section,
 * which overrides the .env file when PM2 starts/restarts the server.
 * 
 * Fix: Remove DATABASE_URL from ecosystem.config.js env section so that
 * the .env file is the single source of truth for database configuration.
 */

import * as fs from 'fs';
import * as path from 'path';

const ECOSYSTEM_PATH = path.join(__dirname, '..', '..', '..', 'ecosystem.config.js');

describe('PM2 ecosystem.config.js', () => {
  let ecosystemContent: string;
  
  beforeAll(() => {
    ecosystemContent = fs.readFileSync(ECOSYSTEM_PATH, 'utf-8');
  });

  describe('DATABASE_URL must NOT be hardcoded in ecosystem.config.js', () => {
    it('should not contain DATABASE_URL in the env section for turnfix-server', () => {
      // The ecosystem.config.js must NOT hardcode DATABASE_URL because:
      // 1. The wizard updates .env with the new DATABASE_URL
      // 2. PM2's env section OVERRIDES .env values
      // 3. This causes PM2 to always connect to the old DB after restart
      expect(ecosystemContent).not.toMatch(/env:\s*\{[^}]*DATABASE_URL/);
    });

    it('should not contain any DATABASE_URL string in env sections', () => {
      // Parse the ecosystem config and check each app's env section
      // We use a simple regex check since we can't easily require a .js file with module.exports
      const databaseUrlMatches = ecosystemContent.match(/DATABASE_URL/g);
      expect(databaseUrlMatches).toBeNull();
    });

    it('should still have NODE_ENV and PORT in the env section', () => {
      // These static values are fine in ecosystem.config.js
      expect(ecosystemContent).toContain('NODE_ENV');
      expect(ecosystemContent).toContain('PORT');
    });
  });
});

describe('Configuration Save - ecosystem.config.js consistency', () => {
  
  describe('.env is the single source of truth for DATABASE_URL', () => {
    it('.env file should exist', () => {
      const envPath = path.join(__dirname, '..', '..', '.env');
      expect(fs.existsSync(envPath)).toBe(true);
    });

    it('.env should contain DATABASE_URL', () => {
      const envPath = path.join(__dirname, '..', '..', '.env');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      expect(envContent).toContain('DATABASE_URL');
    });

    it('.env DATABASE_URL should point to a valid postgresql connection', () => {
      const envPath = path.join(__dirname, '..', '..', '.env');
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const match = envContent.match(/DATABASE_URL="?(postgresql:\/\/[^"\s]+)"?/);
      expect(match).not.toBeNull();
      expect(match![1]).toMatch(/^postgresql:\/\/.+@.+:\d+\/.+/);
    });
  });
});

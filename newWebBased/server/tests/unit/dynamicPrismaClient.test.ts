/**
 * Unit Tests — dynamicPrismaClient.ts (pure functions only)
 *
 * Tests for connection string building/parsing round-trip.
 */

import { buildConnectionString, parseConnectionString } from '../../src/utils/dynamicPrismaClient';

describe('dynamicPrismaClient – connection strings', () => {
  // ────────────────────────────────────────────────────────────────────────
  // buildConnectionString
  // ────────────────────────────────────────────────────────────────────────

  describe('buildConnectionString', () => {
    it('should build a valid PostgreSQL URL', () => {
      const url = buildConnectionString({
        db_host: 'localhost',
        db_port: 5432,
        db_name: 'turnfix',
        db_user: 'postgres',
        db_password: 'secret',
      });
      expect(url).toBe('postgresql://postgres:secret@localhost:5432/turnfix?schema=public');
    });

    it('should include special characters in password', () => {
      const url = buildConnectionString({
        db_host: '10.0.0.1',
        db_port: 5433,
        db_name: 'my_db',
        db_user: 'admin',
        db_password: 'p@ss!w0rd#',
      });
      expect(url).toContain('admin:p@ss!w0rd#@');
      expect(url).toContain(':5433/');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // parseConnectionString
  // ────────────────────────────────────────────────────────────────────────

  describe('parseConnectionString', () => {
    it('should parse a valid connection string', () => {
      const result = parseConnectionString('postgresql://myuser:mypass@dbhost:5432/mydb?schema=public');
      expect(result).toEqual({
        db_user: 'myuser',
        db_password: 'mypass',
        db_host: 'dbhost',
        db_port: 5432,
        db_name: 'mydb',
      });
    });

    it('should throw for invalid URL', () => {
      expect(() => parseConnectionString('not-a-url')).toThrow('Invalid DATABASE_URL format');
    });

    it('should throw for empty string', () => {
      expect(() => parseConnectionString('')).toThrow();
    });

    it('should parse URL without query params', () => {
      const result = parseConnectionString('postgresql://u:p@h:5432/db');
      expect(result.db_name).toBe('db');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Round-trip: build → parse
  // ────────────────────────────────────────────────────────────────────────

  describe('round-trip', () => {
    it('should survive build → parse cycle', () => {
      const original = {
        db_host: 'prod-server',
        db_port: 5433,
        db_name: 'turnfix_live',
        db_user: 'admin',
        db_password: 'S3cure!',
      };
      const url = buildConnectionString(original);
      const parsed = parseConnectionString(url);
      expect(parsed).toEqual(original);
    });

    it('should survive multiple round-trips', () => {
      const original = {
        db_host: 'localhost',
        db_port: 5432,
        db_name: 'test',
        db_user: 'user',
        db_password: 'pass',
      };
      const url1 = buildConnectionString(original);
      const parsed1 = parseConnectionString(url1);
      const url2 = buildConnectionString(parsed1);
      const parsed2 = parseConnectionString(url2);
      expect(parsed2).toEqual(original);
    });
  });
});

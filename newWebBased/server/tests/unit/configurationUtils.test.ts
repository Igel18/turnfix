/**
 * Unit Tests — configurationUtils.ts
 *
 * Tests for encryption round-trip, DATABASE_URL parsing, and default config.
 */

import { encrypt, decrypt, parseDatabaseUrl, getDefaultConfig } from '../../src/utils/configurationUtils';

describe('configurationUtils', () => {
  // ────────────────────────────────────────────────────────────────────────
  // encrypt / decrypt (round-trip)
  // ────────────────────────────────────────────────────────────────────────

  describe('encrypt / decrypt', () => {
    it('should encrypt and decrypt a simple string', () => {
      const original = 'my-secret-password';
      const encrypted = encrypt(original);
      expect(encrypted).not.toBe(original);
      expect(encrypted).toContain(':'); // IV:ciphertext format
      expect(decrypt(encrypted)).toBe(original);
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    it('should handle unicode characters', () => {
      const original = 'Grüße & Umlaute: äöü ÄÖÜ ß 🏆';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('should handle very long strings', () => {
      const original = 'a'.repeat(10000);
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('should produce different ciphertext for same input (random IV)', () => {
      const original = 'same-text';
      const enc1 = encrypt(original);
      const enc2 = encrypt(original);
      expect(enc1).not.toBe(enc2);
      // Both should still decrypt correctly
      expect(decrypt(enc1)).toBe(original);
      expect(decrypt(enc2)).toBe(original);
    });

    it('should fall back to original text if ciphertext has no colon', () => {
      // Backward compatibility: unencrypted text stays as-is
      expect(decrypt('plain-text-no-colon')).toBe('plain-text-no-colon');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // parseDatabaseUrl
  // ────────────────────────────────────────────────────────────────────────

  describe('parseDatabaseUrl', () => {
    it('should parse standard DATABASE_URL', () => {
      const url = 'postgresql://myuser:mypassword@localhost:5432/turnfix_db';
      const result = parseDatabaseUrl(url);
      expect(result).toEqual({
        user: 'myuser',
        password: 'mypassword',
        host: 'localhost',
        port: 5432,
        database: 'turnfix_db',
        ssl: false,
      });
    });

    it('should parse URL with sslmode=require', () => {
      const url = 'postgresql://user:pass@host:5433/db?sslmode=require';
      const result = parseDatabaseUrl(url);
      expect(result!.ssl).toBe(true);
      expect(result!.port).toBe(5433);
    });

    it('should parse URL with ssl=true', () => {
      const url = 'postgresql://u:p@h:5432/d?ssl=true';
      const result = parseDatabaseUrl(url);
      expect(result!.ssl).toBe(true);
    });

    it('should parse URL with special characters in password', () => {
      const url = 'postgresql://postgres:UG2-UA.de@localhost:5432/turnfix';
      const result = parseDatabaseUrl(url);
      expect(result).not.toBeNull();
      expect(result!.password).toBe('UG2-UA.de');
    });

    it('should return null for invalid URL', () => {
      expect(parseDatabaseUrl('not-a-valid-url')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDatabaseUrl('')).toBeNull();
    });

    it('should return null for MySQL URL', () => {
      expect(parseDatabaseUrl('mysql://user:pass@host:3306/db')).toBeNull();
    });

    it('should handle URL with schema=public query param', () => {
      const url = 'postgresql://u:p@h:5432/mydb?schema=public';
      const result = parseDatabaseUrl(url);
      expect(result!.database).toBe('mydb');
      expect(result!.ssl).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // getDefaultConfig
  // ────────────────────────────────────────────────────────────────────────

  describe('getDefaultConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset env to avoid interference
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return a valid config with all sections', () => {
      delete process.env.DATABASE_URL;
      const config = getDefaultConfig();

      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('application');
      expect(config).toHaveProperty('localization');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('imports');
      expect(config).toHaveProperty('printing');
      expect(config).toHaveProperty('logging');
    });

    it('should use defaults when no env vars set', () => {
      delete process.env.DATABASE_URL;
      delete process.env.TEST_DATABASE_URL;
      delete process.env.DATABASE_HOST;
      delete process.env.DATABASE_PORT;
      delete process.env.DATABASE_NAME;
      delete process.env.DATABASE_USER;
      delete process.env.DATABASE_PASSWORD;
      delete process.env.DATABASE_SSL;
      const config = getDefaultConfig();

      expect(config.database.db_host).toBe('localhost');
      expect(config.database.db_port).toBe(5432);
      expect(config.database.db_name).toBe('turnfix');
    });

    it('should parse DATABASE_URL when set', () => {
      process.env.DATABASE_URL = 'postgresql://admin:secret@db.example.com:5433/turnfix_prod';
      const config = getDefaultConfig();

      expect(config.database.db_host).toBe('db.example.com');
      expect(config.database.db_port).toBe(5433);
      expect(config.database.db_name).toBe('turnfix_prod');
      expect(config.database.db_user).toBe('admin');
      expect(config.database.db_password).toBe('secret');
    });

    it('should use individual env vars when DATABASE_URL not set', () => {
      delete process.env.DATABASE_URL;
      process.env.DATABASE_HOST = '10.0.0.1';
      process.env.DATABASE_PORT = '5433';
      process.env.DATABASE_NAME = 'custom_db';
      const config = getDefaultConfig();

      expect(config.database.db_host).toBe('10.0.0.1');
      expect(config.database.db_port).toBe(5433);
      expect(config.database.db_name).toBe('custom_db');
    });
  });
});

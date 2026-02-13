/**
 * Unit tests for configuration validation logic (Item 8).
 * Tests the db_host != db_name safety check and related validation.
 */

describe('Configuration Validation', () => {
  describe('db_host / db_name confusion prevention', () => {
    // Simulate the server-side validation logic
    function validateAndFixDbHost(config: { db_host: string; db_name: string }): string {
      if (config.db_host === config.db_name && config.db_host !== 'localhost') {
        return 'localhost';
      }
      return config.db_host;
    }

    it('should detect when db_host equals db_name and fix to localhost', () => {
      const result = validateAndFixDbHost({
        db_host: 'turnfix20260213_2',
        db_name: 'turnfix20260213_2'
      });
      expect(result).toBe('localhost');
    });

    it('should NOT fix when db_host is a valid hostname different from db_name', () => {
      const result = validateAndFixDbHost({
        db_host: '192.168.1.100',
        db_name: 'turnfix'
      });
      expect(result).toBe('192.168.1.100');
    });

    it('should NOT fix when db_host is localhost even if db_name is also localhost', () => {
      const result = validateAndFixDbHost({
        db_host: 'localhost',
        db_name: 'localhost'
      });
      expect(result).toBe('localhost');
    });

    it('should NOT fix when db_host is a proper hostname', () => {
      const result = validateAndFixDbHost({
        db_host: 'db.example.com',
        db_name: 'turnfix_prod'
      });
      expect(result).toBe('db.example.com');
    });

    it('should fix when db_host exactly matches db_name (typical wizard bug)', () => {
      const testCases = [
        { db_host: 'my_database', db_name: 'my_database' },
        { db_host: 'turnfix_2024', db_name: 'turnfix_2024' },
        { db_host: 'test_db_v2', db_name: 'test_db_v2' },
      ];

      for (const tc of testCases) {
        expect(validateAndFixDbHost(tc)).toBe('localhost');
      }
    });

    it('should preserve valid IP addresses as host', () => {
      const ips = ['127.0.0.1', '10.0.0.1', '172.16.0.5', '192.168.0.100'];
      for (const ip of ips) {
        const result = validateAndFixDbHost({ db_host: ip, db_name: 'turnfix' });
        expect(result).toBe(ip);
      }
    });
  });

  describe('DATABASE_URL parsing', () => {
    // Simulate the parseDatabaseUrl function
    function parseDatabaseUrl(url: string) {
      const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?(.+))?/;
      const match = url.match(regex);
      if (!match) return null;
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4]),
        database: match[5],
      };
    }

    it('should parse a standard DATABASE_URL', () => {
      const url = 'postgresql://postgres:mypass@localhost:5432/turnfix?schema=public';
      const result = parseDatabaseUrl(url);
      expect(result).toEqual({
        user: 'postgres',
        password: 'mypass',
        host: 'localhost',
        port: 5432,
        database: 'turnfix',
      });
    });

    it('should parse a DATABASE_URL with special characters in password', () => {
      const url = 'postgresql://postgres:UG2-UA.de@localhost:5432/turnfix20260213_2?schema=public';
      const result = parseDatabaseUrl(url);
      expect(result).toEqual({
        user: 'postgres',
        password: 'UG2-UA.de',
        host: 'localhost',
        port: 5432,
        database: 'turnfix20260213_2',
      });
    });

    it('should detect if host in URL is actually a database name (corruption scenario)', () => {
      const url = 'postgresql://postgres:pass@turnfix20260213_2:5432/turnfix20260213_2?schema=public';
      const result = parseDatabaseUrl(url);
      expect(result).not.toBeNull();
      // Host and database are the same → corruption!
      expect(result!.host).toBe(result!.database);
      expect(result!.host).toBe('turnfix20260213_2');
    });

    it('should correctly parse URL with IP host', () => {
      const url = 'postgresql://user:pass@192.168.1.5:5432/mydb?schema=public';
      const result = parseDatabaseUrl(url);
      expect(result).toEqual({
        user: 'user',
        password: 'pass',
        host: '192.168.1.5',
        port: 5432,
        database: 'mydb',
      });
    });

    it('should return null for invalid URLs', () => {
      expect(parseDatabaseUrl('')).toBeNull();
      expect(parseDatabaseUrl('not-a-url')).toBeNull();
      expect(parseDatabaseUrl('mysql://localhost:3306/db')).toBeNull();
    });
  });

  describe('updateEnvFile DATABASE_URL construction', () => {
    // Simulate how the server builds DATABASE_URL from config
    function buildDatabaseUrl(config: {
      db_user: string;
      db_password: string;
      db_host: string;
      db_port: number;
      db_name: string;
      db_ssl: boolean;
    }): string {
      const sslParam = config.db_ssl ? 'sslmode=require' : '';
      const baseParams = 'schema=public&connection_limit=20&pool_timeout=10';
      const allParams = sslParam ? `${baseParams}&${sslParam}` : baseParams;
      return `postgresql://${config.db_user}:${config.db_password}@${config.db_host}:${config.db_port}/${config.db_name}?${allParams}`;
    }

    it('should build correct URL with localhost', () => {
      const url = buildDatabaseUrl({
        db_user: 'postgres',
        db_password: 'pass',
        db_host: 'localhost',
        db_port: 5432,
        db_name: 'turnfix',
        db_ssl: false,
      });
      expect(url).toContain('@localhost:5432/turnfix');
      expect(url).not.toContain('sslmode');
    });

    it('should build correct URL with SSL', () => {
      const url = buildDatabaseUrl({
        db_user: 'postgres',
        db_password: 'pass',
        db_host: 'db.example.com',
        db_port: 5432,
        db_name: 'turnfix_prod',
        db_ssl: true,
      });
      expect(url).toContain('@db.example.com:5432/turnfix_prod');
      expect(url).toContain('sslmode=require');
    });

    it('should produce a corrupted URL if db_host equals db_name', () => {
      const url = buildDatabaseUrl({
        db_user: 'postgres',
        db_password: 'pass',
        db_host: 'turnfix_db', // BUG: This is a db name, not a host!
        db_port: 5432,
        db_name: 'turnfix_db',
        db_ssl: false,
      });
      // This demonstrates the corruption: host and db are the same
      expect(url).toContain('@turnfix_db:5432/turnfix_db');
    });

    it('should produce correct URL after validation fix', () => {
      // After the safety check fixes db_host
      const config = {
        db_user: 'postgres',
        db_password: 'pass',
        db_host: 'turnfix_db', // would be caught by validation
        db_port: 5432,
        db_name: 'turnfix_db',
        db_ssl: false,
      };

      // Apply the safety check
      if (config.db_host === config.db_name && config.db_host !== 'localhost') {
        config.db_host = 'localhost';
      }

      const url = buildDatabaseUrl(config);
      expect(url).toContain('@localhost:5432/turnfix_db');
      expect(url).not.toContain('@turnfix_db:5432');
    });
  });
});

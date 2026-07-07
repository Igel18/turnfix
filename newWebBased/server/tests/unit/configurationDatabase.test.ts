/**
 * Unit tests for configurationDatabase routes.
 *
 * Tests the database lifecycle endpoints: test-connection, create-database,
 * create-schema, init-database.
 *
 * Strategy: mock PrismaClient and child_process to test route logic
 * without touching a real database.
 */

import request from 'supertest';
import express from 'express';
import path from 'path';

// ── Mocks ──────────────────────────────────────────────────────────────

// Mock PrismaClient before importing the route
const mockQueryRaw = jest.fn();
const mockExecuteRawUnsafe = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: mockQueryRaw,
    $executeRawUnsafe: mockExecuteRawUnsafe,
    $disconnect: mockDisconnect,
  })),
}));

// Mock child_process
const mockExecSync = jest.fn();
const mockExec = jest.fn();

jest.mock('child_process', () => ({
  execSync: (...args: any[]) => mockExecSync(...args),
  exec: (...args: any[]) => mockExec(...args),
}));

// Mock gymnetPreset
const mockApplyGymNetPreset = jest.fn();
jest.mock('../../src/utils/gymnetPreset', () => ({
  applyGymNetPreset: (...args: any[]) => mockApplyGymNetPreset(...args),
}));

// Import route after mocks
import configurationDatabaseRouter from '../../src/routes/configurationDatabase';

// ── App setup ──────────────────────────────────────────────────────────

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/configuration', configurationDatabaseRouter);
  return app;
}

const dbConfig = {
  db_host: 'localhost',
  db_port: 5432,
  db_name: 'turnfix_test_db',
  db_user: 'postgres',
  db_password: 'secret',
  db_ssl: false,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tests
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('configurationDatabase routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
    // Default: connection works
    mockQueryRaw.mockResolvedValue([{ test: 1 }]);
    mockDisconnect.mockResolvedValue(undefined);
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/configuration/test-database
  // ──────────────────────────────────────────────────────────────────

  describe('POST /api/configuration/test-database', () => {
    it('should return success when connection works', async () => {
      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/connection successful/i);
      expect(res.body.timestamp).toBeDefined();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should return 500 with AUTH_FAILED for authentication errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Authentication failed for user "postgres"'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('AUTH_FAILED');
      expect(res.body.error).toMatch(/authentication failed/i);
    });

    it('should return 500 with CONNECTION_REFUSED for connection errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Connection refused (ECONNREFUSED)'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('CONNECTION_REFUSED');
      expect(res.body.error).toMatch(/cannot connect/i);
    });

    it('should return 500 with DB_NOT_FOUND when database does not exist', async () => {
      mockQueryRaw.mockRejectedValue(new Error('database "nonexistent" does not exist'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('DB_NOT_FOUND');
      expect(res.body.error).toMatch(/does not exist/i);
    });

    it('should return 500 with TIMEOUT for timeout errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Connection timeout'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('TIMEOUT');
      expect(res.body.error).toMatch(/timeout/i);
    });

    it('should return 500 with CONNECTION_FAILED for unknown errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Something unexpected'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('CONNECTION_FAILED');
    });

    it('should always disconnect even on failure', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Connection failed'));

      await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should construct correct connection URL with SSL', async () => {
      const { PrismaClient } = require('@prisma/client');

      await request(app)
        .post('/api/configuration/test-database')
        .send({ ...dbConfig, db_ssl: true })
        .expect(200);

      // PrismaClient should have been constructed with sslmode=require URL
      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          datasources: {
            db: {
              url: expect.stringContaining('sslmode=require'),
            },
          },
        })
      );
    });

    it('should construct correct connection URL without SSL', async () => {
      const { PrismaClient } = require('@prisma/client');

      await request(app)
        .post('/api/configuration/test-database')
        .send({ ...dbConfig, db_ssl: false })
        .expect(200);

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          datasources: {
            db: {
              url: expect.not.stringContaining('sslmode'),
            },
          },
        })
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/configuration/create-database
  // ──────────────────────────────────────────────────────────────────

  describe('POST /api/configuration/create-database', () => {
    it('should create a new database successfully', async () => {
      // DB doesn't exist yet
      mockQueryRaw.mockResolvedValueOnce([]); // pg_database check: empty = not found
      mockExecuteRawUnsafe.mockResolvedValueOnce(undefined); // CREATE DATABASE
      mockQueryRaw.mockResolvedValueOnce([{ test: 1 }]); // test connection to new DB

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/created successfully/i);
      expect(res.body.nextSteps).toBeDefined();
      expect(res.body.nextSteps.length).toBeGreaterThan(0);
    });

    it('should return 400 when database already exists', async () => {
      // DB exists
      mockQueryRaw.mockResolvedValueOnce([{ datname: 'turnfix_test_db' }]);

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(400);

      expect(res.body.errorCode).toBe('DB_ALREADY_EXISTS');
      expect(res.body.error).toMatch(/already exists/i);
    });

    it('should return 500 with PERMISSION_DENIED for permission errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('permission denied to create database'));

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('PERMISSION_DENIED');
    });

    it('should return 500 with AUTH_FAILED for authentication errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Authentication failed for user'));

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('AUTH_FAILED');
    });

    it('should return 500 with CONNECTION_REFUSED for connection errors', async () => {
      mockQueryRaw.mockRejectedValue(new Error('Connection refused'));

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('CONNECTION_REFUSED');
    });

    it('should return 500 with DB_ALREADY_EXISTS when CREATE DATABASE fails with already exists', async () => {
      mockQueryRaw.mockResolvedValueOnce([]); // DB check: not found
      mockExecuteRawUnsafe.mockRejectedValue(new Error('database "turnfix_test_db" already exists'));

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.errorCode).toBe('DB_ALREADY_EXISTS');
    });

    it('should disconnect system prisma on success', async () => {
      mockQueryRaw.mockResolvedValueOnce([]); // not found
      mockExecuteRawUnsafe.mockResolvedValueOnce(undefined); // CREATE
      mockQueryRaw.mockResolvedValueOnce([{ test: 1 }]); // test new DB

      await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(200);

      // disconnect called for system + new db client
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });

    it('should connect to postgres system database for CREATE', async () => {
      const { PrismaClient } = require('@prisma/client');
      mockQueryRaw.mockResolvedValueOnce([]);
      mockExecuteRawUnsafe.mockResolvedValueOnce(undefined);
      mockQueryRaw.mockResolvedValueOnce([{ test: 1 }]);

      await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(200);

      // First PrismaClient call should use 'postgres' database
      const firstCall = PrismaClient.mock.calls[0][0];
      expect(firstCall.datasources.db.url).toContain('/postgres');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/configuration/create-schema
  // ──────────────────────────────────────────────────────────────────

  describe('POST /api/configuration/create-schema', () => {
    it('should create schema successfully', async () => {
      mockExecSync.mockReturnValue('Your database is now in sync with your Prisma schema.');

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/schema created/i);
    });

    it('should pass --schema flag with correct path', async () => {
      mockExecSync.mockReturnValue('Done');

      await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      const call = mockExecSync.mock.calls[0];
      const command = call[0] as string;
      expect(command).toContain('npx prisma db push');
      expect(command).toContain('--schema=');
      expect(command).toContain('prisma');
      expect(command).toContain('schema.prisma');
    });

    it('should use serverRoot as cwd, not process.cwd()', async () => {
      mockExecSync.mockReturnValue('Done');

      await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      const call = mockExecSync.mock.calls[0];
      const opts = call[1] as { cwd: string };
      // cwd should be the server root (contains prisma/schema.prisma)
      // In dev it may equal process.cwd(), in production (PM2) it won't
      expect(opts.cwd).toMatch(/server/);
      expect(path.join(opts.cwd, 'prisma', 'schema.prisma')).toBeDefined();
    });

    it('should build custom DATABASE_URL when dbConfig is provided', async () => {
      mockExecSync.mockReturnValue('Done');

      await request(app)
        .post('/api/configuration/create-schema')
        .send({ dbConfig })
        .expect(200);

      const call = mockExecSync.mock.calls[0];
      const options = call[1] as { env: Record<string, string> };
      expect(options.env.DATABASE_URL).toBe(
        `postgresql://postgres:secret@localhost:5432/turnfix_test_db?schema=public`
      );
    });

    it('should use existing DATABASE_URL when no dbConfig is provided', async () => {
      mockExecSync.mockReturnValue('Done');

      await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      const call = mockExecSync.mock.calls[0];
      const options = call[1] as { env: Record<string, string> };
      // Should use process.env.DATABASE_URL (inherited)
      expect(options.env.DATABASE_URL).toBe(process.env.DATABASE_URL);
    });

    it('should return success when schema already exists ("already exists" in stderr)', async () => {
      const err: any = new Error('Command failed');
      err.stderr = 'ERROR:  relation "tfx_veranstaltungen" already exists';
      mockExecSync.mockImplementation(() => { throw err; });

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should return success when schema is in sync', async () => {
      const err: any = new Error('Command failed');
      err.stderr = 'Your database is now in sync with your Prisma schema.';
      mockExecSync.mockImplementation(() => { throw err; });

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 500 for actual schema creation failures', async () => {
      const err: any = new Error('Could not find Prisma Schema');
      err.stderr = 'Could not find Prisma Schema that is required for this command.';
      mockExecSync.mockImplementation(() => { throw err; });

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/failed to create/i);
    });

    it('should return 500 when prisma command not found', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('npx: command not found'); });

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
    });

    it('should return error details in response', async () => {
      mockExecSync.mockImplementation(() => { throw new Error('Some prisma error'); });

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(500);

      expect(res.body.details).toBeDefined();
      expect(res.body.details).toContain('Some prisma error');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // POST /api/configuration/init-database
  // ──────────────────────────────────────────────────────────────────

  describe('POST /api/configuration/init-database', () => {
    it('should complete full initialization successfully', async () => {
      // exec calls callback with success
      mockExec.mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(null, 'Migration applied', '');
      });
      mockApplyGymNetPreset.mockResolvedValue({
        success: true,
        stats: { createdFormulas: 3 },
      });

      const res = await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/initialization completed/i);
      expect(res.body.steps).toBeDefined();
      expect(res.body.steps.schema).toBeDefined();
      expect(res.body.steps.preset).toBeDefined();
    });

    it('should pass --schema flag to prisma migrate deploy', async () => {
      mockExec.mockImplementation((cmd: string, _opts: any, cb: Function) => {
        cb(null, 'OK', '');
      });
      mockApplyGymNetPreset.mockResolvedValue({ success: true });

      await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(200);

      const command = mockExec.mock.calls[0][0] as string;
      expect(command).toContain('npx prisma migrate deploy');
      expect(command).toContain('--schema=');
      expect(command).toContain('schema.prisma');
    });

    it('should use serverRoot as cwd for migrate deploy', async () => {
      mockExec.mockImplementation((_cmd: string, opts: any, cb: Function) => {
        cb(null, 'OK', '');
      });
      mockApplyGymNetPreset.mockResolvedValue({ success: true });

      await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(200);

      const opts = mockExec.mock.calls[0][1] as { cwd: string };
      // Should NOT use process.cwd()
      expect(opts.cwd).toMatch(/server/);
    });

    it('should return 500 when schema migration fails', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(new Error('Migration failed'), '', 'ERROR: relation does not exist');
      });

      const res = await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/failed to initialize/i);
    });

    it('should not apply GymNet preset when schema fails', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(new Error('Migration failed'), '', 'ERROR');
      });

      await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(500);

      expect(mockApplyGymNetPreset).not.toHaveBeenCalled();
    });

    it('should return 500 when GymNet preset fails', async () => {
      mockExec.mockImplementation((_cmd: string, _opts: any, cb: Function) => {
        cb(null, 'OK', '');
      });
      mockApplyGymNetPreset.mockRejectedValue(new Error('Preset import failed'));

      const res = await request(app)
        .post('/api/configuration/init-database')
        .send({})
        .expect(500);

      expect(res.body.success).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Error classification helper coverage
  // ──────────────────────────────────────────────────────────────────

  describe('Error classification', () => {
    const testErrorClassification = async (
      errorMessage: string,
      expectedCode: string
    ) => {
      mockQueryRaw.mockRejectedValue(new Error(errorMessage));
      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);
      expect(res.body.errorCode).toBe(expectedCode);
    };

    it('classifies "credentials" as AUTH_FAILED', async () => {
      await testErrorClassification('Invalid credentials', 'AUTH_FAILED');
    });

    it('classifies "ECONNREFUSED" as CONNECTION_REFUSED', async () => {
      await testErrorClassification('connect ECONNREFUSED 127.0.0.1:5432', 'CONNECTION_REFUSED');
    });

    it('classifies combined "database does not exist" as DB_NOT_FOUND', async () => {
      await testErrorClassification(
        'error: database "mydb" does not exist',
        'DB_NOT_FOUND'
      );
    });

    it('classifies generic errors as CONNECTION_FAILED', async () => {
      await testErrorClassification('Unknown error XYZ', 'CONNECTION_FAILED');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Response format consistency
  // ──────────────────────────────────────────────────────────────────

  describe('Response format consistency', () => {
    it('test-database success includes timestamp', async () => {
      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(200);

      expect(res.body.timestamp).toBeDefined();
      expect(() => new Date(res.body.timestamp)).not.toThrow();
    });

    it('test-database error includes timestamp', async () => {
      mockQueryRaw.mockRejectedValue(new Error('fail'));

      const res = await request(app)
        .post('/api/configuration/test-database')
        .send(dbConfig)
        .expect(500);

      expect(res.body.timestamp).toBeDefined();
    });

    it('create-database success includes nextSteps array', async () => {
      mockQueryRaw.mockResolvedValueOnce([]);
      mockExecuteRawUnsafe.mockResolvedValueOnce(undefined);
      mockQueryRaw.mockResolvedValueOnce([{ test: 1 }]);

      const res = await request(app)
        .post('/api/configuration/create-database')
        .send(dbConfig)
        .expect(200);

      expect(Array.isArray(res.body.nextSteps)).toBe(true);
      expect(res.body.nextSteps.length).toBeGreaterThan(0);
    });

    it('create-schema success includes details about tables', async () => {
      mockExecSync.mockReturnValue('Done');

      const res = await request(app)
        .post('/api/configuration/create-schema')
        .send({})
        .expect(200);

      expect(res.body.details).toBeDefined();
    });
  });
});

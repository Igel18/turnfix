import express from 'express';
import request from 'supertest';

const execute = jest.fn();
const disconnect = jest.fn();
const createClient = jest.fn();
const validate = jest.fn();
const restore = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(options => {
    createClient(options);
    return { $executeRawUnsafe: execute, $disconnect: disconnect };
  })
}));
jest.mock('../../src/utils/backupRestore', () => ({
  validateRestoreFiles: (...args: unknown[]) => validate(...args),
  restoreBackupToUrl: (...args: unknown[]) => restore(...args)
}));

const { restoreWizardBackup } = require('../../src/utils/wizardRestore');
const restoreRouter = require('../../src/routes/configurationRestore').default;

const input = { backupPath: 'backup', stagingPath: 'staging', databaseName: 'new_restore' };

describe('wizard restore service', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:secret@localhost:5432/active?schema=public';
    validate.mockResolvedValue(undefined);
    execute.mockResolvedValue(1);
    disconnect.mockResolvedValue(undefined);
    restore.mockResolvedValue(undefined);
  });

  it('validates files before atomically creating a template0 database and restoring it', async () => {
    await expect(restoreWizardBackup(input)).resolves.toEqual({ success: true, databaseName: 'new_restore', stagingPath: 'staging' });
    expect(validate.mock.invocationCallOrder[0]).toBeLessThan(execute.mock.invocationCallOrder[0]);
    expect(execute).toHaveBeenCalledWith('CREATE DATABASE "new_restore" TEMPLATE template0');
    expect(createClient.mock.calls[0][0].datasources.db.url).toContain('/postgres');
    expect(restore.mock.calls[0][0].databaseUrl).toContain('/new_restore');
    expect(restore.mock.invocationCallOrder[0]).toBeGreaterThan(execute.mock.invocationCallOrder[0]);
  });

  it.each(['active', 'Bad', 'x$y', 'x"y', 'new_restore\n', 'a'.repeat(64), 'postgres'])('rejects unsafe or active database %s', async databaseName => {
    await expect(restoreWizardBackup({ ...input, databaseName })).rejects.toMatchObject({ status: 400 });
    expect(execute).not.toHaveBeenCalled();
  });

  it('never restores when create reports a duplicate', async () => {
    execute.mockRejectedValue({ code: 'P2010', meta: { code: '42P04' } });
    await expect(restoreWizardBackup(input)).rejects.toMatchObject({ status: 409, code: 'DATABASE_EXISTS' });
    expect(restore).not.toHaveBeenCalled();
  });

  it('reports the retained database without disclosing underlying errors', async () => {
    restore.mockRejectedValue(new Error('secret'));
    const error = await restoreWizardBackup(input).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ code: 'RESTORE_FAILED', databaseCreated: true, databaseName: 'new_restore' });
    expect(JSON.stringify(error)).not.toContain('secret');
  });

  it('rejects simultaneous restores and releases the lock afterwards', async () => {
    let release!: () => void;
    validate.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
    const first = restoreWizardBackup(input);
    await expect(restoreWizardBackup(input)).rejects.toMatchObject({ status: 409, code: 'RESTORE_IN_PROGRESS' });
    release();
    await first;
    await expect(restoreWizardBackup(input)).resolves.toMatchObject({ success: true });
  });

  it('never creates a database when file validation fails', async () => {
    validate.mockRejectedValue(new Error('bad staging'));
    await expect(restoreWizardBackup(input)).rejects.toMatchObject({ code: 'INVALID_BACKUP_OR_STAGING' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects staging inside the installation directory', async () => {
    await expect(restoreWizardBackup({ ...input, stagingPath: process.cwd() })).rejects.toMatchObject({ status: 400, code: 'INVALID_BACKUP_OR_STAGING' });
    expect(validate).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});

describe('wizard restore HTTP security', () => {
  const app = express();
  app.use('/api/configuration', restoreRouter);
  const post = () => request(app).post('/api/configuration/backup/restore').set('Host', 'localhost:3001').send(input);

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:secret@localhost:5432/active';
    validate.mockResolvedValue(undefined);
    execute.mockResolvedValue(1);
    disconnect.mockResolvedValue(undefined);
    restore.mockResolvedValue(undefined);
  });

  it('accepts a local browser origin with JSON', async () => {
    const response = await post().set('Origin', 'http://localhost:5173');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, databaseName: 'new_restore', stagingPath: 'staging' });
  });

  it('handles local browser preflight and rejects foreign preflight', async () => {
    const preflight = (origin: string) => request(app).options('/api/configuration/backup/restore').set('Host', 'localhost:3001').set('Origin', origin).set('Access-Control-Request-Method', 'POST').set('Access-Control-Request-Headers', 'content-type');
    const allowed = await preflight('http://localhost:5173');
    expect(allowed.status).toBe(204);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect((await preflight('http://evil.example')).status).toBe(403);
  });

  it('returns a structured error for malformed JSON', async () => {
    const response = await request(app).post('/api/configuration/backup/restore').set('Host', 'localhost:3001').set('Origin', 'http://localhost:5173').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_JSON');
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ['foreign origin', 'localhost:3001', 'https://evil.example'],
    ['rebinding host', 'evil.example:3001', 'http://localhost:5173'],
    ['numeric host alias', '127.1:3001', 'http://localhost:5173'],
    ['foreign local origin port', 'localhost:3001', 'http://localhost:4444'],
    ['missing origin', 'localhost:3001', '']
  ])('rejects %s', async (_label, host, origin) => {
    let call = post().set('Host', host);
    if (origin) call = call.set('Origin', origin);
    expect((await call).status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });

  it('accepts an originless JSON request only with the explicit non-simple header', async () => {
    expect((await post().set('X-TurnFix-Restore', '1')).status).toBe(200);
  });

  it('returns 409 while another HTTP restore is in progress', async () => {
    let release!: () => void;
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    validate.mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; started(); }));
    const first = post().set('Origin', 'http://localhost:5173').then(response => response);
    await waiting;
    try {
      const second = await post().set('Origin', 'http://localhost:5173');
      expect(second.status).toBe(409);
      expect(second.body.code).toBe('RESTORE_IN_PROGRESS');
    } finally {
      release();
    }
    expect((await first).status).toBe(200);
  });

  it('rejects a non-loopback socket even when forwarding headers claim localhost', async () => {
    const remoteApp = express();
    remoteApp.use((req, _res, next) => {
      Object.defineProperty(req.socket, 'remoteAddress', { value: '192.0.2.10', configurable: true });
      next();
    });
    remoteApp.use('/api/configuration', restoreRouter);
    const response = await request(remoteApp).post('/api/configuration/backup/restore').set('Host', 'localhost:3001').set('Origin', 'http://localhost:5173').set('X-Forwarded-For', '127.0.0.1').send(input);
    expect(response.status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
});
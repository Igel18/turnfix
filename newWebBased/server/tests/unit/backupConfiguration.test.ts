import express from 'express';
import path from 'path';
import request from 'supertest';

const mockSaveConfig = jest.fn();
const mockStatus = {
  running: false,
  lastSuccess: null as string | null,
  lastPath: null as string | null,
  error: null as string | null,
};

jest.mock('../../src/utils/configurationUtils', () => ({
  loadConfig: jest.fn(),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  getDefaultConfig: jest.fn(),
}));

jest.mock('../../src/lib/prisma', () => ({ getCurrentDatabaseName: jest.fn() }));
jest.mock('../../src/routes/configurationSeeding', () => require('express').Router());
jest.mock('../../src/routes/configurationDatabase', () => require('express').Router());
jest.mock('../../src/utils/backupRuntime', () => ({
  ...jest.requireActual('../../src/utils/backupRuntime'),
  backupScheduler: { status: mockStatus },
}));

import configurationRouter from '../../src/routes/configuration';

const app = express();
app.use(express.json());
app.use('/api/configuration', configurationRouter);

const database = { db_host: 'localhost', db_name: 'turnfix_test' };
const validBackup = {
  enabled: true,
  interval_minutes: 30,
  destination: path.resolve('test-backup-destination'),
  retention_count: 20,
};

describe('configuration backup routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveConfig.mockResolvedValue({ connectedDatabase: 'turnfix_test' });
    Object.assign(mockStatus, { running: false, lastSuccess: null, lastPath: null, error: null });
  });

  it('returns the current scheduler status without allowing caching', async () => {
    Object.assign(mockStatus, {
      running: true,
      lastSuccess: '2026-01-02T03:04:05.000Z',
      lastPath: path.resolve('test-backup-destination', 'backup.zip'),
      error: 'Previous backup failed',
    });

    const response = await request(app).get('/api/configuration/backup/status').expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual(mockStatus);
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it.each([
    ['non-boolean enabled', { enabled: 'true' }, 'Invalid enabled setting'],
    ['interval below minimum', { interval_minutes: 0 }, 'Interval must be between 1 and 10080 minutes'],
    ['interval above maximum', { interval_minutes: 10081 }, 'Interval must be between 1 and 10080 minutes'],
    ['fractional interval', { interval_minutes: 1.5 }, 'Interval must be between 1 and 10080 minutes'],
    ['non-numeric interval', { interval_minutes: '30' }, 'Interval must be between 1 and 10080 minutes'],
    ['retention below minimum', { retention_count: 0 }, 'Retention count must be between 1 and 1000'],
    ['retention above maximum', { retention_count: 1001 }, 'Retention count must be between 1 and 1000'],
    ['fractional retention', { retention_count: 1.5 }, 'Retention count must be between 1 and 1000'],
    ['non-numeric retention', { retention_count: '20' }, 'Retention count must be between 1 and 1000'],
    ['empty destination when enabled', { destination: '  ' }, 'An absolute backup destination is required'],
    ['relative destination when enabled', { destination: 'relative-backup' }, 'An absolute backup destination is required'],
    ['non-string destination', { destination: null }, 'An absolute backup destination is required'],
  ])('rejects %s without saving', async (_description, invalidBackup, expectedError) => {
    const response = await request(app)
      .post('/api/configuration/save')
      .send({ database, backup: { ...validBackup, ...invalidBackup } })
      .expect(400);

    expect(response.body).toEqual({ error: expectedError });
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it.each([
    ['minimum values', { ...validBackup, interval_minutes: 1, retention_count: 1 }],
    ['maximum values', { ...validBackup, interval_minutes: 10080, retention_count: 1000 }],
    ['disabled backup without destination', { ...validBackup, enabled: false, destination: '' }],
  ])('saves valid backup settings with %s', async (_description, backup) => {
    const config = { database, backup };
    const response = await request(app).post('/api/configuration/save').send(config).expect(200);

    expect(response.body).toMatchObject({ success: true, connectedDatabase: 'turnfix_test' });
    expect(mockSaveConfig).toHaveBeenCalledTimes(1);
    expect(mockSaveConfig).toHaveBeenCalledWith(config);
  });

  it.each([
    ['missing backup section', { database }],
    ['partial backup section', { database, backup: { enabled: false } }],
  ])('accepts a legacy request with %s using validation defaults', async (_description, config) => {
    const response = await request(app).post('/api/configuration/save').send(config).expect(200);

    expect(response.body.success).toBe(true);
    expect(mockSaveConfig).toHaveBeenCalledTimes(1);
    expect(mockSaveConfig).toHaveBeenCalledWith(config);
  });
});
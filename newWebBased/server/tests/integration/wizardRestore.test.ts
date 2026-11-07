import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';
import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import restoreRouter from '../../src/routes/configurationRestore';
import { postgresEnvironment } from '../../src/utils/backup';

describe('wizard restore with PostgreSQL', () => {
  it('refuses an existing database and restores a real dump only into a new database', async () => {
    const suffix = randomBytes(8).toString('hex');
    const sourceName = `turnfix_wiz_src_${suffix}`;
    const targetName = `turnfix_wiz_dst_${suffix}`;
    const failedName = `turnfix_wiz_bad_${suffix}`;
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'turnfix-wizard-'));
    const backupPath = path.join(root, 'backup');
    const stagingPath = path.join(root, 'staging');
    const testUrl = new URL(process.env.TEST_DATABASE_URL!);
    const adminUrl = new URL(testUrl.toString());
    adminUrl.pathname = '/postgres';
    const sourceUrl = new URL(testUrl.toString());
    sourceUrl.pathname = `/${sourceName}`;
    const targetUrl = new URL(testUrl.toString());
    targetUrl.pathname = `/${targetName}`;
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    let sourceCreated = false;
    let targetCreated = false;
    let failedCreated = false;
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${sourceName}" TEMPLATE template0`);
      sourceCreated = true;
      const source = new PrismaClient({ datasources: { db: { url: sourceUrl.toString() } } });
      try {
        await source.$executeRawUnsafe('CREATE TABLE restore_test_marker (value text NOT NULL)');
        await source.$executeRawUnsafe("INSERT INTO restore_test_marker (value) VALUES ('preserved')");
      } finally {
        await source.$disconnect();
      }
      await fs.mkdir(backupPath);
      await fs.mkdir(stagingPath);
      await fs.mkdir(path.join(backupPath, 'uploads'));
      await fs.writeFile(path.join(backupPath, 'uploads', 'marker.txt'), 'staged');
      await fs.writeFile(path.join(backupPath, 'manifest.json'), JSON.stringify({ sources: ['uploads'] }));
      const commands = ['pg_dump'];
      if (process.platform === 'win32') {
        const postgresRoot = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PostgreSQL');
        const versions = await fs.readdir(postgresRoot).catch(() => [] as string[]);
        versions.sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
        commands.push(...versions.map(version => path.join(postgresRoot, version, 'bin', 'pg_dump.exe')));
      }
      let dump = spawnSync(commands[0], ['--format=custom', '--no-owner', '--no-privileges', '--file', path.join(backupPath, 'database.dump')], { env: postgresEnvironment(sourceUrl.toString()), encoding: 'utf8' });
      for (const command of commands.slice(1)) {
        if ((dump.error as NodeJS.ErrnoException | undefined)?.code !== 'ENOENT') break;
        dump = spawnSync(command, ['--format=custom', '--no-owner', '--no-privileges', '--file', path.join(backupPath, 'database.dump')], { env: postgresEnvironment(sourceUrl.toString()), encoding: 'utf8' });
      }
      if (dump.error) throw dump.error;
      expect(dump.status).toBe(0);
      const app = express();
      app.use('/api/configuration', restoreRouter);
      const post = (databaseName: string) => request(app).post('/api/configuration/backup/restore').set('Host', 'localhost:3001').set('Origin', 'http://localhost:5173').send({ backupPath, stagingPath, databaseName });
      const duplicate = await post(sourceName);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.code).toBe('DATABASE_EXISTS');
      expect(await fs.readdir(stagingPath)).toEqual([]);
      const badBackupPath = path.join(root, 'bad-backup');
      await fs.mkdir(badBackupPath);
      await fs.writeFile(path.join(badBackupPath, 'manifest.json'), JSON.stringify({ sources: [] }));
      await fs.writeFile(path.join(badBackupPath, 'database.dump'), 'PGDMPinvalid');
      const failed = await request(app).post('/api/configuration/backup/restore').set('Host', 'localhost:3001').set('Origin', 'http://localhost:5173').send({ backupPath: badBackupPath, stagingPath, databaseName: failedName });
      failedCreated = failed.body.databaseCreated === true;
      expect(failed.status).toBe(500);
      expect(failed.body).toMatchObject({ code: 'RESTORE_FAILED', databaseCreated: true, databaseName: failedName });
      expect(await admin.$queryRaw`SELECT datname FROM pg_database WHERE datname = ${failedName}`).toEqual([{ datname: failedName }]);
      expect(await fs.readdir(stagingPath)).toEqual([]);
      const response = await post(targetName);
      targetCreated = response.body.success === true || response.body.databaseCreated === true;
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true, databaseName: targetName, stagingPath });
      expect(await fs.readFile(path.join(stagingPath, 'uploads', 'marker.txt'), 'utf8')).toBe('staged');
      for (const url of [sourceUrl, targetUrl]) {
        const client = new PrismaClient({ datasources: { db: { url: url.toString() } } });
        try {
          expect(await client.$queryRaw`SELECT value FROM restore_test_marker`).toEqual([{ value: 'preserved' }]);
        } finally {
          await client.$disconnect();
        }
      }
    } finally {
      if (failedCreated) await admin.$executeRawUnsafe(`DROP DATABASE "${failedName}"`);
      if (targetCreated) await admin.$executeRawUnsafe(`DROP DATABASE "${targetName}"`);
      if (sourceCreated) await admin.$executeRawUnsafe(`DROP DATABASE "${sourceName}"`);
      await admin.$disconnect();
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 60000);
});
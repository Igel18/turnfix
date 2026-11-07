import { BackupScheduler } from '../../src/utils/backupScheduler';
import { defaultBackupSettings } from '../../src/utils/backup';

describe('BackupScheduler', () => {
  it('runs immediately when enabled and respects the interval', async () => {
    let now = 100000;
    const run = jest.fn().mockResolvedValue('backup');
    const settings = { ...defaultBackupSettings, enabled: true, destination: process.cwd(), interval_minutes: 5 };
    const scheduler = new BackupScheduler(async () => settings, run, () => now);
    await scheduler.tick();
    now += 4 * 60000;
    await scheduler.tick();
    expect(run).toHaveBeenCalledTimes(1);
    now += 60000;
    await scheduler.tick();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not run while disabled or concurrently', async () => {
    const settings = { ...defaultBackupSettings, enabled: false, destination: process.cwd() };
    let finish!: (value: string) => void;
    const run = jest.fn(() => new Promise<string>(resolve => { finish = resolve; }));
    const scheduler = new BackupScheduler(async () => settings, run, () => 100000);
    await scheduler.tick();
    expect(run).not.toHaveBeenCalled();
    settings.enabled = true;
    const running = scheduler.tick();
    await Promise.resolve();
    await scheduler.tick();
    expect(run).toHaveBeenCalledTimes(1);
    finish('backup');
    await running;
  });

  it('records failures and allows a later retry', async () => {
    const settings = { ...defaultBackupSettings, enabled: true, destination: process.cwd() };
    const run = jest.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce('backup');
    const scheduler = new BackupScheduler(async () => settings, run, () => 100000);
    await scheduler.tick();
    expect(scheduler.status.error).toBe('disk full');
    await scheduler.tick();
    expect(run).toHaveBeenCalledTimes(2);
    expect(scheduler.status.error).toBeNull();
  });
});
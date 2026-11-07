import { BackupSettings, validateBackupSettings } from './backup';

export class BackupScheduler {
  private running = false;
  private lastSuccess: number | null = null;
  private timer: NodeJS.Timeout | null = null;
  readonly status: { running: boolean; lastSuccess: string | null; lastPath: string | null; error: string | null } = {
    running: false, lastSuccess: null, lastPath: null, error: null
  };

  constructor(
    private readonly loadSettings: () => Promise<BackupSettings>,
    private readonly runBackup: (settings: BackupSettings) => Promise<string>,
    private readonly now: () => number = Date.now
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const settings = await this.loadSettings();
      if (!settings.enabled) return;
      const error = validateBackupSettings(settings);
      if (error) throw new Error(error);
      if (this.lastSuccess !== null && this.now() - this.lastSuccess < settings.interval_minutes * 60000) return;
      this.status.running = true;
      const result = await this.runBackup(settings);
      this.lastSuccess = this.now();
      this.status.lastSuccess = new Date(this.lastSuccess).toISOString();
      this.status.lastPath = result;
      this.status.error = null;
    } catch (error: any) {
      this.status.error = error.message || String(error);
      console.error('Backup failed:', this.status.error);
    } finally {
      this.status.running = false;
      this.running = false;
    }
  }

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), 30000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
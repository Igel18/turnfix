import { execFile } from 'child_process';

export function warnAboutPublicNetworkProfiles(): void {
  if (process.platform !== 'win32') return;

  const command = "$ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ConvertTo-Json -InputObject @(Get-NetConnectionProfile | Where-Object { $_.NetworkCategory -eq 'Public' } | Select-Object Name, InterfaceAlias) -Compress";
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 10000, windowsHide: true }, (error, stdout) => {
    if (error) {
      console.warn('Netzwerkprofile konnten nicht geprueft werden:', error.message);
      return;
    }
    try {
      const profiles: Array<{ Name: string; InterfaceAlias: string }> = JSON.parse(stdout);
      if (!Array.isArray(profiles)) throw new Error('Ungueltige Profilliste');
      for (const profile of profiles) {
        console.warn(`Netzwerk "${profile.Name}" (${profile.InterfaceAlias}) ist oeffentlich. TurnFix-Firewallregeln fuer private Netzwerke gelten dort nicht. Nur vertrauenswuerdige Netzwerke ueber das TurnFix-Tray oder die Windows-Einstellungen auf Privat umstellen.`);
      }
    } catch (parseError) {
      console.warn('Netzwerkprofile konnten nicht ausgewertet werden:', parseError);
    }
  });
}
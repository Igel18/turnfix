; ============================================================================
; TurnFix Setup - Inno Setup Script
; ============================================================================
; Builds a Windows installer for TurnFix Gymnastics Competition Management
;
; Features:
;   - Installs embedded Node.js (no system-wide install needed)
;   - Optionally installs PostgreSQL 16
;   - Installs TurnFix application (server + client + jury portal)
;   - Creates Windows Service (via NSSM)
;   - Configures Windows Firewall rules
;   - Creates desktop/start menu shortcuts
;   - Full uninstaller included
;
; Build with: ISCC.exe turnfix-setup.iss
; Or use:     .\build-installer.ps1
; ============================================================================

#define MyAppName "TurnFix"
#define MyAppVersion "2.0"
#define MyAppPublisher "TurnFix"
#define MyAppURL "https://github.com/Igel18/turnfix"
#define MyAppExeName "TurnFix-Manager.bat"

; Allow build script to pass staging dir
#ifndef MyStagingDir
  #define MyStagingDir "staging"
#endif

; Build info - passed from build-installer.ps1
#ifndef MyGitHash
  #define MyGitHash "dev"
#endif
#ifndef MyBuildDate
  #define MyBuildDate ""
#endif
#ifndef MyBuildNumber
  #define MyBuildNumber "0"
#endif

; Full version string: 2.0.BuildNumber
#define MyFullVersion MyAppVersion + "." + Str(MyBuildNumber)

[Setup]
AppId={{A7F3B2C4-D5E6-4F78-9A0B-C1D2E3F4A5B6}
AppName={#MyAppName}
AppVersion={#MyFullVersion}
AppVerName={#MyAppName} {#MyAppVersion} (Build {#MyBuildNumber}, {#MyGitHash})
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={commonpf}\TurnFix
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
LicenseFile=
OutputDir=output
OutputBaseFilename=TurnFix-Setup-{#MyAppVersion}-build{#MyBuildNumber}-{#MyGitHash}
SetupIconFile=
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
; Estimated sizes  
ExtraDiskSpaceRequired=524288000
; Allow user to change install dir
AllowNoIcons=yes
; Uninstaller
UninstallDisplayIcon={app}\turnfix.ico
UninstallDisplayName={#MyAppName}

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
german.BeveledLabel=TurnFix - Turnwettkampf Verwaltung
english.BeveledLabel=TurnFix - Gymnastics Competition Management

[CustomMessages]
; German
german.InstallPostgreSQL=PostgreSQL 16 installieren (Datenbank-Server)
german.PostgreSQLAlreadyInstalled=PostgreSQL ist bereits installiert und wird übersprungen.
german.PostgreSQLNotFound=PostgreSQL wird jetzt installiert...
german.ConfigureDatabase=Datenbank konfigurieren
german.DatabaseName=Datenbank-Name:
german.DatabasePassword=PostgreSQL Passwort:
german.InstallService=TurnFix als Windows-Dienst installieren
german.ServiceDescription=TurnFix startet automatisch mit Windows
german.ConfigureFirewall=Windows-Firewall für Netzwerkzugriff konfigurieren
german.FirewallDescription=Ermöglicht Zugriff von Tablets und anderen Geräten im Netzwerk
german.InstallTrayIcon=TurnFix Tray-Icon (Statusanzeige im Infobereich)
german.TrayIconDescription=Zeigt den Server-Status im Windows-Infobereich an
german.InstallingNodeJS=Node.js Runtime wird installiert...
german.InstallingPostgreSQL=PostgreSQL wird installiert...
german.ConfiguringDatabase=Datenbank wird eingerichtet...
german.InstallingApplication=TurnFix wird installiert...
german.ConfiguringService=Windows-Dienst wird eingerichtet...
german.ConfiguringFirewall=Firewall-Regeln werden erstellt...
german.InstallationComplete=Installation abgeschlossen!
german.OpenBrowser=TurnFix im Browser öffnen
german.OpenManager=TurnFix Manager öffnen
german.OpenDocumentation=Dokumentation öffnen
german.ServerPort=Server Port:
german.JuryPort=Kampfrichter-Portal Port:
german.WelcomeLabel=Willkommen beim TurnFix Setup-Assistenten
german.WelcomeDescription=Dieses Setup installiert TurnFix auf Ihrem Computer.%n%nTurnFix ist ein modernes Verwaltungssystem für Turnwettkämpfe.%n%nFolgende Komponenten werden installiert:%n  • TurnFix Anwendung (Server + Web-Frontend)%n  • Node.js Runtime (eingebettet)%n  • PostgreSQL Datenbank (optional)%n  • Windows-Dienst für Autostart

; English
english.InstallPostgreSQL=Install PostgreSQL 16 (Database Server)
english.PostgreSQLAlreadyInstalled=PostgreSQL is already installed and will be skipped.
english.PostgreSQLNotFound=PostgreSQL will now be installed...
english.ConfigureDatabase=Configure Database
english.DatabaseName=Database Name:
english.DatabasePassword=PostgreSQL Password:
english.InstallService=Install TurnFix as Windows Service
english.ServiceDescription=TurnFix starts automatically with Windows
english.ConfigureFirewall=Configure Windows Firewall for network access
english.FirewallDescription=Allows access from tablets and other devices on the network
english.InstallTrayIcon=TurnFix Tray Icon (status indicator in system tray)
english.TrayIconDescription=Shows server status in the Windows system tray
english.InstallingNodeJS=Installing Node.js Runtime...
english.InstallingPostgreSQL=Installing PostgreSQL...
english.ConfiguringDatabase=Setting up database...
english.InstallingApplication=Installing TurnFix...
english.ConfiguringService=Configuring Windows Service...
english.ConfiguringFirewall=Creating firewall rules...
english.InstallationComplete=Installation complete!
english.OpenBrowser=Open TurnFix in browser
english.OpenManager=Open TurnFix Manager
english.OpenDocumentation=Open Documentation
english.ServerPort=Server Port:
english.JuryPort=Jury Portal Port:
english.WelcomeLabel=Welcome to TurnFix Setup
english.WelcomeDescription=This setup will install TurnFix on your computer.%n%nTurnFix is a modern gymnastics competition management system.%n%nThe following components will be installed:%n  • TurnFix Application (Server + Web Frontend)%n  • Node.js Runtime (embedded)%n  • PostgreSQL Database (optional)%n  • Windows Service for auto-start

[Types]
Name: "full"; Description: "Vollständige Installation / Full Installation"
Name: "compact"; Description: "Nur TurnFix (PostgreSQL manuell) / TurnFix only"
Name: "custom"; Description: "Benutzerdefiniert / Custom"; Flags: iscustom

[Components]
Name: "app"; Description: "TurnFix Anwendung"; Types: full compact custom; Flags: fixed
Name: "nodejs"; Description: "Node.js Runtime (eingebettet)"; Types: full compact custom; Flags: fixed
Name: "postgresql"; Description: "{cm:InstallPostgreSQL}"; Types: full custom
Name: "service"; Description: "{cm:InstallService}"; Types: full custom
Name: "firewall"; Description: "{cm:ConfigureFirewall}"; Types: full custom
Name: "trayicon"; Description: "{cm:InstallTrayIcon}"; Types: full custom

[Files]
; Node.js embedded runtime
Source: "{#MyStagingDir}\nodejs\*"; DestDir: "{app}\nodejs"; Flags: ignoreversion recursesubdirs; Components: nodejs

; NSSM for service management
Source: "{#MyStagingDir}\nssm\nssm.exe"; DestDir: "{app}\nssm"; Flags: ignoreversion skipifsourcedoesntexist; Components: service

; PostgreSQL installer (large file, only if component selected)
Source: "{#MyStagingDir}\postgresql\postgresql-installer.exe"; DestDir: "{tmp}"; Flags: ignoreversion deleteafterinstall skipifsourcedoesntexist; Components: postgresql

; Server files
Source: "{#MyStagingDir}\server\dist\*"; DestDir: "{app}\server\dist"; Flags: ignoreversion recursesubdirs; Components: app
Source: "{#MyStagingDir}\server\prisma\*"; DestDir: "{app}\server\prisma"; Flags: ignoreversion recursesubdirs; Components: app
Source: "{#MyStagingDir}\server\node_modules\*"; DestDir: "{app}\server\node_modules"; Flags: ignoreversion recursesubdirs; Components: app
Source: "{#MyStagingDir}\server\package.json"; DestDir: "{app}\server"; Flags: ignoreversion; Components: app
Source: "{#MyStagingDir}\server\ecosystem.config.js"; DestDir: "{app}\server"; Flags: ignoreversion; Components: app
Source: "{#MyStagingDir}\server\.env.example"; DestDir: "{app}\server"; Flags: ignoreversion; Components: app
Source: "{#MyStagingDir}\server\public\*"; DestDir: "{app}\server\public"; Flags: ignoreversion recursesubdirs skipifsourcedoesntexist; Components: app

; Client files
Source: "{#MyStagingDir}\client\dist\*"; DestDir: "{app}\client\dist"; Flags: ignoreversion recursesubdirs; Components: app
Source: "{#MyStagingDir}\client\public\*"; DestDir: "{app}\client\public"; Flags: ignoreversion recursesubdirs skipifsourcedoesntexist; Components: app

; Jury Portal files
Source: "{#MyStagingDir}\jury-portal\dist\*"; DestDir: "{app}\jury-portal\dist"; Flags: ignoreversion recursesubdirs skipifsourcedoesntexist; Components: app

; Documentation
Source: "{#MyStagingDir}\docs\*"; DestDir: "{app}\docs"; Flags: ignoreversion recursesubdirs skipifsourcedoesntexist; Components: app

; Installer scripts (including tray icon)
Source: "{#MyStagingDir}\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion; Components: app

; TurnFix Manager
Source: "{#MyStagingDir}\TurnFix-Manager.bat"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist; Components: app
Source: "{#MyStagingDir}\turnfix-manager.ps1"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist; Components: app

[Dirs]
Name: "{app}\server\logs"
Name: "{app}\server\uploads"
Name: "{app}\data"
Name: "{app}\docs"

[Icons]
Name: "{group}\TurnFix Manager"; Filename: "{app}\TurnFix-Manager.bat"; WorkingDir: "{app}"; Comment: "TurnFix Verwaltung starten"
Name: "{group}\TurnFix im Browser"; Filename: "http://localhost:3001"; Comment: "TurnFix Web-Interface"
Name: "{group}\TurnFix Dokumentation"; Filename: "{app}\docs\TurnFix-Dokumentation.html"; Comment: "TurnFix Handbuch & Dokumentation"
Name: "{group}\TurnFix deinstallieren"; Filename: "{uninstallexe}"
Name: "{commondesktop}\TurnFix"; Filename: "{app}\TurnFix-Manager.bat"; WorkingDir: "{app}"; Comment: "TurnFix Verwaltung"; Tasks: desktopicon
Name: "{commondesktop}\TurnFix Web"; Filename: "http://localhost:3001"; Comment: "TurnFix im Browser öffnen"; Tasks: desktopicon
; Tray icon autostart
Name: "{commonstartup}\TurnFix Tray"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\turnfix-tray.ps1"""; WorkingDir: "{app}"; Comment: "TurnFix Status-Anzeige"; Components: trayicon; Tasks: autostarttray

[Tasks]
Name: "desktopicon"; Description: "Desktop-Verknüpfungen erstellen"; GroupDescription: "Zusätzliche Verknüpfungen:"
Name: "autostarttray"; Description: "TurnFix Tray-Icon bei Windows-Anmeldung starten"; GroupDescription: "Autostart:"; Components: trayicon

[Run]
; Post-installation: open browser
Filename: "http://localhost:3001/configuration"; Description: "{cm:OpenBrowser}"; Flags: postinstall shellexec skipifsilent unchecked
Filename: "{app}\TurnFix-Manager.bat"; Description: "{cm:OpenManager}"; Flags: postinstall skipifsilent nowait
Filename: "{app}\docs\TurnFix-Dokumentation.html"; Description: "{cm:OpenDocumentation}"; Flags: postinstall shellexec skipifsilent unchecked nowait

[UninstallRun]
; Stop and remove service before uninstall
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\scripts\uninstall-service.ps1"" -InstallDir ""{app}"""; Flags: runhidden waituntilterminated; RunOnceId: "RemoveService"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\server\logs"
Type: filesandordirs; Name: "{app}\server\uploads"
Type: filesandordirs; Name: "{app}\data"

[Code]
var
  DatabasePage: TInputQueryWizardPage;
  PortPage: TInputQueryWizardPage;
  DbName: String;
  DbPassword: String;
  ServerPort: String;
  JuryPort: String;

// Check if PostgreSQL is already installed
function IsPostgreSQLInstalled: Boolean;
var
  ResultCode: Integer;
begin
  Result := False;
  
  // Check common PostgreSQL paths
  if DirExists('C:\Program Files\PostgreSQL') then
  begin
    Result := True;
    Exit;
  end;
  
  // Check if pg_isready is available
  if Exec('cmd.exe', '/C pg_isready -h localhost 2>nul', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      Result := True;
      Exit;
    end;
  end;
  
  // Check registry
  if RegKeyExists(HKLM, 'SOFTWARE\PostgreSQL') then
    Result := True;
end;

procedure InitializeWizard();
begin
  // Database configuration page
  DatabasePage := CreateInputQueryPage(wpSelectComponents,
    CustomMessage('ConfigureDatabase'),
    '',
    '');
  DatabasePage.Add(CustomMessage('DatabaseName') , False);
  DatabasePage.Add(CustomMessage('DatabasePassword'), True);
  DatabasePage.Values[0] := 'turnfix';
  DatabasePage.Values[1] := 'turnfix2024';

  // Port configuration page
  PortPage := CreateInputQueryPage(DatabasePage.ID,
    'Port Configuration',
    '',
    '');
  PortPage.Add(CustomMessage('ServerPort'), False);
  PortPage.Add(CustomMessage('JuryPort'), False);
  PortPage.Values[0] := '3001';
  PortPage.Values[1] := '3002';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  PortNum: Integer;
begin
  Result := True;
  
  if CurPageID = DatabasePage.ID then
  begin
    DbName := DatabasePage.Values[0];
    DbPassword := DatabasePage.Values[1];
    
    if DbName = '' then
    begin
      MsgBox('Bitte geben Sie einen Datenbank-Namen ein.', mbError, MB_OK);
      Result := False;
    end;
    
    if DbPassword = '' then
    begin
      MsgBox('Bitte geben Sie ein PostgreSQL-Passwort ein.', mbError, MB_OK);
      Result := False;
    end;
  end;
  
  if CurPageID = PortPage.ID then
  begin
    ServerPort := PortPage.Values[0];
    JuryPort := PortPage.Values[1];
    
    PortNum := StrToIntDef(ServerPort, 0);
    if (PortNum < 1024) or (PortNum > 65535) then
    begin
      MsgBox('Server Port muss zwischen 1024 und 65535 liegen.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    
    PortNum := StrToIntDef(JuryPort, 0);
    if (PortNum < 1024) or (PortNum > 65535) then
    begin
      MsgBox('Jury Port muss zwischen 1024 und 65535 liegen.', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    
    if ServerPort = JuryPort then
    begin
      MsgBox('Server Port und Jury Port dürfen nicht gleich sein.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

// Create .env file with user configuration
procedure CreateEnvFile();
var
  EnvContent: String;
begin
  EnvContent := 
    '# TurnFix Configuration - Generated by Installer' + #13#10 +
    '# ' + GetDateTimeString('yyyy-mm-dd hh:nn:ss', '-', ':') + #13#10 +
    '' + #13#10 +
    '# Database' + #13#10 +
    'DATABASE_URL="postgresql://postgres:' + DbPassword + '@localhost:5432/' + DbName + '?schema=public&connection_limit=20&pool_timeout=10"' + #13#10 +
    '' + #13#10 +
    '# JWT' + #13#10 +
    'JWT_SECRET="turnfix-' + GetDateTimeString('yyyymmddhhnnss', '', '') + '-secret"' + #13#10 +
    'JWT_REFRESH_SECRET="turnfix-' + GetDateTimeString('yyyymmddhhnnss', '', '') + '-refresh"' + #13#10 +
    'JWT_EXPIRE="15m"' + #13#10 +
    'JWT_REFRESH_EXPIRE="7d"' + #13#10 +
    '' + #13#10 +
    '# Server' + #13#10 +
    'PORT=' + ServerPort + #13#10 +
    'NODE_ENV=production' + #13#10 +
    '' + #13#10 +
    '# Debug' + #13#10 +
    'DEBUG=false' + #13#10;
  
  SaveStringToFile(ExpandConstant('{app}\server\.env'), EnvContent, False);
end;

// Create ecosystem.config.js for the installed path
procedure CreateEcosystemConfig();
var
  Content: String;
begin
  Content :=
    'module.exports = {' + #13#10 +
    '  apps: [' + #13#10 +
    '    {' + #13#10 +
    '      name: ''turnfix-server'',' + #13#10 +
    '      script: ''./dist/index.js'',' + #13#10 +
    '      instances: 1,' + #13#10 +
    '      exec_mode: ''fork'',' + #13#10 +
    '      watch: false,' + #13#10 +
    '      max_memory_restart: ''500M'',' + #13#10 +
    '      env: {' + #13#10 +
    '        NODE_ENV: ''production'',' + #13#10 +
    '        PORT: ' + ServerPort + #13#10 +
    '      },' + #13#10 +
    '      error_file: ''./logs/err.log'',' + #13#10 +
    '      out_file: ''./logs/out.log'',' + #13#10 +
    '      log_date_format: ''YYYY-MM-DD HH:mm:ss Z'',' + #13#10 +
    '      merge_logs: true,' + #13#10 +
    '      autorestart: true,' + #13#10 +
    '      max_restarts: 10,' + #13#10 +
    '      min_uptime: ''10s'',' + #13#10 +
    '      restart_delay: 2000,' + #13#10 +
    '      kill_timeout: 10000,' + #13#10 +
    '      listen_timeout: 5000,' + #13#10 +
    '      exp_backoff_restart_delay: 100,' + #13#10 +
    '      stop_exit_codes: [0]' + #13#10 +
    '    },' + #13#10 +
    '    {' + #13#10 +
    '      name: ''turnfix-jury-server'',' + #13#10 +
    '      script: ''./dist/index.js'',' + #13#10 +
    '      instances: 1,' + #13#10 +
    '      exec_mode: ''fork'',' + #13#10 +
    '      watch: false,' + #13#10 +
    '      max_memory_restart: ''300M'',' + #13#10 +
    '      env: {' + #13#10 +
    '        NODE_ENV: ''production'',' + #13#10 +
    '        PORT: ' + JuryPort + ',' + #13#10 +
    '        JURY_MODE: ''true''' + #13#10 +
    '      },' + #13#10 +
    '      error_file: ''./logs/jury-err.log'',' + #13#10 +
    '      out_file: ''./logs/jury-out.log'',' + #13#10 +
    '      log_date_format: ''YYYY-MM-DD HH:mm:ss Z'',' + #13#10 +
    '      merge_logs: true,' + #13#10 +
    '      autorestart: true,' + #13#10 +
    '      max_restarts: 10,' + #13#10 +
    '      min_uptime: ''10s'',' + #13#10 +
    '      restart_delay: 2000,' + #13#10 +
    '      kill_timeout: 10000,' + #13#10 +
    '      listen_timeout: 5000' + #13#10 +
    '    }' + #13#10 +
    '  ]' + #13#10 +
    '};' + #13#10;
  
  SaveStringToFile(ExpandConstant('{app}\server\ecosystem.config.js'), Content, False);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  NodePath: String;
  NssmPath: String;
  AppPath: String;
  PgInstaller: String;
begin
  if CurStep = ssPostInstall then
  begin
    AppPath := ExpandConstant('{app}');
    NodePath := AppPath + '\nodejs\node.exe';
    NssmPath := AppPath + '\nssm\nssm.exe';
    
    // === Install PostgreSQL (if selected) ===
    if IsComponentSelected('postgresql') then
    begin
      if IsPostgreSQLInstalled then
      begin
        // PostgreSQL is already installed, skip
        WizardForm.StatusLabel.Caption := CustomMessage('PostgreSQLAlreadyInstalled');
        MsgBox(CustomMessage('PostgreSQLAlreadyInstalled'), mbInformation, MB_OK);
      end
      else
      begin
      WizardForm.StatusLabel.Caption := CustomMessage('InstallingPostgreSQL');
      
      PgInstaller := ExpandConstant('{tmp}\postgresql-installer.exe');
      if FileExists(PgInstaller) then
      begin
        // Silent PostgreSQL installation
        Exec(PgInstaller, 
          '--mode unattended --unattendedmodeui minimal' +
          ' --superpassword "' + DbPassword + '"' +
          ' --serverport 5432' +
          ' --servicename postgresql-16' +
          ' --servicepassword "' + DbPassword + '"' +
          ' --install_runtimes 0',
          '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
          
        if ResultCode <> 0 then
          MsgBox('PostgreSQL Installation hatte Probleme (Code: ' + IntToStr(ResultCode) + ').' + #13#10 +
                 'Bitte prüfen Sie die PostgreSQL-Installation manuell.', mbInformation, MB_OK);
      end;
      end;  // end else (not already installed)
    end;
    
    // === Create .env file ===
    WizardForm.StatusLabel.Caption := CustomMessage('InstallingApplication');
    CreateEnvFile();
    CreateEcosystemConfig();
    
    // === Setup Database ===
    WizardForm.StatusLabel.Caption := CustomMessage('ConfiguringDatabase');
    Exec('powershell.exe',
      '-ExecutionPolicy Bypass -File "' + AppPath + '\scripts\setup-database.ps1"' +
      ' -InstallDir "' + AppPath + '"' +
      ' -DbName "' + DbName + '"' +
      ' -DbPassword "' + DbPassword + '"' +
      ' -NodePath "' + NodePath + '"',
      AppPath, SW_SHOW, ewWaitUntilTerminated, ResultCode);
    
    // === Install Windows Service (if selected) ===
    if IsComponentSelected('service') then
    begin
      WizardForm.StatusLabel.Caption := CustomMessage('ConfiguringService');
      Exec('powershell.exe',
        '-ExecutionPolicy Bypass -File "' + AppPath + '\scripts\configure-service.ps1"' +
        ' -InstallDir "' + AppPath + '"' +
        ' -NodePath "' + NodePath + '"' +
        ' -NssmPath "' + NssmPath + '"' +
        ' -ServerPort "' + ServerPort + '"' +
        ' -JuryPort "' + JuryPort + '"',
        AppPath, SW_SHOW, ewWaitUntilTerminated, ResultCode);
    end;
    
    // === Configure Firewall (if selected) ===
    if IsComponentSelected('firewall') then
    begin
      WizardForm.StatusLabel.Caption := CustomMessage('ConfiguringFirewall');
      Exec('powershell.exe',
        '-ExecutionPolicy Bypass -File "' + AppPath + '\scripts\configure-firewall.ps1"' +
        ' -ServerPort "' + ServerPort + '"' +
        ' -JuryPort "' + JuryPort + '"',
        AppPath, SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;

    // === Start Tray Icon (if selected) ===
    if IsComponentSelected('trayicon') then
    begin
      Exec('powershell.exe',
        '-ExecutionPolicy Bypass -WindowStyle Hidden -File "' + AppPath + '\scripts\turnfix-tray.ps1"',
        AppPath, SW_HIDE, ewNoWait, ResultCode);
    end;
    
    WizardForm.StatusLabel.Caption := CustomMessage('InstallationComplete');
  end;
end;

// Custom uninstall steps
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
  AppPath: String;
begin
  if CurUninstallStep = usUninstall then
  begin
    AppPath := ExpandConstant('{app}');
    
    // Kill tray icon process
    Exec('taskkill', '/F /FI "WindowTitle eq TurnFix*" /IM powershell.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    
    // Remove tray icon autostart shortcut
    DeleteFile(ExpandConstant('{commonstartup}\TurnFix Tray.lnk'));
    
    // Remove firewall rules
    Exec('netsh', 'advfirewall firewall delete rule name="TurnFix Server"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    Exec('netsh', 'advfirewall firewall delete rule name="TurnFix Jury Portal"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;

# TurnFix Windows Setup - Verbessert

## 🎯 Übersicht

Vollständig automatisierte Installation von TurnFix auf Windows-Systemen mit einem Klick.

## ✨ Verbesserungen (Point 11)

### Neue Features:
- ✅ **Node.js Version-Check**: Prüft ob mindestens Node.js v18 installiert ist
- ✅ **PostgreSQL Direct Download**: Fallback wenn Chocolatey fehlschlägt
- ✅ **Verbesserte Fehlerbehandlung**: Detaillierte Fehlermeldungen und Troubleshooting
- ✅ **ForceUpdate Flag**: Ermöglicht Neuinstallation trotz bestehender Installation
- ✅ **Unattended PostgreSQL Install**: Automatischer Silent-Install ohne Benutzerinteraktion

## 🚀 Ein-Klick Installation

### Methode 1: Batch-Datei (Empfohlen für Endbenutzer)
1. **Rechtsklick** auf `INSTALL.bat` 
2. **"Als Administrator ausführen"** wählen
3. Fertig! ☕

### Methode 2: PowerShell (Für fortgeschrittene Benutzer)
```powershell
# Als Administrator ausführen
Set-ExecutionPolicy Bypass -Scope Process
.\complete-setup.ps1
```

### Methode 3: Verbesserte Installation
```powershell
# Als Administrator ausführen
.\install-prerequisites-improved.ps1
```

## 📋 Was wird installiert?

### Automatische Prüfungen:
- ✅ Betriebssystem-Kompatibilität (Windows 10/11)
- ✅ RAM (mind. 4GB, empfohlen 8GB)
- ✅ Speicherplatz (mind. 2GB frei)
- ✅ PowerShell Version
- ✅ Internet-Verbindung
- ✅ Administrator-Rechte

### Software-Komponenten:

#### 1. Prerequisites (Voraussetzungen)
| Software | Version | Zweck |
|----------|---------|-------|
| **Chocolatey** | Latest | Windows Paket-Manager |
| **Node.js** | v18+ LTS | JavaScript Runtime für Backend/Frontend |
| **PostgreSQL** | 15.x | Datenbank-Server |
| **Git** | Latest | Versionskontrolle |
| **VS Code** | Latest | Entwicklungsumgebung (optional) |
| **pgAdmin 4** | Latest | PostgreSQL Management Tool |

#### 2. Datenbank
- PostgreSQL Datenbank `turnfix`
- Benutzer `turnfix_user` mit Passwort
- Prisma Schema Deployment
- Beispieldaten (optional)

#### 3. Applikation
- TurnFix Source Code von GitHub
- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + Prisma
- Alle npm Dependencies
- Umgebungsvariablen (.env)
- Start-Skripte

## 🔧 Manuelle Installation (Schritt für Schritt)

### Schritt 1: System-Check
```powershell
.\check-requirements.ps1
```

**Was wird geprüft:**
- Betriebssystem (Windows 10/11, 64-bit)
- RAM (mind. 4GB)
- Speicherplatz (mind. 2GB)
- PowerShell Version
- Internet-Verbindung

### Schritt 2: Prerequisites installieren
```powershell
# Standard-Installation
.\install-prerequisites.ps1

# Oder verbesserte Version mit Version-Check
.\install-prerequisites-improved.ps1

# Mit benutzerdefinierten Parametern
.\install-prerequisites-improved.ps1 -PostgreSQLPassword "MeinPasswort" -ForceUpdate
```

**Parameter:**
- `-PostgreSQLPassword` - PostgreSQL Admin-Passwort (Standard: "turnfix2024")
- `-SkipNodeJS` - Node.js Installation überspringen
- `-SkipPostgreSQL` - PostgreSQL Installation überspringen
- `-SkipGit` - Git Installation überspringen
- `-SkipVSCode` - VS Code Installation überspringen
- `-ForceUpdate` - Neuinstallation auch wenn bereits installiert

### Schritt 3: Datenbank einrichten
```powershell
.\setup-database.ps1 -PostgreSQLPassword "turnfix2024" -DatabasePassword "turnfix_pass"
```

**Parameter:**
- `-PostgreSQLPassword` - PostgreSQL Admin-Passwort
- `-DatabaseName` - Datenbankname (Standard: "turnfix")
- `-DatabaseUser` - Datenbank-Benutzer (Standard: "turnfix_user")
- `-DatabasePassword` - Datenbank-Passwort (Standard: "turnfix_pass")
- `-PostgreSQLHost` - Host (Standard: "localhost")
- `-PostgreSQLPort` - Port (Standard: 5432)

### Schritt 4: Application installieren
```powershell
.\setup-turnfix.ps1 -InstallPath "C:\TurnFix"
```

**Parameter:**
- `-InstallPath` - Installations-Verzeichnis (Standard: "C:\TurnFix")
- `-GitRepository` - Git Repository URL
- `-Branch` - Git Branch (Standard: "WebInterface")
- `-SkipClone` - Repository klonen überspringen
- `-SkipDependencies` - npm install überspringen
- `-SkipDatabase` - Prisma Setup überspringen

## 🏃 TurnFix starten

### Option 1: Start-Skript (Empfohlen)
```powershell
C:\TurnFix\start-turnfix.ps1
```

Dies startet automatisch:
- Backend-Server (Port 3001)
- Frontend-Server (Port 5173)
- Öffnet Browser auf http://localhost:5173

### Option 2: Manueller Start
```powershell
# Terminal 1 - Backend
cd "C:\TurnFix\newWebBased\server"
npm run dev

# Terminal 2 - Frontend
cd "C:\TurnFix\newWebBased\client"
npm run dev
```

### Option 3: Mit Jury Portal
```powershell
C:\TurnFix\start-with-jury.ps1
```

Dies startet:
- Backend (Port 3001)
- Frontend (Port 5173)
- Jury Portal (Port 5174)

## 🔍 Fehlerbehebung

### Problem: "Execution Policy" Fehler
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass
```

### Problem: Chocolatey Installation fehlgeschlagen
**Lösung:**
- Als Administrator ausführen
- Antivirus temporär deaktivieren
- Proxy-Einstellungen prüfen

### Problem: PostgreSQL Installation fehlgeschlagen
**Lösung 1:** Manuelle Installation
1. Download von https://www.postgresql.org/download/windows/
2. Installer ausführen
3. Passwort setzen: `turnfix2024`
4. Port 5432 wählen

**Lösung 2:** Verbessertes Skript nutzt automatischen Fallback

### Problem: Node.js Version zu alt
**Lösung:**
```powershell
# Mit ForceUpdate Flag neu installieren
.\install-prerequisites-improved.ps1 -ForceUpdate
```

### Problem: npm Fehler bei Installation
```powershell
# npm Cache löschen
npm cache clean --force

# Dependencies neu installieren
cd "C:\TurnFix\newWebBased\server"
npm install

cd "C:\TurnFix\newWebBased\client"
npm install
```

### Problem: Datenbank-Verbindung fehlgeschlagen
**Prüfen:**
1. PostgreSQL Service läuft:
   ```powershell
   Get-Service -Name "postgresql*"
   ```
2. Verbindung testen:
   ```powershell
   psql -U postgres -h localhost
   ```
3. .env Datei prüfen:
   ```
   DATABASE_URL="postgresql://turnfix_user:turnfix_pass@localhost:5432/turnfix"
   ```

### Problem: Port bereits belegt
**Ports prüfen:**
```powershell
# Port 3001 (Backend)
netstat -ano | findstr :3001

# Port 5173 (Frontend)
netstat -ano | findstr :5173

# Port 5174 (Jury Portal)
netstat -ano | findstr :5174
```

**Prozess beenden:**
```powershell
# PID aus netstat Ausgabe verwenden
Stop-Process -Id <PID> -Force
```

## 📊 System-Anforderungen

### Minimum:
- **OS**: Windows 10 (64-bit)
- **RAM**: 4 GB
- **Storage**: 2 GB frei
- **Internet**: Für Download der Komponenten

### Empfohlen:
- **OS**: Windows 11 (64-bit)
- **RAM**: 8 GB oder mehr
- **Storage**: 10 GB frei
- **CPU**: Multi-Core Prozessor
- **Internet**: Breitband

## 📝 Log-Dateien

Setup erstellt automatisch Log-Dateien:
```
setup\windows\setup-log-YYYYMMDD-HHMMSS.txt
```

Diese enthalten:
- Alle ausgeführten Befehle
- Erfolgs-/Fehlermeldungen
- Zeitstempel
- Installierte Versionen

## 🔄 Update / Neuinstallation

### Prerequisites aktualisieren:
```powershell
.\install-prerequisites-improved.ps1 -ForceUpdate
```

### Applikation aktualisieren:
```powershell
cd "C:\TurnFix"
git pull origin WebInterface

cd newWebBased\server
npm install

cd ..\client
npm install

# Datenbank migrieren
cd ..\server
npx prisma migrate deploy
```

## 🗑️ Deinstallation

### Komplette Deinstallation:
```powershell
.\uninstall-turnfix.ps1
```

Oder Batch-Datei verwenden:
```
UNINSTALL.bat
```

Dies entfernt:
- TurnFix Applikation
- Datenbank (optional)
- Optional: Prerequisites (Node.js, PostgreSQL, etc.)

## 🆘 Support

Bei Problemen:
1. **Log-Datei prüfen**: `setup-log-*.txt`
2. **System-Check ausführen**: `.\check-requirements.ps1`
3. **GitHub Issues**: https://github.com/Igel18/turnfix/issues
4. **Dokumentation**: README.md im Hauptverzeichnis

## 📖 Weitere Dokumentation

- `setup-overview.md` - Technische Übersicht
- `../GETTING_STARTED.md` - Erste Schritte mit TurnFix
- `../README.md` - Haupt-Dokumentation
- `JURY_PORTAL_COMPARISON.md` - Jury Portal Information

## 🎓 Entwickler-Modus

Für Entwickler:
```powershell
# Setup ohne Production-Optimierungen
.\complete-setup.ps1 -SkipApplication

# Dann manuell klonen und konfigurieren
cd C:\TurnFix
git clone https://github.com/Igel18/turnfix.git .
git checkout WebInterface

# VS Code öffnen
code .
```

## ✅ Erfolgs-Checklist

Nach der Installation sollte folgendes funktionieren:

### Basis-Installation:
- [ ] `node --version` zeigt v18 oder höher
- [ ] `npm --version` zeigt eine Version
- [ ] `git --version` zeigt eine Version
- [ ] PostgreSQL Service läuft (services.msc)
- [ ] pgAdmin 4 ist installiert
- [ ] TurnFix Verzeichnis existiert (C:\TurnFix)

### Development Mode:
- [ ] Backend startet ohne Fehler (`npm run dev`)
- [ ] Frontend startet ohne Fehler (`npm run dev`)
- [ ] http://localhost:5173 öffnet die Anwendung
- [ ] http://localhost:3001/api/health zeigt "OK"
- [ ] Datenbankverbindung funktioniert

### Production Mode (PM2):
- [ ] PM2 ist installiert (`npm list -g pm2` oder in server/node_modules)
- [ ] Server baut erfolgreich (`npm run build`)
- [ ] PM2 startet Server (`npm run pm2:start:prod`)
- [ ] PM2 Status zeigt "online" (`npm run pm2:status`)
- [ ] Logs zeigen keine Fehler (`npm run pm2:logs`)
- [ ] Server startet nach Crash automatisch neu (Test mit `npm run pm2:restart`)
- [ ] Error Boundary fängt Frontend-Fehler ab
- [ ] Database Health Check läuft (Logs prüfen)

**PM2 Test:**
```powershell
cd C:\TurnFix\newWebBased\server
npm run build
npm run pm2:start:prod
npm run pm2:status
# Sollte "online" zeigen ✅
```

## 🔐 Sicherheits-Hinweise

**WICHTIG:**
- Standard-Passwörter ändern nach Installation!
- PostgreSQL Firewall-Regeln prüfen
- .env Dateien nicht committen
- Backup der Datenbank regelmäßig erstellen

**Passwörter ändern:**
```sql
-- In pgAdmin oder psql
ALTER USER turnfix_user WITH PASSWORD 'NeuesGeheimesPasswort';
```

Dann .env Datei aktualisieren:
```
DATABASE_URL="postgresql://turnfix_user:NeuesGeheimesPasswort@localhost:5432/turnfix"
```

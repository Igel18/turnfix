# TurnFix Installer - Build-Anleitung

## 📋 Voraussetzungen

### Auf dem Build-PC benötigt:
1. **Inno Setup 6** - [Download](https://jrsoftware.org/isdl.php)
2. **Node.js 18+** - zum Bauen von Server & Client
3. **PowerShell 5.1+** (Standard auf Windows 10/11)
4. **Internet-Verbindung** - zum Herunterladen von Node.js portable, NSSM und PostgreSQL

## 🚀 Installer bauen

### Schnellstart
```powershell
cd setup\installer
.\build-installer.ps1
```

### Mit Optionen
```powershell
# Build überspringen (wenn bereits gebaut)
.\build-installer.ps1 -SkipBuild

# Downloads überspringen (wenn bereits heruntergeladen)
.\build-installer.ps1 -SkipDownload

# Inno Setup Pfad angeben
.\build-installer.ps1 -InnoSetupPath "C:\Program Files (x86)\Inno Setup 6"

# Spezifische Node.js Version
.\build-installer.ps1 -NodeVersion "20.11.1"
```

### Was das Build-Script macht:
1. **Downloads** (in `setup/installer/downloads/`):
   - Node.js v20 portable (~30MB zip)
   - NSSM v2.24 (~300KB)
   - PostgreSQL 16 Installer (~300MB)

2. **Build** der Anwendung:
   - Server (TypeScript → JavaScript)
   - Client (React → Static HTML/JS)
   - Jury Portal (React → Static HTML/JS)

3. **Staging** (in `setup/installer/staging/`):
   - Kopiert Node.js portable
   - Kopiert NSSM
   - Kopiert Server dist + node_modules (nur production)
   - Kopiert Client dist
   - Kopiert Jury Portal dist
   - Kopiert Installer-Scripts

4. **Kompilierung** mit Inno Setup → `setup/installer/output/TurnFix-Setup-2.0.exe`

## 📦 Was der Installer installiert

### Installationsschritte:
| # | Schritt | Beschreibung |
|---|---------|-------------|
| 1 | **Admin-Rechte** | Werden automatisch angefordert |
| 2 | **Installationspfad** | Standard: `C:\TurnFix` |
| 3 | **Komponenten wählen** | App, Node.js, PostgreSQL, Service, Firewall |
| 4 | **Datenbank konfigurieren** | DB-Name und PostgreSQL-Passwort |
| 5 | **Ports konfigurieren** | Server (3001), Jury Portal (3002) |
| 6 | **PostgreSQL installieren** | Silent-Install (wenn gewählt) |
| 7 | **TurnFix installieren** | Server, Client, Jury Portal |
| 8 | **Datenbank einrichten** | DB erstellen, Prisma Schema Push |
| 9 | **Windows-Dienst** | NSSM-basierter Service (Autostart) |
| 10 | **Firewall** | Ports 3001/3002 öffnen |
| 11 | **Verknüpfungen** | Desktop + Startmenü |

### Installierte Komponenten:

```
C:\TurnFix\
├── nodejs\              # Node.js portable Runtime
│   ├── node.exe
│   ├── npm.cmd
│   └── ...
├── nssm\                # Service Manager
│   └── nssm.exe
├── server\              # TurnFix Backend
│   ├── dist\            # Compiled TypeScript
│   ├── prisma\          # Database Schema
│   ├── node_modules\    # Production Dependencies
│   ├── logs\            # Server Logs
│   ├── uploads\         # Uploaded Files
│   ├── .env             # Configuration
│   ├── ecosystem.config.js
│   └── package.json
├── client\              # TurnFix Frontend
│   ├── dist\            # Built React App
│   └── public\          # Static Assets
├── jury-portal\         # Kampfrichter Portal
│   └── dist\
├── scripts\             # Setup/Service Scripts
├── TurnFix-Manager.bat  # Management Tool
└── turnfix-manager.ps1
```

### Windows-Dienste:

| Service | Name | Port | Autostart |
|---------|------|------|-----------|
| TurnFix Server | `TurnFixServer` | 3001 | ✅ Ja |
| TurnFix Jury | `TurnFixJuryServer` | 3002 | ❌ Manuell |

## 🔧 Installationstypen

| Typ | PostgreSQL | Service | Firewall |
|-----|-----------|---------|----------|
| **Vollständig** | ✅ | ✅ | ✅ |
| **Kompakt** | ❌ | ❌ | ❌ |
| **Benutzerdefiniert** | Wählbar | Wählbar | Wählbar |

## 🗑️ Deinstallation

Der Uninstaller:
1. Stoppt und entfernt Windows-Dienste
2. Entfernt Firewall-Regeln
3. Löscht alle TurnFix-Dateien
4. **Behält PostgreSQL** (muss manuell deinstalliert werden)
5. **Behält die Datenbank** (Daten bleiben erhalten)

## 📁 Verzeichnisstruktur

```
setup/installer/
├── build-installer.ps1     # Build-Script
├── turnfix-setup.iss       # Inno Setup Script
├── README.md               # Diese Datei
├── scripts/                # Installer-Scripts
│   ├── install-postgresql.ps1
│   ├── setup-database.ps1
│   ├── configure-service.ps1
│   ├── configure-firewall.ps1
│   ├── uninstall-service.ps1
│   └── post-install.ps1
├── downloads/              # (automatisch, .gitignore)
│   ├── node-v20.11.1-win-x64.zip
│   ├── nssm-2.24.zip
│   └── postgresql-16-windows-x64.exe
├── staging/                # (automatisch, .gitignore)
│   └── ...
└── output/                 # (automatisch, .gitignore)
    └── TurnFix-Setup-2.0.exe
```

## ⚠️ Wichtige Hinweise

- Der PostgreSQL-Installer ist ~300MB groß und wird **nicht** ins Git eingecheckt
- Die `downloads/`, `staging/` und `output/` Verzeichnisse sind in `.gitignore`
- Für einen Build ohne PostgreSQL-Bundling: Einfach den PG-Download überspringen
- Der Installer ist für **Windows 10/11 x64** konzipiert
- Nach der Installation muss der **Datenbank-Setup-Assistent** über `http://localhost:3001/configuration` durchlaufen werden

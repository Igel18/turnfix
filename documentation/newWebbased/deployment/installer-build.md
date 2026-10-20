# 📦 Setup-Installer erstellen (Build-Anleitung)

## Übersicht

TurnFix wird als Windows-Installer (`.exe`) mit **Inno Setup 6** verpackt. Das Build-Script `build-installer.ps1` automatisiert den gesamten Prozess: Anwendung bauen, Abhängigkeiten herunterladen, Dateien zusammenstellen und den Installer kompilieren.

> **Quellverzeichnis**: `setup/installer/`

---

## 📋 Voraussetzungen

| Voraussetzung | Version | Beschreibung |
|---|---|---|
| **Inno Setup 6** | 6.x | [Download](https://jrsoftware.org/isdl.php) — Installer-Compiler |
| **Node.js** | 18+ | Zum Bauen von Server & Client |
| **PowerShell** | 5.1+ | Standard auf Windows 10/11 |
| **Internet** | — | Für Downloads (Node.js portable, NSSM, PostgreSQL) |

---

## 🚀 Installer bauen

### Schnellstart

```powershell
cd setup\installer
.\build-installer.ps1
```

### Optionen

| Parameter | Beschreibung | Beispiel |
|---|---|---|
| `-SkipBuild` | Überspringt `npm build` (wenn bereits gebaut) | `.\build-installer.ps1 -SkipBuild` |
| `-SkipDownload` | Überspringt Downloads (wenn bereits vorhanden) | `.\build-installer.ps1 -SkipDownload` |
| `-InnoSetupPath` | Manueller Pfad zu Inno Setup | `.\build-installer.ps1 -InnoSetupPath "C:\Program Files (x86)\Inno Setup 6"` |
| `-NodeVersion` | Node.js Version für portable Runtime | `.\build-installer.ps1 -NodeVersion "20.11.1"` |
| `-NssmVersion` | NSSM Version für Service-Manager | `.\build-installer.ps1 -NssmVersion "2.24"` |

### Kombiniert

```powershell
# Nur Installer neu bauen (ohne npm build und ohne erneuten Download)
.\build-installer.ps1 -SkipBuild -SkipDownload
```

---

## 🔄 Build-Ablauf

Das Script durchläuft automatisch folgende Schritte:

### 1. Downloads (~330 MB)
In `setup/installer/downloads/`:
- **Node.js v20 portable** (~30 MB zip) — Standalone Runtime ohne Installation
- **NSSM v2.24** (~300 KB) — Windows Service Manager
- **PostgreSQL 16 Installer** (~300 MB) — Optionale Datenbank

### 2. Anwendung bauen
- **Server**: TypeScript → JavaScript (`newWebBased/server/dist/`)
- **Client**: React → Static HTML/JS/CSS (`newWebBased/client/dist/`)
- **Jury Portal**: React → Static HTML/JS/CSS (`newWebBased/jury-portal/dist/`)

### 3. Staging
In `setup/installer/staging/` werden alle Dateien zusammengestellt:
- Node.js portable entpackt
- NSSM extrahiert
- Server `dist/` + `node_modules/` (nur production)
- Client `dist/`
- Jury Portal `dist/`
- Installer-Scripts kopiert
- `ecosystem.config.js`, `TurnFix-Manager.bat`, etc.

### 4. Kompilierung
Inno Setup kompiliert alles zu einer `.exe`:
```
setup/installer/output/TurnFix-Setup-{Version}-build{BuildNumber}-{GitHash}.exe
```

**Dateiname-Beispiel**: `TurnFix-Setup-2.0.0-build42-a1b2c3d.exe`

---

## 📦 Was der Installer installiert

### Installationsschritte

| # | Schritt | Beschreibung |
|---|---------|-------------|
| 1 | Admin-Rechte | Werden automatisch angefordert |
| 2 | Installationspfad | Standard: `C:\Program Files\TurnFix` |
| 3 | Komponenten wählen | App, Node.js, PostgreSQL, Service, Firewall |
| 4 | Datenbank konfigurieren | DB-Name und PostgreSQL-Passwort |
| 5 | Ports konfigurieren | Server (3001), Jury Portal (3002) |
| 6 | PostgreSQL installieren | Silent-Install (wenn gewählt) |
| 7 | TurnFix installieren | Server, Client, Jury Portal |
| 8 | Datenbank einrichten | DB erstellen, Prisma Schema Push |
| 9 | Windows-Dienst | NSSM-basierter Service (Autostart) |
| 10 | Firewall | Ports 3001/3002 öffnen |
| 11 | Verknüpfungen | Desktop + Startmenü |

### Tray-App und Administratorrechte

- Die TurnFix Tray-App wird beim Build mit einem eingebetteten Manifest (requestedExecutionLevel=requireAdministrator) erstellt.
- Damit kann die Tray-App Dienste lokal zuverlässig starten/stoppen.
- Das Verhalten wird durch das Setup sichergestellt, da genau diese kompilierte EXE installiert wird.

### Installationstypen

| Typ | PostgreSQL | Service | Firewall |
|-----|-----------|---------|----------|
| **Vollständig** | ✅ | ✅ | ✅ |
| **Kompakt** | ❌ | ❌ | ❌ |
| **Benutzerdefiniert** | Wählbar | Wählbar | Wählbar |

### Installierte Verzeichnisstruktur

```
C:\Program Files\TurnFix\
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
│   └── dist\            # Built React App
├── jury-portal\         # Kampfrichter Portal
│   └── dist\
├── scripts\             # Setup/Service Scripts
├── TurnFix-Manager.bat  # Management Tool
└── turnfix-manager.ps1
```

### Windows-Dienste

| Service | Name | Port | Autostart |
|---------|------|------|-----------|
| TurnFix Server | `TurnFixServer` | 3001 | ✅ Ja |
| TurnFix Jury | `TurnFixJuryServer` | 3002 | ❌ Manuell |

---

## 🗑️ Deinstallation

Der Uninstaller:
1. Stoppt und entfernt Windows-Dienste
2. Entfernt Firewall-Regeln
3. Löscht alle TurnFix-Dateien
4. **Behält PostgreSQL** (muss manuell deinstalliert werden)
5. **Behält die Datenbank** (Daten bleiben erhalten)

---

## 📁 Build-Verzeichnisstruktur

```
setup/installer/
├── build-installer.ps1     # Haupt-Build-Script
├── turnfix-setup.iss       # Inno Setup Script
├── README.md               # Kurzanleitung
├── scripts/                # Installer-Scripts (werden mitinstalliert)
│   ├── install-postgresql.ps1
│   ├── setup-database.ps1
│   ├── configure-service.ps1
│   ├── configure-firewall.ps1
│   ├── uninstall-service.ps1
│   └── post-install.ps1
├── downloads/              # (automatisch, .gitignore)
├── staging/                # (automatisch, .gitignore)
└── output/                 # (automatisch, .gitignore)
    └── TurnFix-Setup-2.0.0-build42-a1b2c3d.exe
```

> ⚠️ Die Ordner `downloads/`, `staging/` und `output/` werden automatisch erstellt und sind in `.gitignore` eingetragen.

---

## ⚠️ Wichtige Hinweise

- Der **PostgreSQL-Installer** ist ~300 MB groß und wird **nicht** ins Git eingecheckt
- Der Installer ist für **Windows 10/11 x64** konzipiert
- Nach der Installation muss der **Datenbank-Setup-Assistent** über `http://localhost:3001/configuration` durchlaufen werden
- Für einen Build **ohne PostgreSQL-Bundling**: Einfach den PG-Download überspringen (`-SkipDownload` + manuell `downloads/postgresql-installer.exe` löschen)
- Der Output-Dateiname enthält **Version**, **Build-Nummer** und **Git-Hash** für eindeutige Identifikation

---

## 🔗 Verwandte Dokumentation

- [Produktiv-Deployment](production.md) — Server im Production-Modus betreiben
- [Netzwerk-Konfiguration](network.md) — Zugriff von anderen Geräten
- [Firewall-Konfiguration](firewall-platform.md) — Ports öffnen
- [Jury Portal Access](jury-portal-access.md) — Kampfrichter-Zugang einrichten

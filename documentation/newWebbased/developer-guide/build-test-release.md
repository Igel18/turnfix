# 🔄 Build → Test → Release Workflow

Kompletter Ablauf von Code-Änderung bis zum fertigen Installer.

---

## Übersicht

```
1. Bauen        →  Server + Client + Jury-Portal kompilieren
2. Testen       →  Server-Tests, Client-Tests, E2E-Tests
3. Installer    →  Setup-Exe mit Inno Setup erstellen
```

---

## 1. Bauen

### Voraussetzungen
- Node.js 18+ installiert
- PostgreSQL läuft (für Server-Integration-Tests)
- Dependencies installiert: `npm install` in `server/` und `client/`

### Kompilieren

```powershell
# Alles auf einmal (vom server-Verzeichnis)
cd newWebBased\server
npm run build:all
```

Das führt nacheinander aus:
1. **Server**: TypeScript → JavaScript (`server/dist/`)
2. **Client**: React → Static Files (`client/dist/`)
3. **Jury Portal**: React → Static Files (`jury-portal/dist/`)

### Einzeln bauen (optional)

```powershell
# Nur Server
cd newWebBased\server
npm run build

# Nur Client
cd newWebBased\client
npm run build

# Nur Jury Portal
cd newWebBased\jury-portal
npm run build
```

---

## 2. Testen

### 2a. Server-Tests (Jest)

```powershell
cd newWebBased\server
npm test
```

- **~44 Test-Suites, ~1.309 Tests**
- Unit-Tests (Business-Logik, Utilities, Middleware)
- Integration-Tests (alle API-Endpunkte gegen Test-Datenbank)
- Voraussetzung: PostgreSQL läuft, Test-DB wird automatisch erstellt

```powershell
# Mit Coverage-Report
npm test -- --coverage

# Nur Unit-Tests
npm test -- tests/unit

# Nur Integration-Tests
npm test -- tests/integration
```

### 2b. Client-Tests (Vitest)

```powershell
cd newWebBased\client
npx vitest run
```

- **~30 Test-Dateien, ~786 Tests**
- Component-Tests, Hook-Tests, Utility-Tests
- Integration-Tests mit MSW (Mock Service Worker)
- Keine laufenden Server nötig

```powershell
# Mit Coverage
npx vitest run --coverage

# Interaktive UI
npx vitest --ui
```

### 2c. E2E-Tests (Playwright)

> **Voraussetzung**: Server UND Client müssen laufen!

```powershell
# Terminal 1: Server starten
cd newWebBased\server
npm run dev

# Terminal 2: Client starten
cd newWebBased\client
npm run dev

# Terminal 3: Tests ausführen
cd newWebBased\client
npx playwright test
```

- **18 Spec-Dateien + 3 Setup-Dateien = 284 Tests**
- Setup erstellt Testdaten (Event A via API, Event B via GymNet-Import)
- Tests prüfen alle kritischen Workflows
- Teardown räumt automatisch auf

```powershell
# Nur bestimmte Tests
npx playwright test e2e/tests/score-entry.spec.ts

# Mit sichtbarem Browser
npx playwright test --headed

# Interaktiver Debug-Modus
npx playwright test --debug

# HTML-Report öffnen
npx playwright show-report
```

#### E2E Test-Kategorien

| Kategorie | Tests | Beschreibung |
|-----------|:-----:|-------------|
| Navigation | 16 | Smoke-Tests aller Routen |
| Stammdaten (6×) | 64 | CRUD für Regionen, Vereine, etc. |
| Event-Management | 13 | Events, Wettkämpfe, Teilnehmer |
| Wettbewerbe | 12 | Wettkämpfe, Riegen, Zuordnung |
| Import | 17 | GymNet-Import, DB-Wizard, Seeding |
| Score-Eingabe | 11 | Wertungseingabe Damen/Herren |
| Ergebnisse | 14 | Rankings, Medaillenspiegel |
| Platzierungen | 17 | Tie-Breaking, Score-Änderungen |
| Statistik | 19 | Score-Counts, Duplikate, Isolation |
| Jury-Portal | 26 | Navigation, Scores, Live-Updates |
| Status | 19 | Riegen-/Wettkampfstatus-Workflows |
| PDF-Export | 13 | PDF-Generierung für 6 Seiten |
| Lasttests | 17 | Concurrent Writes, Benchmarks |

### 2d. Alle Tests auf einmal

```powershell
# Schritt 1: Server-Tests
cd newWebBased\server
npm test

# Schritt 2: Client-Tests
cd ..\client
npx vitest run

# Schritt 3: E2E-Tests (Server + Client müssen laufen)
npx playwright test
```

> **Tipp**: Server- und Client-Tests können parallel laufen (verschiedene Terminals). E2E-Tests brauchen laufende Dev-Server.

---

## 3. Installer bauen

### Voraussetzungen
- [Inno Setup 6](https://jrsoftware.org/isdl.php) installiert
- Anwendung gebaut (Schritt 1)
- Tests bestanden (Schritt 2)

### Installer erstellen

```powershell
cd setup\installer
.\build-installer.ps1
```

### Optionen

```powershell
# Nur Installer, ohne erneuten Build
.\build-installer.ps1 -SkipBuild

# Nur Installer, ohne Downloads (wenn bereits vorhanden)
.\build-installer.ps1 -SkipBuild -SkipDownload

# Mit spezifischer Node.js-Version
.\build-installer.ps1 -NodeVersion "20.11.1"
```

### Output

```
setup\installer\output\TurnFix-Setup-{Version}-build{Nr}-{GitHash}.exe
```

Beispiel: `TurnFix-Setup-2.0.0-build42-a1b2c3d.exe`

> Siehe [Installer-Build-Anleitung](../deployment/installer-build.md) für alle Details.

---

## Kompletter Release-Ablauf (Checkliste)

```
☐ 1. Code-Änderungen committen
☐ 2. npm run build:all                  (im server-Verzeichnis)
☐ 3. npm test                           (Server-Tests)
☐ 4. npx vitest run                     (Client-Tests)
☐ 5. Dev-Server starten (server + client)
☐ 6. npx playwright test                (E2E-Tests)
☐ 7. cd setup\installer
☐ 8. .\build-installer.ps1 -SkipBuild   (Installer erstellen)
☐ 9. Output-Datei testen (Installation auf sauberem System)
☐ 10. Git-Tag erstellen: git tag v2.x.x
```

---

## Aktuelle Testzahlen

| Bereich | Dateien | Tests |
|---------|:-------:|:-----:|
| Server (Jest) | ~44 | ~1.309 |
| Client (Vitest) | ~30 | ~786 |
| E2E (Playwright) | 21 | 284 |
| **Gesamt** | **~95** | **~2.380** |

---

## Fehlerbehebung

### Server-Tests schlagen fehl mit Prisma-Lock-Error
Der Server darf **nicht gleichzeitig** laufen, wenn Server-Tests ausgeführt werden (beide nutzen die gleiche Prisma-Engine-DLL).

```powershell
# Server stoppen, dann Tests
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
cd newWebBased\server
npm test
```

### E2E-Tests brauchen Setup-Daten
Wenn E2E-Tests mit "state file not found" fehlschlagen, wurde der Setup-Schritt nicht ausgeführt:

```powershell
# Volles Setup + Tests
npx playwright test

# Oder nur Setup
npx playwright test --project=setup
```

### Port 3001 blockiert
Nach einem Serverabsturz kann der Port blockiert sein:

```powershell
# Port prüfen
netstat -ano | findstr ":3001"

# Prozess beenden
taskkill /PID <PID> /F

# Oder warten (~30-60s, Windows gibt TCP-Ports verzögert frei)
```

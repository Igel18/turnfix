# @turnfix/shared — Gemeinsame Utilities

**Paketname**: `@turnfix/shared`  
**Pfad**: `newWebBased/shared/`  
**Version**: 1.0.0  

## Übersicht

Das `@turnfix/shared`-Paket ist die **Single Source of Truth** für Logik, die in mehreren TurnFix-Projekten (client, server, jury-portal) verwendet wird. Anstatt Code zu duplizieren, liegt die kanonische Implementierung in `shared/src/` und wird von den Projekten über Re-Export-Shims konsumiert.

### Architektur

```
newWebBased/
├── shared/                          ← Kanonische Quelle (npm-Paket)
│   ├── src/
│   │   ├── index.ts                 ← Barrel-Export
│   │   ├── formulaUtils.ts          ← Formelberechnung
│   │   ├── scoreFormatter.ts        ← Wertungsformatierung
│   │   ├── genderHelpers.ts         ← Geschlecht-Mapping
│   │   ├── iconUtils.ts             ← Icon-Pfade & Disziplin-Maps
│   │   └── socketConfig.ts          ← Socket.IO-Konfiguration
│   ├── dist/                        ← Kompilierte JS + Deklarationen
│   ├── package.json
│   └── tsconfig.json
│
├── client/src/utils/
│   ├── formulaUtils.ts              ← Re-Export-Shim → @turnfix/shared
│   ├── scoreFormatter.ts            ← Re-Export-Shim → @turnfix/shared/dist/scoreFormatter
│   ├── genderHelpers.ts             ← Re-Export-Shim + Alias mapDatabaseGenderValue
│   ├── iconUtils.ts                 ← Re-Export + lokales getIconUrl (localhost:3001)
│   ├── disciplineIcons.ts           ← Re-Export Maps + lokale PDF-Helfer
│   └── socket.ts                    ← Shared SOCKET_OPTIONS + lokale URL-Auflösung
│
├── server/src/utils/
│   ├── formulaUtils.ts              ← Re-Export-Shim → @turnfix/shared
│   ├── genderHelpers.ts             ← Re-Export + lokale SQL CASE-Helfer
│   └── iconUtils.ts                 ← Re-Export + lokales getIconUrl + iconExists (fs)
│
└── jury-portal/src/utils/
    ├── formulaUtils.ts              ← Re-Export-Shim → @turnfix/shared
    ├── scoreFormatter.ts            ← Re-Export-Shim → @turnfix/shared/dist/scoreFormatter
    ├── iconUtils.ts                 ← Re-Export + lokales getIconUrl (BASE_URL)
    └── socket.ts                    ← Shared SOCKET_OPTIONS + lokale URL-Auflösung
```

---

## Installation & Build

### Abhängigkeit einrichten

Jedes Projekt referenziert das Shared-Paket als lokale Datei:

```bash
# In client/, server/ oder jury-portal/:
npm install "../shared"
```

Dies erzeugt in der `package.json`:
```json
{
  "dependencies": {
    "@turnfix/shared": "file:../shared"
  }
}
```

### Build-Reihenfolge

Das Shared-Paket **muss immer zuerst** gebaut werden:

```bash
# Einzeln:
cd newWebBased/shared && npm run build

# Über Root-Skript (empfohlen):
cd newWebBased && npm run build:shared && npm run build:server && npm run build:client
```

Die Build-Pipeline (`run-pipeline.ps1`) baut Shared automatisch als Step 0.

### Verfügbare Scripts

| Script | Befehl | Beschreibung |
|---|---|---|
| `build` | `tsc` | Kompiliert nach `dist/` |
| `build:watch` | `tsc --watch` | Kontinuierliches Kompilieren |
| `clean` | `rimraf dist` | Bereinigt `dist/`-Ordner |

---

## Module im Detail

### 1. formulaUtils.ts — Formelberechnung

Parst und berechnet Disziplin-Formeln (z.B. `A + B - C`), die in `tfx_disziplinen_felder` definiert sind.

**Konsumenten**: client, server, jury-portal

| Export | Typ | Beschreibung |
|---|---|---|
| `FormulaField` | interface | Feld-Definition mit Name, Symbol, Formel |
| `ParsedFormula` | interface | Geparste Formel mit Variablen & Expression |
| `FORMULA_VARIABLES` | `string[]` | Erlaubte Variablennamen `['A','B',…,'Z']` |
| `extractFormulaSymbols(formula)` | function | Extrahiert Variablen aus Formelstring |
| `getFormulaSymbol(index)` | function | Index → Buchstabe (`0→'A'`, `1→'B'`) |
| `parseFormula(formula)` | function | Formelstring → `ParsedFormula`-Objekt |
| `formatFormulaWithValues(formula, values)` | function | Formel mit eingesetzten Werten anzeigen |
| `calculateFormula(formula, values, sortOrder?)` | function | Formel berechnen mit optionaler Sortierung |
| `validateFormula(formula)` | function | Syntax-Validierung einer Formel |
| `isSubtractionField(fieldName)` | function | Prüft ob Feld ein Abzugsfeld ist |
| `buildFieldSymbolsMap(fields)` | function | Felder → Symbol-Zuordnung |
| `formatScore(score, decimals)` | function | Einfache Dezimalformatierung |

**Import-Beispiel**:
```typescript
import { calculateFormula, parseFormula } from '@/utils/formulaUtils';
```

---

### 2. scoreFormatter.ts — Wertungsformatierung

Konfigurationsbasierte Formatierung von Wertungen: Dezimal, Zeit, Komma/Punkt.

**Konsumenten**: client, jury-portal

> ⚠️ **Namenskonflikt**: `scoreFormatter.formatScore` kollidiert mit `formulaUtils.formatScore`. Deshalb wird scoreFormatter über **Subpath-Import** eingebunden, nicht über den Barrel-Export.

| Export | Typ | Beschreibung |
|---|---|---|
| `DisciplineScoreConfig` | interface | Konfiguration: calculationType, inputMask, unit |
| `detectFormatType(inputMask)` | function | Erkennung: `'time'`, `'decimal-comma'`, `'decimal-point'` |
| `getDecimalSeparator(inputMask)` | function | `.` oder `,` |
| `formatTime(seconds, format)` | function | Sekunden → `"1:23:45"` |
| `parseTime(timeStr)` | function | `"1:23:45"` → Sekunden |
| `getDecimalPlaces(calculationType)` | function | Berechnung → Dezimalstellen (0–3) |
| `formatScore(value, config)` | function | Wert + Config → formatierter String |
| `formatDisciplineScore(disciplineId, value)` | function | Formatierung mit gecachter Config |
| `setDisciplineConfig(id, config)` | function | Config für Disziplin setzen |
| `initializeDisciplineConfigs(disciplines)` | function | Alle Configs laden |
| `clearDisciplineCache()` | function | Cache leeren |
| `getScorePlaceholder(config)` | function | Platzhalter für Eingabefeld |
| `getScoreInputStep(config)` | function | Step-Wert für `<input>` |
| `validateAndRoundScore(score, config)` | function | Validierung + Rundung |
| `normalizeScoreInput(input, config)` | function | Eingabe normalisieren |
| `parseScoreInput(input)` | function | String → Zahl |

**Import-Beispiel** (Subpath wegen Namenskonflikt):
```typescript
// In den Shim-Dateien:
import { formatScore, parseScoreInput } from '@turnfix/shared/dist/scoreFormatter';

// In Konsumenten (über Shim):
import { formatScore, parseScoreInput } from '@/utils/scoreFormatter';
```

---

### 3. genderHelpers.ts — Geschlecht-Mapping

Einheitliche Typkonvertierung Datenbank ↔ Englisch ↔ Deutsch für Geschlechtswerte.

**Konsumenten**: client, server

| Export | Typ | Beschreibung |
|---|---|---|
| `GenderValue` | type | `'male' \| 'female' \| 'both' \| 'unknown'` |
| `GenderValueDE` | type | `'männlich' \| 'weiblich' \| 'gemischt' \| 'unbekannt'` |
| `GenderValueDB` | type | `0 \| 1 \| 2` |
| `normalizeGender(value)` | function | Beliebigen Wert → `GenderValue` |
| `normalizeGenderLegacy(value)` | function | Erzwingt `'male'` oder `'female'` |
| `mapDatabaseGenderToString(int)` | function | DB-Int → English-String |
| `mapDatabaseGenderToGerman(int)` | function | DB-Int → Deutsch-String |
| `mapStringGenderToDatabase(str)` | function | String → DB-Int |
| `mapGermanGenderToEnglish(str)` | function | Deutsch → English |
| `mapEnglishGenderToGerman(value)` | function | English → Deutsch |
| `getLocalizedGenderName(gender, locale)` | function | Lokalisierte Anzeige |
| `isGenderSet(int)` | function | Prüft ob 1 oder 2 |
| `isValidGenderValue(value)` | guard | Type-Guard für GenderValue |
| `isValidDatabaseGenderValue(value)` | guard | Type-Guard für GenderValueDB |
| `parseGenderFilter(param)` | function | URL-Parameter → DB-Int |

**Server-spezifische Erweiterungen** (nicht im Shared-Paket):
- `getGenderNameCaseStatement()` — SQL CASE für englische Namen
- `getGermanGenderCaseStatement()` — SQL CASE für deutsche Namen

**Import-Beispiel**:
```typescript
import { normalizeGender, type GenderValue } from '@/utils/genderHelpers';
```

---

### 4. iconUtils.ts — Icon-Pfade & Disziplin-Zuordnung

Qt-Ressourcenpfade (`:/icons/boden.png`) in Dateinamen konvertieren, Disziplin-Fallbacks.

**Konsumenten**: client, server, jury-portal (jeweils mit lokaler URL-Logik)

| Export | Typ | Beschreibung |
|---|---|---|
| `getIconFilename(iconPath)` | function | `":/icons/100.png"` → `"100.png"` |
| `stripQtPrefix(iconPath)` | function | Qt-Prefix entfernen |
| `DISCIPLINE_ICON_MAP` | `Record<string, string>` | Disziplinname → Dateiname |
| `DISCIPLINE_EMOJI_MAP` | `Record<string, string>` | Disziplinname → Emoji |
| `getFallbackDeviceEmoji(name)` | function | Emoji-Fallback für Disziplin |
| `DISCIPLINE_SHORT_NAME_MAP` | `Record<string, string>` | Disziplinname → Kurzname (PDF) |

**Nicht im Shared-Paket** (umgebungsspezifisch):
- `getIconUrl()` — URL-Konstruktion (client: `localhost:3001`, jury-portal: `BASE_URL`, server: relativ)
- `checkIconExists()` — Browser-Image-Check (client)
- `iconExists()` — `fs.existsSync` (server)
- `getDisciplineIcon()` — URL mit Fallback (jury-portal, client/disciplineIcons)

**Import-Beispiel**:
```typescript
import { getIconUrl, DISCIPLINE_ICON_MAP } from '@/utils/iconUtils';
```

---

### 5. socketConfig.ts — Socket.IO-Konfiguration

Gemeinsame Verbindungsoptionen für Socket.IO-Clients.

**Konsumenten**: client, jury-portal

| Export | Typ | Beschreibung |
|---|---|---|
| `SOCKET_OPTIONS` | object | `{ transports, autoConnect, reconnection, ... }` |
| `SOCKET_SERVER_PORT` | `number` | `3001` |

**Import-Beispiel**:
```typescript
import { SOCKET_OPTIONS, SOCKET_SERVER_PORT } from '@turnfix/shared';

socket = io(url, { ...SOCKET_OPTIONS });
```

---

## Re-Export-Shim-Muster

Jedes Projekt behält seine lokalen Dateien (z.B. `client/src/utils/genderHelpers.ts`), aber der Inhalt ist ein **Re-Export-Shim** — eine dünne Weiterleitungsdatei ohne eigene Logik:

### Einfacher Re-Export (Barrel)

```typescript
// client/src/utils/formulaUtils.ts
export {
  calculateFormula,
  parseFormula,
  formatScore,
  // ... alle Exports
} from '@turnfix/shared';

export type { FormulaField, ParsedFormula } from '@turnfix/shared';
```

### Subpath-Import (bei Namenskonflikt)

```typescript
// client/src/utils/scoreFormatter.ts
export {
  formatScore,        // ← kollidiert mit formulaUtils.formatScore im Barrel
  parseScoreInput,
  // ...
} from '@turnfix/shared/dist/scoreFormatter';  // ← Subpath statt Barrel
```

### Re-Export + Lokale Erweiterung

```typescript
// server/src/utils/genderHelpers.ts
export { normalizeGender, mapDatabaseGenderToString, ... } from '@turnfix/shared';
export type { GenderValue, GenderValueDE } from '@turnfix/shared';

// ─── Server-only (bleibt lokal) ───
export function getGermanGenderCaseStatement(...): string { ... }
```

### Re-Export + Rückwärtskompatible Aliase

```typescript
// client/src/utils/genderHelpers.ts
export { mapDatabaseGenderToString, ... } from '@turnfix/shared';

// Alter Name → neuer Name
export { mapDatabaseGenderToString as mapDatabaseGenderValue } from '@turnfix/shared';
```

**Vorteil**: Bestehende Imports in Konsumenten-Dateien bleiben unverändert:
```typescript
// Diese Zeile war vorher da und funktioniert nach der Migration weiterhin:
import { normalizeGender } from '@/utils/genderHelpers';
```

---

## Neues Shared-Modul hinzufügen

### Schritt-für-Schritt

1. **Erstelle die Datei in `shared/src/`**:
   ```typescript
   // shared/src/myNewUtil.ts
   export function myFunction(): void { ... }
   ```

2. **Barrel-Export aktualisieren** (`shared/src/index.ts`):
   ```typescript
   export * from './myNewUtil';
   ```
   > Falls ein Export-Name mit einem bestehenden Modul kollidiert, den neuen Modul **nicht** zum Barrel hinzufügen und stattdessen Subpath-Import verwenden.

3. **Shared-Paket bauen**:
   ```bash
   cd newWebBased/shared && npm run build
   ```

4. **Re-Export-Shim in jedem Konsumenten erstellen**:
   ```typescript
   // client/src/utils/myNewUtil.ts
   export { myFunction } from '@turnfix/shared';
   ```

5. **Typen verifizieren**:
   ```bash
   cd client && npx tsc --noEmit
   cd server && npx tsc --noEmit
   cd jury-portal && npx tsc --noEmit
   ```

6. **Tests ausführen**:
   ```bash
   cd client && npx vitest run
   cd server && npx jest tests/unit/ --no-globalSetup --no-globalTeardown
   ```

---

## Entscheidungshilfe: Was gehört ins Shared-Paket?

| Kriterium | → Shared | → Lokal bleiben |
|---|---|---|
| Identische Logik in ≥2 Projekten | ✅ | |
| Gleiche Typen/Interfaces in ≥2 Projekten | ✅ | |
| Gemeinsame Konstanten/Konfiguration | ✅ | |
| Umgebungsspezifisch (Browser-API, `fs`, `import.meta.env`) | | ✅ |
| SQL-Helfer (nur Server) | | ✅ |
| Nur in einem Projekt verwendet | | ✅ |
| Unterschiedliche Laufzeiten (z.B. `debug.ts`) | | ✅ |

---

## TypeScript-Konfiguration

```jsonc
// shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",       // Kompatibel mit Server (CommonJS) und Client (Bundler)
    "declaration": true,         // .d.ts-Dateien für Typen
    "declarationMap": true,      // Source-Maps für Deklarationen
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

**Hinweis**: Das Shared-Paket nutzt `commonjs` als Modulformat. Dies funktioniert sowohl mit dem Server (CommonJS) als auch mit Client/Jury-Portal (Vite-Bundler löst CommonJS-Imports transparent auf).

---

## Abhängigkeiten

| Paket | Grund |
|---|---|
| `expr-eval` | Formelberechnung in `formulaUtils.ts` |
| `@types/node` (dev) | TypeScript-Typen für `console` etc. |
| `rimraf` (dev) | `dist/`-Bereinigung |
| `typescript` (dev) | Compiler |

---

## Häufige Fehler

### "formatScore" Namenskonflikt
`formulaUtils.formatScore(score, decimals)` und `scoreFormatter.formatScore(value, config)` haben **unterschiedliche Signaturen**. Deshalb ist `scoreFormatter` nicht im Barrel-Export. Verwende Subpath-Import:
```typescript
// ❌ FALSCH — kollidiert
import { formatScore } from '@turnfix/shared';  // Welches formatScore?

// ✅ RICHTIG — eindeutig
import { formatScore } from '@turnfix/shared/dist/scoreFormatter';
```

### "Cannot find module @turnfix/shared"
```bash
# Shared zuerst bauen!
cd newWebBased/shared && npm run build

# Dann in Konsumenten neu installieren:
cd ../client && npm install
```

### Änderungen im Shared werden nicht wirksam
Nach jeder Änderung in `shared/src/`:
```bash
cd shared && npm run build   # → dist/ aktualisieren
```
In Development: `npm run build:watch` in einem separaten Terminal verwenden.

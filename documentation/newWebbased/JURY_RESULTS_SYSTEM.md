# Jury Results System Documentation

**Version**: 2.0 | **Last Updated**: 2026-01-28 | **Status**: ✅ Fully Implemented

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Concept & Motivation](#concept--motivation)
3. [Database Architecture](#database-architecture)
4. [Formula System](#formula-system)
5. [Automatic Calculation](#automatic-calculation)
6. [Data Flow](#data-flow)
7. [API Integration](#api-integration)
8. [UI Components](#ui-components)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

**Jury Results** ist ein feldbasiertes Bewertungssystem für Turnen-Wettkämpfe (besonders P1-P9 Programme), das:
- ✅ **Einzelne Bewertungsfelder** erfasst (z.B. "Stufe", "Abzug Ausführung")
- ✅ **Formeln** verwendet um den finalen Score zu berechnen
- ✅ **Automatisch** fehlende Endwerte berechnet und speichert
- ✅ **Transparent** die Berechnung in der UI anzeigt

**Beispiel P-Wettkampf "Boden m. P1-P9":**
```
Stufe:         6.0 Punkte  (= A)
Abzug Ausf.:   2.0 Punkte  (= B)
─────────────────────────────────
Formel:        (10 + A) - B
Endwert:       (10 + 6) - 2 = 14.0 ✅ (automatisch berechnet)
```

---

## Concept & Motivation

### Warum Jury Results?

**Problem der alten Implementierung:**
- Nur **ein** Wert pro Disziplin gespeichert (`tfx_wertungen_details.rel_leistung`)
- Keine Transparenz über **wie** der Score berechnet wurde
- Keine Einzelfeld-Informationen für Jury-Mitglieder
- Schwierig zu debuggen bei falschen Berechnungen

**Lösung mit Jury Results:**
- **Mehrere Felder** pro Disziplin möglich (z.B. Stufe, Abzug, Bonus, Endwert)
- **Nachvollziehbar**: Jedes Feld wird einzeln gespeichert
- **Flexibel**: Unterschiedliche Felder für unterschiedliche Disziplinen
- **Transparent**: UI zeigt die Formel und Berechnung
- **Kompatibel**: `tfx_wertungen_details.rel_leistung` wird weiterhin aktualisiert für Legacy-Code

### Wann wird Jury Results verwendet?

**Aktiviert durch**: `Configuration > Score Capture > useJuryResults = true` (Standard)

**Typische Disziplinen:**
- P-Wettkämpfe (P1-P9): Stufe + Abzug → Endwert
- Kür-Programme: D-Note + E-Note → Endwert
- Turn10 Programme: Verschiedene Komponenten

**WICHTIG**: Einstellung darf **NICHT** während eines aktiven Wettkampfes geändert werden!

---

## Database Architecture

### Table Overview

```
┌─────────────────────────┐
│   tfx_disziplinen       │  Discipline Definition
│  ─────────────────────  │
│  int_disziplinenid (PK) │  ID: 111 = "Boden m. P1-P9"
│  var_name               │  Name: "Boden m. P1-P9"
│  var_formel             │  Formula (direct): "(10 + A) - B" oder NULL
│  int_formelid (FK)      │  Formula Reference: 4 = "P-Wettkampf"
│  int_sportid            │  Sport: 11 = "P-Stufen"
│  ...                    │
└───────┬─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────────────────────┐
│ tfx_disziplinen_felder          │  Field Definitions per Discipline
│ ─────────────────────────────── │
│ int_disziplinen_felderid (PK)   │  ID: 220, 221, 222
│ int_disziplinenid (FK)          │  → 111 (Boden)
│ var_name                        │  "Stufe", "AbzugAusf.", "Endwert"
│ int_sortierung                  │  Sort Order: 1, 2, 3
│ bol_endwert                     │  Is Final Score: false, false, TRUE
│ bol_ausgangswert                │  Is Starting Score: false
│ int_gruppe                      │  Group: 1
│ bol_enabled                     │  Enabled: true
└───────┬─────────────────────────┘
        │
        │ 1:N
        ▼
┌──────────────────────────────────┐
│ tfx_jury_results                 │  Actual Performance Values
│ ────────────────────────────────│
│ int_juryresultsid (PK)           │  ID: 1, 2, 3
│ int_wertungenid (FK)             │  → tfx_wertungen.int_wertungenid
│ int_disziplinen_felderid (FK)    │  → 220 (Stufe)
│ rel_leistung                     │  Value: 6.0, 2.0, 14.0
│ int_versuch                      │  Attempt: 1
│ int_kp                           │  Control Point: 0
└──────────────────────────────────┘

┌─────────────────────────┐
│   tfx_formeln           │  Formula Definitions (Lookup Table)
│  ─────────────────────  │
│  int_formelid (PK)      │  ID: 4
│  var_name               │  Name: "P-Wettkampf"
│  var_formel             │  Formula: "(10 + A) - B"
│  int_typ                │  Type: (unused)
└─────────────────────────┘

┌─────────────────────────────┐
│ tfx_wertungen               │  Base Score Record
│ ─────────────────────────── │
│ int_wertungenid (PK)        │  ID: 116 (Luis Bader)
│ int_teilnehmerid (FK)       │  → Participant
│ int_wettkaempfeid (FK)      │  → Competition
│ var_riege                   │  Squad: "zz"
└─────────┬───────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────────────┐
│ tfx_wertungen_details       │  Score per Discipline (Legacy Compatible)
│ ─────────────────────────── │
│ int_wertungen_detailsid(PK) │
│ int_wertungenid (FK)        │  → 116
│ int_disziplinenid (FK)      │  → 111 (Boden)
│ rel_leistung                │  Final Score: 14.0 (auto-updated!)
│ int_versuch                 │  Attempt: 1
└─────────────────────────────┘
```

### Key Relationships

1. **Discipline → Fields**: Eine Disziplin hat mehrere Felder (1:N)
   - Beispiel: "Boden m. P1-P9" hat "Stufe", "AbzugAusf.", "Endwert"

2. **Field → Jury Results**: Ein Feld hat viele Wertungen (1:N)
   - Beispiel: Feld "Stufe" (220) hat Werte für alle Turner

3. **Wertung → Jury Results**: Eine Wertung hat mehrere Feldwerte (1:N)
   - Beispiel: Luis Bader (wertungenId 116) hat 3 Feldwerte

4. **Discipline → Formula**: Formel wird über `int_formelid` referenziert ODER direkt in `var_formel` gespeichert
   - Priorität: `tfx_formeln.var_formel` (via `int_formelid`) > `tfx_disziplinen.var_formel`

### Field Types

Jedes Feld hat Flags die seine Funktion definieren:

| Flag | Bedeutung | Beispiel |
|------|-----------|----------|
| `bol_endwert = true` | **Final Score Field** - wird berechnet | "Endwert" |
| `bol_ausgangswert = true` | **Starting Score** - Basis für Berechnung | "D-Note" |
| `int_sortierung` | **Sort Order** - Reihenfolge in UI | 1, 2, 3 |
| `bol_enabled = true` | **Enabled** - aktiv oder inaktiv | true |
| `int_gruppe` | **Group** - Gruppierung in UI | 1 |

---

## Formula System

### Formula Storage

Formeln können an **zwei Stellen** gespeichert werden:

1. **In `tfx_formeln` Tabelle** (bevorzugt):
   ```sql
   SELECT var_formel FROM tfx_formeln WHERE int_formelid = 4;
   -- Result: "(10 + A) - B"
   ```
   - Verknüpft über `tfx_disziplinen.int_formelid = 4`
   - **Vorteil**: Wiederverwendbar, zentral gepflegt

2. **Direkt in `tfx_disziplinen.var_formel`**:
   ```sql
   SELECT var_formel FROM tfx_disziplinen WHERE int_disziplinenid = 111;
   -- Result: "(10 + A) - B" oder NULL
   ```
   - **Vorteil**: Disziplin-spezifische Formel

**Ladestrategie** (Server: `scores.ts`):
```typescript
// 1. Try loading from tfx_formeln via int_formelid (preferred)
const formulaResult = await prisma.$queryRawUnsafe(`
  SELECT 
    d.var_formel as "disciplineFormula",
    f.var_formel as "tableFormula"
  FROM tfx_disziplinen d
  LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
  WHERE d.int_disziplinenid = $1
`, disciplineId);

// 2. Prioritize tfx_formeln over discipline direct field
formula = formulaResult[0].tableFormula || formulaResult[0].disciplineFormula;
```

### Formula Syntax

**Format**: Mathematischer Ausdruck mit Variablen A, B, C, ...

**Beispiele:**

| Disziplin | Formel | Bedeutung |
|-----------|--------|-----------|
| P-Wettkampf | `(10 + A) - B` | 10 + Stufe - Abzug |
| AK | `A - B - C` | Stufe - Abzug1 - Abzug2 |
| LK | `A + B - C` | D-Note + E-Note - Abzug |
| D+E-Neutral | `1*x` | Direkter Wert (kein Jury Result) |

**Variable Mapping**:
- Variablen werden in **alphabetischer Reihenfolge** den **nicht-finalen Feldern** zugeordnet
- Reihenfolge basiert auf `int_sortierung` der Felder

**Beispiel "Boden m. P1-P9":**
```
Felder (sortiert nach int_sortierung):
  1. Stufe (220)        → A
  2. AbzugAusf. (221)   → B
  3. Endwert (222)      → (berechnet, nicht in Formel)

Formel: "(10 + A) - B"
Mapping: A = 6.0, B = 2.0
Berechnung: (10 + 6.0) - 2.0 = 14.0
```

### Starting Value Extraction

**StartValue** ist die Basis-Punktzahl (meist 10) die aus der Formel extrahiert wird:

```typescript
// Regex extracts first number (with optional parenthesis)
const startValueMatch = formula.match(/^[(\s]*(\d+\.?\d*)/);
// "(10 + A) - B" → matches "10"
// "A - B" → no match, use default 10.0

const startValue = startValueMatch ? parseFloat(startValueMatch[1]) : 10.0;
```

**Verwendung in UI**:
- Anzeige in blauem Info-Box: "Ausgehend von 10.0 Punkten"
- Hilft dem User die Formel zu verstehen

---

## Automatic Calculation

### When is Endwert Calculated?

**Trigger**: Server erkennt automatisch wenn:
1. ✅ Disziplin hat ein Feld mit `bol_endwert = true` (Final Score Field)
2. ✅ Es gibt Jury Results für nicht-finale Felder (A, B, C, ...)
3. ✅ **KEIN** Jury Result für das Final Score Field existiert

**Beispiel**:
```
Jury Results in DB:
  - Stufe (220): 6.0 ✓
  - AbzugAusf. (221): 2.0 ✓
  - Endwert (222): ✗ FEHLT!

→ Server berechnet automatisch: (10 + 6) - 2 = 14.0
→ Speichert in tfx_jury_results für Feld 222
→ Aktualisiert tfx_wertungen_details.rel_leistung = 14.0
```

### Calculation Logic

**Server**: `newWebBased/server/src/routes/scores.ts` (lines ~220-280)

```typescript
// 1. Detect missing final score
const hasFinalScore = juryResults.some(jr => jr.isFinalScore);
if (!hasFinalScore && formula && endwertFieldId) {
  needsEndwertCalculation = true;
}

// 2. Build value map from non-final jury results
const valueMap: { [key: string]: number } = {};
const letters = formula.match(/[A-Z]/g) || [];

letters.forEach((letter, index) => {
  if (nonFinalScores[index]) {
    valueMap[letter] = parseFloat(nonFinalScores[index].performance);
  }
});
// Result: { A: 6.0, B: 2.0 }

// 3. Replace variables in formula
let evalFormula = formula; // "(10 + A) - B"
Object.keys(valueMap).forEach(letter => {
  evalFormula = evalFormula.replace(new RegExp(letter, 'g'), 
    valueMap[letter].toString());
});
// Result: "(10 + 6.0) - 2.0"

// 4. Evaluate using JavaScript Function constructor
const calculatedScore = new Function(`return ${evalFormula}`)();
// Result: 14.0

// 5. Insert into tfx_jury_results
await prisma.$executeRawUnsafe(`
  INSERT INTO tfx_jury_results 
    (int_wertungenid, int_disziplinen_felderid, rel_leistung, int_versuch, int_kp)
  VALUES ($1, $2, $3, $4, $5)
`, wertungenId, endwertFieldId, calculatedScore, 1, 0);

// 6. Update legacy table for compatibility
await prisma.$executeRawUnsafe(`
  UPDATE tfx_wertungen_details 
  SET rel_leistung = $1
  WHERE int_wertungenid = $2 AND int_disziplinenid = $3
`, calculatedScore, wertungenId, disciplineId);
```

### Safety & Validation

**Fehlerbehandlung**:
```typescript
try {
  const calculatedScore = new Function(`return ${evalFormula}`)();
  
  // Validation
  if (isNaN(calculatedScore) || !isFinite(calculatedScore)) {
    throw new Error('Invalid calculation result');
  }
  
  console.log('✅ Calculated final score:', calculatedScore);
} catch (error) {
  console.error('❌ Error calculating final score:', error);
  // Falls back to manual entry or existing value
}
```

**Einschränkungen**:
- ⚠️ Nur einfache mathematische Operationen (+, -, *, /, ())
- ⚠️ Keine komplexen Funktionen (Math.max, if-else, etc.)
- ⚠️ Variablen A-Z müssen in Formel vorhanden sein

---

## Data Flow

### Score Capture → Database

```
┌─────────────────────┐
│  Score Capture UI   │
│  (Client)           │
└──────────┬──────────┘
           │ POST /api/scores/capture
           │ {
           │   wertungenId: 116,
           │   fieldValues: [
           │     { fieldId: 220, value: 6.0 },
           │     { fieldId: 221, value: 2.0 }
           │   ]
           │ }
           ▼
┌─────────────────────────┐
│  Server: scores.ts      │
│  (Backend)              │
├─────────────────────────┤
│ 1. Validate fields      │
│ 2. Insert into          │
│    tfx_jury_results     │
│ 3. Check for missing    │
│    final score          │
│ 4. ✨ AUTO-CALCULATE ✨ │
│ 5. Insert Endwert       │
│ 6. Update               │
│    tfx_wertungen_details│
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Database               │
├─────────────────────────┤
│ tfx_jury_results:       │
│   Row 1: Field 220 = 6  │
│   Row 2: Field 221 = 2  │
│   Row 3: Field 222 = 14 │← Auto-inserted!
│                         │
│ tfx_wertungen_details:  │
│   rel_leistung = 14     │← Auto-updated!
└─────────────────────────┘
```

### Database → Results Display

```
┌─────────────────────────┐
│  Database               │
└──────────┬──────────────┘
           │ GET /api/scores?eventId=1&squadName=zz
           ▼
┌─────────────────────────────────────┐
│  Server: scores.ts                  │
├─────────────────────────────────────┤
│ 1. Load tfx_wertungen + details     │
│ 2. For each score:                  │
│    a. Load jury results from        │
│       tfx_jury_results              │
│    b. Load formula from             │
│       tfx_formeln or                │
│       tfx_disziplinen               │
│    c. Extract startValue            │
│ 3. Map to camelCase                 │
└──────────┬──────────────────────────┘
           │ Response:
           │ {
           │   formula: "(10 + A) - B",
           │   startValue: 10,
           │   score: 14,
           │   juryResults: [
           │     { fieldName: "Stufe", performance: 6 },
           │     { fieldName: "AbzugAusf.", performance: 2 },
           │     { fieldName: "Endwert", performance: 14, isFinalScore: true }
           │   ]
           │ }
           ▼
┌─────────────────────────┐
│  Results Page UI        │
│  (Client)               │
├─────────────────────────┤
│ JuryResultsDisplay:     │
│                         │
│ 📊 6.0 (A) - 2.0 (B)    │
│ = 14.00                 │
│                         │
│ Formel: (10 + A) - B    │
│ Ausgehend von 10 Punkten│
└─────────────────────────┘
```

---

## API Integration

### GET /api/scores

**Request**:
```http
GET /api/scores?eventId=1&squadName=zz&limit=200
```

**Response** (relevant fields):
```json
{
  "results": [
    {
      "id": 116,
      "participantId": 100,
      "disciplineId": 111,
      "score": 14.0,
      "formula": "(10 + A) - B",
      "startValue": 10,
      "juryResults": [
        {
          "id": 1,
          "disciplineFieldId": 220,
          "fieldName": "Stufe",
          "performance": 6.0,
          "isFinalScore": false,
          "isStartingScore": false,
          "sortOrder": 1
        },
        {
          "id": 2,
          "disciplineFieldId": 221,
          "fieldName": "AbzugAusf.",
          "performance": 2.0,
          "isFinalScore": false,
          "isStartingScore": false,
          "sortOrder": 2
        },
        {
          "id": 3,
          "disciplineFieldId": 222,
          "fieldName": "Endwert",
          "performance": 14.0,
          "isFinalScore": true,
          "isStartingScore": false,
          "sortOrder": 3
        }
      ]
    }
  ]
}
```

**Field Mapping** (Database → API):
| Database Field | API Field | Type |
|----------------|-----------|------|
| `d.var_formel` / `f.var_formel` | `formula` | string |
| (extracted from formula) | `startValue` | number |
| `jr.rel_leistung` | `juryResults[].performance` | number |
| `df.var_name` | `juryResults[].fieldName` | string |
| `df.bol_endwert` | `juryResults[].isFinalScore` | boolean |
| `df.int_sortierung` | `juryResults[].sortOrder` | number |

### POST /api/scores/capture

**Request**:
```json
{
  "wertungenId": 116,
  "fieldValues": [
    { "fieldId": 220, "value": 6.0 },
    { "fieldId": 221, "value": 2.0 }
  ]
}
```

**Logic**:
1. Validate all fieldIds exist in `tfx_disziplinen_felder`
2. Insert/Update `tfx_jury_results` for each fieldId
3. Check if final score field exists but has no value
4. If yes: Auto-calculate using formula
5. Update `tfx_wertungen_details.rel_leistung` with final score

**Response**:
```json
{
  "success": true,
  "calculatedScore": 14.0,
  "message": "Score saved and final score calculated"
}
```

---

## UI Components

### 1. JuryResultsDisplay Component

**Location**: `client/src/pages/Results/components/JuryResultsDisplay.tsx`

**Purpose**: Zeigt Jury Results mit Formel-Berechnung

**Features**:
- 📊 Anzeige aller nicht-finalen Felder mit Werten
- 🔢 Formel-Darstellung mit dynamischen Symbolen (A, B, C)
- ✅ Finaler Score hervorgehoben
- 📘 Blau-Box mit StartValue Hinweis
- 🎯 Kompakt 2-zeilig für Table View

**Example Output**:
```
6.0 (A) - 2.0 (B) = 14.00
Formel: (10 + A) - B

[ℹ️ Ausgehend von 10.0 Punkten]
```

**Props Interface**:
```typescript
interface JuryResultsDisplayProps {
  juryResults: JuryResult[];     // All field values
  finalScore: number;            // Total score
  formula?: string;              // Formula like "(10 + A) - B"
  startValue?: number;           // Starting value (e.g., 10)
  isCompact?: boolean;           // Compact mode for tables
}
```

**Dynamic Symbol Extraction**:
```typescript
const getFormulaSymbol = (index: number): string => {
  if (!formula) return String.fromCharCode(65 + index); // A, B, C
  
  // Extract letters from formula in order
  const letterMatches = formula.match(/[A-Z]/g);
  return letterMatches?.[index] || String.fromCharCode(65 + index);
};
```

### 2. Results Page Integration

**Location**: `client/src/pages/Results.tsx`

**Conditional Rendering**:
```tsx
{score.juryResults && score.juryResults.length > 0 ? (
  <JuryResultsDisplay
    juryResults={score.juryResults}
    finalScore={score.score}
    formula={score.formula}
    startValue={score.startValue}
    isCompact={true}
  />
) : (
  <span className="text-lg font-semibold">
    {score.score.toFixed(2)}
  </span>
)}
```

### 3. Score Capture Page

**Location**: `client/src/pages/ScoreCapture.tsx`

**Features**:
- Multi-field input für jedes definierte Feld
- Automatische Feld-Liste basierend auf `tfx_disziplinen_felder`
- Real-time Validierung
- Automatische Berechnung beim Speichern

---

## Configuration

### Central Setting

**Location**: Configuration Page → Score Capture Section

**Setting**:
```typescript
{
  key: 'useJuryResults',
  label: 'Jury-Results verwenden',
  description: 'Feldspezifische Jury-Results in Wertungserfassung, Ergebnisanzeige, Live-Results und PDF-Export verwenden',
  type: 'boolean',
  value: true  // DEFAULT: ENABLED
}
```

**⚠️ Warning Box**:
```
WICHTIG: Datenbankstruktur

Diese Einstellung darf NICHT während eines aktiven Wettkampfes geändert werden!

• Jury-Results verwenden unterschiedliche Datenbanktabellen
• Änderungen während laufendem Wettkampf führen zu Dateninkonsistenz
• Standard: Aktiviert (empfohlen)
```

### Storage

Settings werden gespeichert in:
- **Client**: `localStorage` → `appSettings.scoreCapture.useJuryResults`
- **Server**: Nutzt nur Client-Config (keine Server-side Einstellung nötig)

### Migration Path

**Von altem System (nur tfx_wertungen_details) zu Jury Results:**

1. ✅ `useJuryResults = true` setzen
2. ✅ Felder in `tfx_disziplinen_felder` definieren
3. ✅ Formel in `tfx_formeln` oder `tfx_disziplinen.var_formel` hinterlegen
4. ✅ Beim nächsten Score-Eintrag: Automatisch Jury Results erstellt
5. ✅ `tfx_wertungen_details.rel_leistung` wird parallel aktualisiert (Kompatibilität!)

**Zurück zu altem System:**
⚠️ **NUR zwischen Wettkämpfen!**
1. `useJuryResults = false` setzen
2. System verwendet wieder `tfx_wertungen_details.rel_leistung`
3. Jury Results bleiben in DB (werden nicht gelöscht)

---

## Troubleshooting

### Problem: "Formula not loading"

**Symptom**: `formula: null` in API response

**Checks**:
1. ✅ Hat Disziplin `int_formelid` gesetzt?
   ```sql
   SELECT int_formelid FROM tfx_disziplinen WHERE int_disziplinenid = 111;
   ```

2. ✅ Existiert Formel in `tfx_formeln`?
   ```sql
   SELECT var_formel FROM tfx_formeln WHERE int_formelid = 4;
   ```

3. ✅ Oder ist Formel direkt in Disziplin?
   ```sql
   SELECT var_formel FROM tfx_disziplinen WHERE int_disziplinenid = 111;
   ```

4. ✅ Server-Logs prüfen:
   ```bash
   pm2 logs turnfix-server | grep "Formula query"
   ```

**Solution**: Siehe [Formula System](#formula-system) für Details zur Formel-Speicherung

---

### Problem: "Endwert not calculated automatically"

**Symptom**: Nur Stufe + Abzug gespeichert, kein Endwert

**Checks**:
1. ✅ Existiert Feld mit `bol_endwert = true`?
   ```sql
   SELECT * FROM tfx_disziplinen_felder 
   WHERE int_disziplinenid = 111 AND bol_endwert = true;
   ```

2. ✅ Ist Formel geladen? (siehe oben)

3. ✅ Sind alle nicht-finalen Felder befüllt?
   ```sql
   SELECT * FROM tfx_jury_results 
   WHERE int_wertungenid = 116;
   ```

4. ✅ Server-Logs prüfen:
   ```bash
   pm2 logs turnfix-server | grep "Calculating final score"
   ```

**Solution**: 
- Falls Feld fehlt: In `tfx_disziplinen_felder` anlegen mit `bol_endwert = true`
- Falls Formel fehlt: Siehe Formula System
- Falls Felder fehlen: Score Capture nochmal aufrufen

---

### Problem: "DATABASE_URL not found (PM2)"

**Symptom**: 
```
PrismaClientInitializationError:
error: Error validating datasource `db`: 
the URL must start with the protocol `postgresql://`
```

**Cause**: PM2 liest `.env` nicht automatisch

**Solution**: `DATABASE_URL` in `ecosystem.config.js` eintragen:
```javascript
{
  name: 'turnfix-server',
  env: {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbname',
    PORT: 3001,
    DEBUG: 'true'
  }
}
```

---

### Problem: "Formula in response but not displayed in UI"

**Symptom**: API gibt `formula: "(10 + A) - B"` zurück, aber UI zeigt nichts

**Checks**:
1. ✅ Client-State aktualisiert?
   - Hard-Refresh: `Ctrl+Shift+R`
   - Check Network Tab: Formula in response?

2. ✅ Component rendering conditional?
   ```tsx
   {score.formula && (
     <div className="text-xs text-gray-600">
       Formel: {score.formula}
     </div>
   )}
   ```

3. ✅ TypeScript types erweitert?
   ```typescript
   interface Score {
     formula?: string;
     startValue?: number;
     juryResults: JuryResult[];
   }
   ```

---

### Problem: "Wrong final score calculated"

**Symptom**: Endwert = 13.3 statt 14.0

**Possible Causes**:
1. **Alte Daten**: Endwert wurde VOR Auto-Calculation gespeichert
   - **Solution**: Endwert-Eintrag löschen, GET Request → Auto-Recalculation
   
2. **Falsche Formel**: Disziplin verwendet falsche Formel
   - **Check**: `SELECT var_formel FROM tfx_formeln WHERE int_formelid = ...`
   - **Solution**: Formel korrigieren oder richtige Formel zuweisen

3. **Falsche Werte**: Eingabe-Felder haben falsche Werte
   - **Check**: `SELECT * FROM tfx_jury_results WHERE int_wertungenid = 116`
   - **Solution**: Werte korrigieren in Score Capture

4. **Variable Mapping falsch**: Reihenfolge der Felder stimmt nicht
   - **Check**: `SELECT * FROM tfx_disziplinen_felder WHERE int_disziplinenid = 111 ORDER BY int_sortierung`
   - **Solution**: `int_sortierung` korrigieren

---

## Development Notes

### Server Implementation Details

**Key Files**:
- `server/src/routes/scores.ts` - Main GET /api/scores endpoint with auto-calculation
- `server/src/routes/disciplineFields.ts` - Field definitions API
- `server/src/routes/formulas.ts` - Formula lookup API

**Important Functions**:
```typescript
// Formula loading (lines ~180-210)
if (disciplineId) {
  const formulaResult = await prisma.$queryRawUnsafe(`
    SELECT 
      d.var_formel as "disciplineFormula",
      f.var_formel as "tableFormula"
    FROM tfx_disziplinen d
    LEFT JOIN tfx_formeln f ON d.int_formelid = f.int_formelid
    WHERE d.int_disziplinenid = $1
  `, disciplineId);
  
  formula = formulaResult[0].tableFormula || formulaResult[0].disciplineFormula;
}

// Auto-calculation (lines ~220-280)
if (needsEndwertCalculation && formula && endwertFieldId) {
  const valueMap = buildValueMap(juryResults, formula);
  const evalFormula = replaceVariables(formula, valueMap);
  const calculatedScore = evaluate(evalFormula);
  
  await insertJuryResult(wertungenId, endwertFieldId, calculatedScore);
  await updateWertungenDetails(wertungenId, disciplineId, calculatedScore);
}
```

### Client Implementation Details

**Key Files**:
- `client/src/pages/Results/components/JuryResultsDisplay.tsx` - Display component
- `client/src/pages/Results.tsx` - Integration in results table
- `client/src/pages/Configuration.tsx` - Central toggle

**State Management**:
```typescript
// Results page loads scores with jury results
const { data: scores } = useQuery(['/api/scores', filters], {
  queryKey: ['/api/scores', eventId, squadName],
  queryFn: () => fetchScores(eventId, squadName)
});

// Each score has juryResults array
scores.results.forEach(score => {
  if (score.juryResults && score.juryResults.length > 0) {
    // Display with JuryResultsDisplay component
  }
});
```

---

## Future Enhancements

### Planned Features

1. **Live Score Calculation Preview**
   - Show calculated final score in real-time während Score Capture
   - Validation feedback bevor Speichern

2. **PDF Export with Jury Results**
   - Extended result sheets mit allen Feld-Werten
   - Formula display in Urkunden

3. **Complex Formula Support**
   - Support für `Math.max()`, `Math.min()`
   - Conditional logic: `if (A > 10) then X else Y`
   - Bonus/Penalty calculations

4. **Jury Member Assignment**
   - Tracking welcher Juror welches Feld bewertet hat
   - Multi-jury averaging für fair scoring

5. **Historical Tracking**
   - Änderungshistorie für Jury Results
   - Audit trail: Wer hat wann welchen Wert geändert

### Known Limitations

1. **Formula Syntax**: Nur einfache math (+ - * / ())
2. **Variable Names**: Nur A-Z (26 Felder maximum)
3. **No Field Dependencies**: Felder können sich nicht gegenseitig referenzieren
4. **Single Attempt**: Derzeit nur 1 Versuch pro Feld (int_versuch = 1)

---

## Appendix: Example Data

### Example 1: Luis Bader (Boden m. P1-P9)

```sql
-- Discipline
SELECT * FROM tfx_disziplinen WHERE int_disziplinenid = 111;
-- Result: "Boden m. P1-P9", int_formelid = 4

-- Formula
SELECT * FROM tfx_formeln WHERE int_formelid = 4;
-- Result: "P-Wettkampf", "(10 + A) - B"

-- Fields
SELECT * FROM tfx_disziplinen_felder WHERE int_disziplinenid = 111;
-- Results:
--   220: "Stufe", sortierung=1, endwert=false
--   221: "AbzugAusf.", sortierung=2, endwert=false
--   222: "Endwert", sortierung=3, endwert=TRUE

-- Jury Results
SELECT * FROM tfx_jury_results WHERE int_wertungenid = 116;
-- Results:
--   Field 220: 6.0
--   Field 221: 2.0
--   Field 222: 14.0 ← Auto-calculated!

-- Wertungen Details (Legacy)
SELECT * FROM tfx_wertungen_details 
WHERE int_wertungenid = 116 AND int_disziplinenid = 111;
-- Result: rel_leistung = 14.0 ← Auto-updated!
```

### Example 2: API Response Structure

```json
{
  "results": [
    {
      "id": 116,
      "participantId": 100,
      "disciplineId": 111,
      "competitionId": 14,
      "score": 14.0,
      "formula": "(10 + A) - B",
      "startValue": 10,
      "participant": {
        "firstName": "Luis",
        "lastName": "Bader"
      },
      "discipline": {
        "name": "Boden m. P1-P9"
      },
      "juryResults": [
        {
          "id": 1,
          "disciplineFieldId": 220,
          "fieldName": "Stufe",
          "performance": 6.0,
          "isFinalScore": false,
          "sortOrder": 1
        },
        {
          "id": 2,
          "disciplineFieldId": 221,
          "fieldName": "AbzugAusf.",
          "performance": 2.0,
          "isFinalScore": false,
          "sortOrder": 2
        },
        {
          "id": 3,
          "disciplineFieldId": 222,
          "fieldName": "Endwert",
          "performance": 14.0,
          "isFinalScore": true,
          "sortOrder": 3
        }
      ]
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 200,
    "offset": 0,
    "hasMore": false
  }
}
```

---

## Summary

**Jury Results System** ist ein vollständig implementiertes, feldbasiertes Bewertungssystem mit:

✅ **Flexible Feld-Definitionen** pro Disziplin
✅ **Automatische Endwert-Berechnung** mit Formeln
✅ **Transparente Anzeige** in UI mit Formel-Rendering
✅ **Legacy-Kompatibilität** mit tfx_wertungen_details
✅ **Zentrale Konfiguration** mit Warnung vor Änderungen
✅ **Robuste Fehlerbehandlung** und Logging

Das System ist produktionsbereit und wird bereits verwendet. Diese Dokumentation dient als Referenz für weitere Entwicklung und Troubleshooting.

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-28  
**Author**: AI Assistant (GitHub Copilot)  
**Review Status**: ✅ Complete
